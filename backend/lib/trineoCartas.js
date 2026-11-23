import { errorActividad } from './actividadesDominio.js';
import { normalizarCartaTrineo, validarSeleccionCartaTrineo } from './trineoDominio.js';

const SELECT_RESERVA = `SELECT v.*, u.nombre_completo AS recibida_por_nombre
  FROM actividades_cartas_reservas v LEFT JOIN usuarios u ON u.id_usuario=v.recibida_por`;

function reservaPublica(fila) {
  const edad = fila.carta_snapshot.edad ?? (fila.carta_snapshot.edad_meses == null ? null : Math.floor(Number(fila.carta_snapshot.edad_meses) / 12));
  return {
    id_reserva: fila.id_reserva, id_carta: fila.id_carta, id_aportacion: fila.id_aportacion,
    ...fila.carta_snapshot, edad, estado: fila.cancelada_en ? 'cancelada' : fila.recibida ? 'entregada' : 'reservada',
    reservada_en: fila.reservada_en, cancelada_en: fila.cancelada_en,
    recibida_en: fila.cancelada_en ? null : fila.recibida_en,
    recibida_por_nombre: fila.cancelada_en ? null : fila.recibida_por_nombre,
  };
}

export async function completarCartasRegistros(db, registros) {
  if (!registros.length) return;
  const { rows } = await db.query(SELECT_RESERVA + ' WHERE v.id_registro=ANY($1::int[]) ORDER BY v.id_reserva DESC', [registros.map((registro) => registro.id_registro)]);
  for (const registro of registros) {
    const reservas = rows.filter((fila) => fila.id_registro === registro.id_registro);
    const actual = reservas.find((fila) => !fila.cancelada_en);
    registro.carta = actual ? reservaPublica(actual) : null;
    registro.historial_cartas = reservas.filter((fila) => fila.cancelada_en).map(reservaPublica);
  }
}

export async function prepararReservaCarta(db, { edicion, anterior, idCarta }) {
  const actual = anterior ? (await db.query(SELECT_RESERVA + ' WHERE v.id_registro=$1 AND v.cancelada_en IS NULL FOR UPDATE OF v', [anterior.id_registro])).rows[0] : null;
  const seleccion = validarSeleccionCartaTrineo({
    plantilla: edicion.plantilla, idCarta, actual, anteriorConfirmado: anterior?.estado === 'confirmado',
    cartaObligatoria: edicion.carta_obligatoria !== false,
  });
  if (!seleccion) return { actual, carta: null };
  const carta = (await db.query('SELECT * FROM actividades_cartas WHERE id_carta=$1 AND id_edicion=$2 FOR UPDATE', [seleccion, edicion.id_edicion])).rows[0];
  if (!carta || !carta.activa) throw errorActividad('Esta carta ya no está disponible; actualiza la búsqueda y elige otra', 409);
  const ocupada = (await db.query('SELECT id_registro FROM actividades_cartas_reservas WHERE id_carta=$1 AND cancelada_en IS NULL', [seleccion])).rows[0];
  if (ocupada && ocupada.id_registro !== anterior?.id_registro) throw errorActividad('Otro alumno ya reservó esta carta; actualiza la búsqueda y elige otra', 409);
  return { actual, carta };
}

async function cancelarRegaloAnterior(db, reserva) {
  if (reserva.id_aportacion) await db.query("UPDATE actividades_aportaciones SET estado='cancelada' WHERE id_aportacion=$1 AND estado='comprometida'", [reserva.id_aportacion]);
}

export async function guardarReservaCarta(db, { registro, reserva, usuario, auditar }) {
  const { actual, carta } = reserva;
  if (!carta || actual?.id_carta === carta.id_carta) return;
  if (actual) {
    await db.query('UPDATE actividades_cartas_reservas SET cancelada_en=NOW() WHERE id_reserva=$1', [actual.id_reserva]);
    await cancelarRegaloAnterior(db, actual);
    await auditar(db, usuario, 'carta_liberada', { id_edicion: registro.id_edicion, id_registro: registro.id_registro, id_carta: actual.id_carta });
  }
  await db.query(`INSERT INTO actividades_cartas_reservas(id_carta,id_registro,carta_snapshot)
    VALUES($1,$2,$3)`, [carta.id_carta, registro.id_registro, JSON.stringify({ nombre: carta.nombre, edad: carta.edad, deseo: carta.deseo })]);
  await auditar(db, usuario, 'carta_reservada', { id_edicion: registro.id_edicion, id_registro: registro.id_registro, id_carta: carta.id_carta });
}

