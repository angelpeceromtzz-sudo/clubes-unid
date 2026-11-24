import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import {
  camposRegistroTrineo, cotizarCamisaTrineo, disponibilidadAsistenciaActividad,
  errorActividad, estadoRegistroActividad, normalizarCodigoAsistencia,
  validarAportacionesActividad, validarContactoInvitado, validarRespuestasActividad,
} from './actividadesDominio.js';
import { asistenciaPropia, consultarAsistencia } from './actividadesAsistencia.js';
import { completarCartasRegistros, guardarReservaCarta, prepararReservaCarta } from './trineoCartas.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const hashAcceso = (token) => createHash('sha256').update(token).digest('hex');

function tokenInvitado(req) {
  const coincidencia = /^Registro ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization || '');
  return coincidencia?.[1] || null;
}

function registroSeguro(registro) {
  if (!registro) return null;
  const { invitado_token_hash: _secreto, ...seguro } = registro;
  return seguro;
}

export function montarInvitadosTrineo(router, {
  db, hoy, obtenerEdicion, comprobarPublica, edicionPublica, transaccion, auditar, catalogoEdicion, aportesRegistro,
  limitarEscritura, limitarRegistro, limitarReenvio, correoMisiones,
}) {
  function comprobarTrineo(edicion) {
    if (edicion.plantilla !== 'trineo') throw errorActividad('El registro de invitados corresponde al Trineo de los Sueños', 404);
  }

  function exigirAbierta(edicion) {
    comprobarTrineo(edicion); comprobarPublica(edicion);
    if (estadoRegistroActividad(edicion, hoy()) !== 'abierta') throw errorActividad('Las inscripciones no están abiertas', 409);
  }

  async function obtenerInvitado(cliente, req, bloquear = false) {
    const token = tokenInvitado(req);
    if (!token || !UUID.test(req.params.folio)) throw errorActividad('El enlace privado no es válido', 401);
    const registro = (await cliente.query("SELECT * FROM actividades_registros WHERE folio=$1 AND tipo_participante='invitado'" + (bloquear ? ' FOR UPDATE' : ''), [req.params.folio])).rows[0];
    if (!registro) throw errorActividad('El enlace privado no es válido', 401);
    const esperado = Buffer.from(registro.invitado_token_hash || '', 'hex');
    const recibido = Buffer.from(hashAcceso(token), 'hex');
    if (esperado.length !== recibido.length || !timingSafeEqual(esperado, recibido)) throw errorActividad('El enlace privado no es válido', 401);
    return registro;
  }

  async function respuestaRegistro(cliente, edicion, registro) {
    await completarCartasRegistros(cliente, [registro]);
    return {
      registro: { ...registroSeguro(registro), aportaciones: await aportesRegistro(cliente, registro.id_registro) },
      edicion: { ...edicionPublica(edicion, hoy()), catalogo: (await catalogoEdicion(cliente, edicion.id_edicion)).filter((opcion) => opcion.activa) },
      asistencia: await consultarAsistencia(cliente, registro.id_registro),
      disponibilidad_asistencia: disponibilidadAsistenciaActividad(edicion, hoy()),
    };
  }

  async function guardarInscripcion(cliente, req, edicion, anterior = null) {
    exigirAbierta(edicion);
    if (anterior?.estado === 'cancelado') throw errorActividad('La inscripción está cancelada; consulta al encargado', 409);
    const camposPrevios = anterior?.estado === 'confirmado' ? anterior.formulario_snapshot : edicion.campos_registro;
    const campos = camposRegistroTrineo(camposPrevios);
    const respuestas = validarRespuestasActividad(campos, req.body?.respuestas || {});
    const contacto = validarContactoInvitado(req.body);
    for (const campo of campos.filter((item) => item.tipo === 'licenciatura' && respuestas[item.clave])) {
      if (!(await cliente.query('SELECT 1 FROM cat_licenciaturas WHERE id_licenciatura=$1', [respuestas[campo.clave]])).rows.length) throw errorActividad('La licenciatura seleccionada no está disponible');
    }
    const campoCamisa = edicion.campos_registro.find((campo) => campo.clave === 'talla');
    const pedido = cotizarCamisaTrineo({ campo: campoCamisa, solicita: req.body?.solicita_camisa, talla: respuestas.talla, anterior: anterior?.pedido });
    if (req.body?.total_centavos !== undefined && req.body.total_centavos !== pedido.total_centavos) throw errorActividad('El precio de la camisa cambió. Actualiza el formulario y vuelve a intentarlo', 409);

    const previos = anterior ? await aportesRegistro(cliente, anterior.id_registro) : [];
    const regalosAnteriores = new Set(previos.filter((aporte) => aporte.es_regalo_carta).map((aporte) => aporte.id_opcion));
    const seleccion = Array.isArray(req.body?.aportaciones) ? req.body.aportaciones : [];
    const adicionales = seleccion.filter((aporte) => !regalosAnteriores.has(Number(aporte?.id_opcion)));
    const previosAdicionales = previos.filter((aporte) => !aporte.es_regalo_carta);
    const aportes = validarAportacionesActividad(adicionales, await catalogoEdicion(cliente, edicion.id_edicion), edicion.requiere_aportacion, previosAdicionales);
    if (previosAdicionales.some((aporte) => aporte.estado === 'recibida' && !aportes.some((nuevo) => nuevo.id_opcion === aporte.id_opcion))) throw errorActividad('Conserva las aportaciones que ya fueron recibidas');
    const reserva = await prepararReservaCarta(cliente, { edicion, anterior, idCarta: req.body?.id_carta });

    let registro;
    let token;
    if (anterior) {
      registro = (await cliente.query(`UPDATE actividades_registros SET nombre_completo=$1,correo=$2,telefono=$3,respuestas=$4,formulario_snapshot=$5,pedido=$6,
        estado='confirmado',actualizado_en=NOW() WHERE id_registro=$7 RETURNING *`, [contacto.nombre_completo, contacto.correo, contacto.telefono, JSON.stringify(respuestas), JSON.stringify(campos), JSON.stringify(pedido), anterior.id_registro])).rows[0];
    } else {
      const repetido = (await cliente.query("SELECT id_registro FROM actividades_registros WHERE id_edicion=$1 AND correo=$2 AND tipo_participante='invitado'", [edicion.id_edicion, contacto.correo])).rows[0];
      if (repetido) throw errorActividad('Ya existe una inscripción de invitado con ese correo en esta edición', 409);
      token = randomBytes(32).toString('base64url');
      registro = (await cliente.query(`INSERT INTO actividades_registros(id_edicion,nombre_completo,correo,telefono,respuestas,formulario_snapshot,pedido,tipo_participante,folio,invitado_token_hash)
        VALUES($1,$2,$3,$4,$5,$6,$7,'invitado',$8,$9) RETURNING *`, [edicion.id_edicion, contacto.nombre_completo, contacto.correo, contacto.telefono, JSON.stringify(respuestas), JSON.stringify(campos), JSON.stringify(pedido), randomUUID(), hashAcceso(token)])).rows[0];
    }
    await cliente.query("UPDATE actividades_aportaciones p SET estado='cancelada' WHERE id_registro=$1 AND estado='comprometida' AND NOT (id_opcion=ANY($2::int[])) AND NOT EXISTS(SELECT 1 FROM actividades_cartas_reservas v WHERE v.id_aportacion=p.id_aportacion)", [registro.id_registro, aportes.map((aporte) => aporte.id_opcion)]);
    for (const aporte of aportes) await cliente.query(`INSERT INTO actividades_aportaciones(id_registro,id_opcion,nombre,unidad,cantidad,cantidad_minima)
      VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id_registro,id_opcion) DO UPDATE SET nombre=EXCLUDED.nombre,unidad=EXCLUDED.unidad,cantidad=EXCLUDED.cantidad,cantidad_minima=EXCLUDED.cantidad_minima,estado='comprometida'
      WHERE actividades_aportaciones.estado<>'recibida'`, [registro.id_registro, aporte.id_opcion, aporte.nombre, aporte.unidad, aporte.cantidad, aporte.cantidad_minima]);
    registro.aportaciones = await aportesRegistro(cliente, registro.id_registro);
    await guardarReservaCarta(cliente, { registro, reserva, usuario: { id: null }, auditar });
    await auditar(cliente, { id: null }, anterior ? 'registro_editado' : 'registro_confirmado', { id_registro: registro.id_registro, tipo_participante: 'invitado' });
    const resultado = await respuestaRegistro(cliente, edicion, registro);
    return { ...resultado, ...(token ? { token } : {}) };
  }

  async function transaccionInvitado(req, trabajo) {
    const previo = await obtenerInvitado(db, req);
    return transaccion(async (cliente) => {
      const edicion = await obtenerEdicion(cliente, previo.id_edicion, true);
      const registro = await obtenerInvitado(cliente, req, true);
      comprobarTrineo(edicion);
      return trabajo(cliente, edicion, registro);
    });
  }

  async function enviarEnlace(registro, token, edicion) {
    try {
      if (!correoMisiones) throw new Error('Correo no configurado');
      await correoMisiones.enviarEnlace({ correo: registro.correo, folio: registro.folio, token, edicion: edicion.nombre, ruta: 'trineo', titulo: 'Trineo de los Sueños' });
      return true;
    } catch { return false; }
  }

  router.post('/trineo/ediciones/:idEdicion/invitados', limitarRegistro, async (req, _res, next) => {
    exigirAbierta(await obtenerEdicion(db, req.params.idEdicion)); next();
  }, async (req, res) => {
    const resultado = await transaccion(async (cliente) => guardarInscripcion(cliente, req, await obtenerEdicion(cliente, req.params.idEdicion, true)));
    const correo_enviado = await enviarEnlace(resultado.registro, resultado.token, resultado.edicion);
    res.status(201).json({ ...resultado, correo_enviado });
  });

  router.get('/trineo/invitados/:folio', limitarEscritura, async (req, res) => {
    const registro = await obtenerInvitado(db, req);
    const edicion = await obtenerEdicion(db, registro.id_edicion);
    comprobarTrineo(edicion);
    res.json(await respuestaRegistro(db, edicion, registro));
  });

  router.put('/trineo/invitados/:folio', limitarEscritura, async (req, res) => {
    const resultado = await transaccionInvitado(req, (cliente, edicion, registro) => guardarInscripcion(cliente, req, edicion, registro));
    res.json(resultado);
  });

  router.post('/trineo/invitados/:folio/reenviar-enlace', limitarReenvio, async (req, res) => {
    const registro = await obtenerInvitado(db, req);
    const edicion = await obtenerEdicion(db, registro.id_edicion);
    comprobarTrineo(edicion);
    const enviado = await enviarEnlace(registro, tokenInvitado(req), edicion);
    res.status(enviado ? 200 : 503).json(enviado ? { correo_enviado: true } : { error: 'Tu registro está guardado, pero no pudimos enviar el correo. Conserva tu enlace e intenta reenviarlo más tarde.' });
  });

  router.post('/trineo/invitados/:folio/asistencia', limitarEscritura, async (req, res) => {
    const codigo = normalizarCodigoAsistencia(req.body?.codigo);
    if (!['qr', 'codigo'].includes(req.body?.origen)) throw errorActividad('Selecciona una forma de registrar la asistencia');
    res.json(await transaccionInvitado(req, async (cliente, edicion, registro) => {
      if (disponibilidadAsistenciaActividad(edicion, hoy()) !== 'disponible') throw errorActividad('El pase de lista solo está disponible durante las fechas de la edición publicada', 409);
      if (registro.estado !== 'confirmado') throw errorActividad('Necesitas una inscripción confirmada', 403);
      const acceso = (await cliente.query('SELECT codigo FROM actividades_asistencia_accesos WHERE id_edicion=$1', [edicion.id_edicion])).rows[0];
      if (!acceso || !timingSafeEqual(Buffer.from(codigo), Buffer.from(acceso.codigo))) throw errorActividad('El código de asistencia no es correcto');
      const anterior = (await cliente.query('SELECT * FROM actividades_asistencias WHERE id_registro=$1', [registro.id_registro])).rows[0];
      if (anterior?.estado === 'anulada') throw errorActividad('El encargado corrigió tu asistencia. Solicita que revise tu registro.', 409);
      if (anterior) return { asistencia: asistenciaPropia(anterior) };
      const asistencia = (await cliente.query("INSERT INTO actividades_asistencias(id_registro,estado,origen,id_actor) VALUES($1,'presente',$2,NULL) RETURNING *", [registro.id_registro, req.body.origen])).rows[0];
      await auditar(cliente, { id: null }, 'asistencia_registrada', { id_registro: registro.id_registro, origen: asistencia.origen, tipo_participante: 'invitado' });
      return { asistencia: asistenciaPropia(asistencia) };
    }));
  });
}