export async function liberarCartaPendiente(db, registro, usuario, auditar) {
  const { rows } = await db.query(`UPDATE actividades_cartas_reservas SET cancelada_en=NOW()
    WHERE id_registro=$1 AND cancelada_en IS NULL AND NOT recibida RETURNING id_carta,id_aportacion`, [registro.id_registro]);
  for (const carta of rows) {
    await cancelarRegaloAnterior(db, carta);
    await auditar(db, usuario, 'carta_liberada', { id_edicion: registro.id_edicion, id_registro: registro.id_registro, id_carta: carta.id_carta });
  }
}

// Se usa también desde la recepción anterior de aportaciones vinculadas a regalos históricos.
export async function recibirRegaloCarta(cliente, { idReserva, usuario, obtenerEdicion, comprobarGestion, auditar }) {
  const referencia = (await cliente.query(`SELECT c.id_edicion FROM actividades_cartas_reservas v
    JOIN actividades_cartas c USING(id_carta) WHERE v.id_reserva=$1`, [idReserva])).rows[0];
  if (!referencia) throw errorActividad('Reserva de carta no encontrada', 404);
  const edicion = await obtenerEdicion(cliente, referencia.id_edicion, true);
  comprobarGestion(usuario, edicion);
  if (edicion.plantilla !== 'trineo') throw errorActividad('Las cartas corresponden únicamente a Trineo', 404);
  if (edicion.estado === 'archivada' || edicion.estado_actividad === 'archivada') throw errorActividad('La edición está archivada', 409);
  const reserva = (await cliente.query(`SELECT v.*,r.estado AS estado_registro
    FROM actividades_cartas_reservas v JOIN actividades_registros r USING(id_registro)
    WHERE v.id_reserva=$1 FOR UPDATE OF v,r`, [idReserva])).rows[0];
  if (reserva.cancelada_en) throw errorActividad('Esta reserva ya fue liberada', 409);
  if (!reserva.recibida) {
    if (reserva.estado_registro !== 'confirmado') throw errorActividad('La inscripción ya no está activa', 409);
    const recibida = (await cliente.query('UPDATE actividades_cartas_reservas SET recibida=TRUE,recibida_en=NOW(),recibida_por=$1 WHERE id_reserva=$2 RETURNING *', [usuario.id, idReserva])).rows[0];
    if (recibida.id_aportacion) await cliente.query(`UPDATE actividades_aportaciones SET estado='recibida',
      recibida_en=COALESCE(recibida_en,$1),recibida_por=COALESCE(recibida_por,$2) WHERE id_aportacion=$3`, [recibida.recibida_en, usuario.id, recibida.id_aportacion]);
    await auditar(cliente, usuario, 'regalo_carta_recibido', { id_edicion: edicion.id_edicion, id_registro: reserva.id_registro, id_reserva: reserva.id_reserva, id_carta: reserva.id_carta });
  }
  return reservaPublica((await cliente.query(SELECT_RESERVA + ' WHERE v.id_reserva=$1', [idReserva])).rows[0]);
}

export function montarCartasTrineo(router, { db, autenticar, obtenerEdicion, comprobarPublica, comprobarGestion, transaccion, auditar }) {
  function comprobarTrineo(edicion) {
    if (edicion.plantilla !== 'trineo') throw errorActividad('Las cartas corresponden al Trineo de los Sueños', 404);
  }
  function comprobarEdicionEditable(edicion) {
    if (edicion.estado === 'archivada' || edicion.estado_actividad === 'archivada') throw errorActividad('La edición está archivada', 409);
  }

  router.get('/ediciones/:idEdicion/cartas', autenticar, async (req, res) => {
    const edicion = await obtenerEdicion(db, req.params.idEdicion);
    comprobarPublica(edicion); comprobarTrineo(edicion);
    // Solo se exponen cartas disponibles, nunca la identidad de otros alumnos.
    const { rows } = await db.query(`SELECT c.id_carta,c.nombre,c.edad,c.deseo FROM actividades_cartas c
      WHERE c.id_edicion=$1 AND c.activa AND NOT EXISTS (
        SELECT 1 FROM actividades_cartas_reservas v WHERE v.id_carta=c.id_carta AND v.cancelada_en IS NULL)
      ORDER BY c.nombre,c.id_carta`, [edicion.id_edicion]);
    res.json({ cartas: rows });
  });

  router.get('/gestion/ediciones/:idEdicion/cartas', async (req, res) => {
    const edicion = await obtenerEdicion(db, req.params.idEdicion);
    comprobarGestion(req.user, edicion); comprobarTrineo(edicion);
    const { rows } = await db.query(`SELECT c.*,v.id_reserva,v.id_registro,r.nombre_completo AS alumno_nombre,r.matricula,
      v.recibida_en,u.nombre_completo AS recibida_por_nombre,r.estado AS estado_registro,
      CASE WHEN v.recibida THEN 'entregada' WHEN v.id_reserva IS NOT NULL THEN 'reservada'
        WHEN c.activa THEN 'disponible' ELSE 'retirada' END AS estado
      FROM actividades_cartas c LEFT JOIN actividades_cartas_reservas v ON v.id_carta=c.id_carta AND v.cancelada_en IS NULL
      LEFT JOIN actividades_registros r ON r.id_registro=v.id_registro
      LEFT JOIN usuarios u ON u.id_usuario=v.recibida_por
      WHERE c.id_edicion=$1 ORDER BY c.nombre,c.id_carta`, [edicion.id_edicion]);
    res.json({ cartas: rows, habilitadas: true, carta_obligatoria: edicion.carta_obligatoria !== false, editable: edicion.estado !== 'archivada' && edicion.estado_actividad !== 'archivada' });
  });

  router.post('/gestion/ediciones/:idEdicion/cartas', async (req, res) => {
    res.status(201).json(await transaccion(async (cliente) => {
      const edicion = await obtenerEdicion(cliente, req.params.idEdicion, true);
      comprobarGestion(req.user, edicion); comprobarTrineo(edicion); comprobarEdicionEditable(edicion);
      const carta = normalizarCartaTrineo(req.body);
      await cliente.query('UPDATE actividades_ediciones SET cartas_habilitadas=TRUE,actualizado_en=NOW() WHERE id_edicion=$1', [edicion.id_edicion]);
      const { rows } = await cliente.query(`INSERT INTO actividades_cartas(id_edicion,nombre,edad,deseo,activa)
        VALUES($1,$2,$3,$4,$5) RETURNING *`, [edicion.id_edicion, carta.nombre, carta.edad, carta.deseo, carta.activa]);
      await auditar(cliente, req.user, 'carta_creada', { id_edicion: edicion.id_edicion, id_carta: rows[0].id_carta });
      return rows[0];
    }));
  });

  router.post('/gestion/cartas-reservas/:idReserva/recibir', async (req, res) => {
    res.json(await transaccion((cliente) => recibirRegaloCarta(cliente, {
      idReserva: Number(req.params.idReserva), usuario: req.user, obtenerEdicion, comprobarGestion, auditar,
    })));
  });

  router.put('/gestion/ediciones/:idEdicion/cartas/:idCarta', async (req, res) => {
    res.json(await transaccion(async (cliente) => {
      const edicion = await obtenerEdicion(cliente, req.params.idEdicion, true);
      comprobarGestion(req.user, edicion); comprobarTrineo(edicion); comprobarEdicionEditable(edicion);
      const anterior = (await cliente.query('SELECT * FROM actividades_cartas WHERE id_carta=$1 AND id_edicion=$2 FOR UPDATE', [req.params.idCarta, edicion.id_edicion])).rows[0];
      if (!anterior) throw errorActividad('Carta no encontrada', 404);
      if ((await cliente.query('SELECT 1 FROM actividades_cartas_reservas WHERE id_carta=$1 AND cancelada_en IS NULL', [anterior.id_carta])).rows.length) throw errorActividad('Una carta reservada o con regalo recibido conserva sus datos', 409);
      const carta = normalizarCartaTrineo({ ...anterior, ...req.body });
      const { rows } = await cliente.query('UPDATE actividades_cartas SET nombre=$1,edad=$2,deseo=$3,activa=$4,actualizado_en=NOW() WHERE id_carta=$5 RETURNING *', [carta.nombre, carta.edad, carta.deseo, carta.activa, anterior.id_carta]);
      await auditar(cliente, req.user, 'carta_actualizada', { id_edicion: edicion.id_edicion, id_carta: anterior.id_carta });
      return rows[0];
    }));
  });
}
