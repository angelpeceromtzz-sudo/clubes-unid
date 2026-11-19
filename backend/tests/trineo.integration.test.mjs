import { before, after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import express from 'express';
import pg from 'pg';
import { crearRouterActividades } from '../lib/actividadesRouter.js';

const connectionString = process.env.ACTIVIDADES_TEST_DATABASE_URL;
describe('Trineo: cartas, reserva exclusiva y recepción del regalo', { skip: !connectionString }, () => {
  const esquema = 'trineo_test_' + randomBytes(6).toString('hex');
  const bootstrap = new pg.Client({ connectionString });
  let db, servidor, base, trineo, misiones;
  let fecha = '2026-11-18';

  async function solicitar(usuario, method, ruta, datos) {
    const headers = usuario ? { 'x-qa-user': String(usuario) } : {};
    if (datos !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(base + ruta, { method, headers, ...(datos === undefined ? {} : { body: JSON.stringify(datos) }) });
    const resultado = await res.json();
    assert.match(res.headers.get('cache-control'), /private, no-store/);
    return { status: res.status, resultado };
  }
  async function enviar(usuario, method, ruta, datos, esperado = 200) {
    const respuesta = await solicitar(usuario, method, ruta, datos);
    assert.equal(respuesta.status, esperado, method + ' ' + ruta + ': ' + JSON.stringify(respuesta.resultado));
    return respuesta.resultado;
  }
  async function edicion(idActividad = trineo, obligatoria = false) {
    const id = (await db.query(`INSERT INTO actividades_ediciones(id_actividad,nombre,estado,lugar,fecha_inicio,
      inscripcion_desde,inscripcion_hasta,requiere_registro,requiere_aportacion)
      VALUES($1,'Edición cartas QA','publicada','Campus QA','2026-12-05','2026-11-01','2026-12-04',TRUE,$2) RETURNING id_edicion`, [idActividad, obligatoria])).rows[0].id_edicion;
    const opcion = (await db.query("INSERT INTO actividades_aportes_catalogo(id_edicion,nombre,unidad,cantidad_minima) VALUES($1,'Comida QA','paquetes',1) RETURNING id_opcion", [id])).rows[0].id_opcion;
    return { id, opcion, ruta: '/ediciones/' + id + '/registro', gestion: '/gestion/ediciones/' + id + '/cartas' };
  }
  const datosCarta = (nombre = 'Niño QA') => ({ nombre, edad: 7, deseo: 'Un trompo de madera' });
  const registro = (e, idCarta) => ({ respuestas: {}, aportaciones: [{ id_opcion: e.opcion, cantidad: 1 }], ...(idCarta === undefined ? {} : { id_carta: idCarta }) });
  const nuevaCarta = (e, nombre) => enviar(2, 'POST', e.gestion, datosCarta(nombre), 201);
  const recibirCarta = (carta) => '/gestion/cartas-reservas/' + carta.id_reserva + '/recibir';
  async function inscripcionAnterior(e) {
    return (await db.query("INSERT INTO actividades_registros(id_edicion,id_usuario,nombre_completo,matricula) VALUES($1,1,'Alumno Uno QA','00000001') RETURNING *", [e.id])).rows[0];
  }

  before(async () => {
    await bootstrap.connect();
    await bootstrap.query('CREATE SCHEMA ' + esquema);
    await bootstrap.query('SET search_path TO ' + esquema);
    await bootstrap.query(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
    await bootstrap.query(`INSERT INTO usuarios(id_usuario,nombre_completo,correo_institucional,institutional_id,id_rol)
      VALUES(1,'Alumno Uno QA','uno@example.test','00000001',1),(9,'Alumno Dos QA','dos@example.test','00000009',1),
      (2,'Encargado QA','encargado@example.test','00000002',2),(22,'Otro encargado QA','otro@example.test','00000022',2),
      (3,'Administración QA','admin@example.test','00000003',3),(4,'Rectoría QA','rectoria@example.test','00000004',4)`);
    trineo = (await bootstrap.query("SELECT id_club FROM clubes WHERE plantilla='trineo'")).rows[0].id_club;
    misiones = (await bootstrap.query("SELECT id_club FROM clubes WHERE plantilla='misiones'")).rows[0].id_club;
    await bootstrap.query("UPDATE clubes SET id_responsable_club=2,estado_publicacion='publicada' WHERE id_club=ANY($1::int[])", [[trineo, misiones]]);
    db = new pg.Pool({ connectionString, options: '-c search_path=' + esquema, max: 8 });
    const autenticar = async (req, res, next) => {
      const usuario = (await db.query('SELECT id_usuario AS id,id_rol FROM usuarios WHERE id_usuario=$1', [Number(req.headers['x-qa-user']) || -1])).rows[0];
      if (!usuario) return res.status(401).json({ error: 'Sesión requerida' });
      req.user = usuario; next();
    };
    const app = express(); app.use(express.json());
    app.use('/actividades', crearRouterActividades({ db, autenticar, hoy: () => fecha }));
    servidor = app.listen(0, '127.0.0.1'); await new Promise((resolve) => servidor.once('listening', resolve));
    base = 'http://127.0.0.1:' + servidor.address().port + '/actividades';
  });
  after(async () => {
    if (servidor) await new Promise((resolve) => servidor.close(resolve));
    if (db) await db.end();
    await bootstrap.query('ROLLBACK');
    await bootstrap.query('DROP SCHEMA IF EXISTS ' + esquema + ' CASCADE');
    await bootstrap.end();
  });

  test('el encargado captura y corrige cartas sin cambiar registros anteriores', async () => {
    const e = await edicion();
    const anterior = await inscripcionAnterior(e);
    await enviar(null, 'POST', e.gestion, datosCarta(), 401);
    await enviar(9, 'POST', e.gestion, datosCarta(), 403);
    await enviar(22, 'POST', e.gestion, datosCarta(), 403);
    for (const datos of [{ edad: 0 }, { edad: true }, { deseo: ' ' }, { nombre: '' }]) await enviar(2, 'POST', e.gestion, { ...datosCarta(), ...datos }, 400);
    assert.equal((await db.query('SELECT cartas_habilitadas FROM actividades_ediciones WHERE id_edicion=$1', [e.id])).rows[0].cartas_habilitadas, false);
    const carta = await nuevaCarta(e);
    assert.equal((await db.query('SELECT cartas_habilitadas FROM actividades_ediciones WHERE id_edicion=$1', [e.id])).rows[0].cartas_habilitadas, true);
    assert.equal((await enviar(1, 'PUT', e.ruta, registro(e))).id_registro, anterior.id_registro);
    const corregida = await enviar(2, 'PUT', e.gestion + '/' + carta.id_carta, { nombre: 'Niño corregido QA' });
    assert.equal(corregida.nombre, 'Niño corregido QA');
    await enviar(2, 'PUT', e.gestion + '/' + carta.id_carta, { activa: false });
    assert.deepEqual((await enviar(1, 'GET', '/ediciones/' + e.id + '/cartas')).cartas, []);
    await enviar(2, 'PUT', e.gestion + '/' + carta.id_carta, { activa: true });
    assert.equal((await enviar(1, 'GET', '/ediciones/' + e.id + '/cartas')).cartas.length, 1);
    const otro = await edicion(misiones);
    await enviar(2, 'POST', otro.gestion, datosCarta(), 404);
  });

  test('los datos de niños requieren sesión y no aparecen en el detalle público', async () => {
    const e = await edicion(); await nuevaCarta(e, 'Nombre privado QA');
    await enviar(null, 'GET', '/ediciones/' + e.id + '/cartas', undefined, 401);
    await enviar(9, 'GET', e.gestion, undefined, 403);
    const publico = await enviar(null, 'GET', '/detalle/trineo-de-los-suenos');
    assert.equal(JSON.stringify(publico).includes('Nombre privado QA'), false);
    const disponibles = await enviar(1, 'GET', '/ediciones/' + e.id + '/cartas');
    assert.deepEqual(Object.keys(disponibles.cartas[0]).sort(), ['id_carta', 'nombre', 'edad', 'deseo'].sort());
  });

  test('valida carta y edición antes de crear inscripción o compromisos', async () => {
    const e = await edicion(); const carta = await nuevaCarta(e);
    const otra = await edicion(); const ajena = await nuevaCarta(otra);
    await enviar(1, 'PUT', e.ruta, registro(e), 400);
    await enviar(1, 'PUT', e.ruta, registro(e, true), 400);
    await enviar(1, 'PUT', e.ruta, registro(e, ajena.id_carta), 409);
    const opcion2 = (await db.query("INSERT INTO actividades_aportes_catalogo(id_edicion,nombre,unidad,cantidad_minima) VALUES($1,'Otro aporte','piezas',1) RETURNING id_opcion", [e.id])).rows[0].id_opcion;
    await enviar(1, 'PUT', e.ruta, { ...registro(e, carta.id_carta), aportaciones: [{ id_opcion: e.opcion, cantidad: 1 }, { id_opcion: opcion2, cantidad: 0 }] }, 400);
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM actividades_registros WHERE id_edicion=$1', [e.id])).rows[0].n, 0);
  });

  test('reservar vincula el regalo, oculta la carta a otros alumnos y tolera dobles envíos', async () => {
    const e = await edicion(); const carta = await nuevaCarta(e);
    const [primera, segunda] = await Promise.all([1, 2].map(() => enviar(1, 'PUT', e.ruta, registro(e, carta.id_carta))));
    assert.equal(primera.id_registro, segunda.id_registro);
    assert.equal(primera.carta.id_aportacion, null);
    assert.equal(primera.aportaciones[0].es_regalo_carta, false);
    assert.equal(primera.carta.nombre, carta.nombre);
    assert.equal(primera.carta.estado, 'reservada');
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM actividades_cartas_reservas WHERE id_registro=$1', [primera.id_registro])).rows[0].n, 1);
    assert.deepEqual((await enviar(9, 'GET', '/ediciones/' + e.id + '/cartas')).cartas, []);
    assert.equal((await enviar(9, 'GET', '/ediciones/' + e.id + '/mi-registro')).registro, null);
    assert.equal((await enviar(1, 'GET', '/ediciones/' + e.id + '/mi-registro')).registro.carta.id_carta, carta.id_carta);
    const lista = await enviar(2, 'GET', e.gestion);
    assert.equal(lista.cartas[0].estado, 'reservada');
    assert.equal(lista.cartas[0].alumno_nombre, 'Alumno Uno QA');
  });

  test('dos alumnos simultáneos solo pueden confirmar una reserva', async () => {
    const e = await edicion(); const carta = await nuevaCarta(e);
    const resultados = await Promise.all([1, 9].map((usuario) => solicitar(usuario, 'PUT', e.ruta, registro(e, carta.id_carta))));
    assert.deepEqual(resultados.map((r) => r.status).sort(), [200, 409]);
    assert.match(resultados.find((r) => r.status === 409).resultado.error, /ya reservó/);
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM actividades_registros WHERE id_edicion=$1', [e.id])).rows[0].n, 1);
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM actividades_cartas_reservas WHERE id_carta=$1 AND cancelada_en IS NULL', [carta.id_carta])).rows[0].n, 1);
  });

  test('cambiar de niño libera la carta anterior y conserva su información histórica', async () => {
    const e = await edicion(); const carta = await nuevaCarta(e, 'Primero QA'); const otra = await nuevaCarta(e, 'Segundo QA');
    await enviar(1, 'PUT', e.ruta, registro(e, carta.id_carta));
    const cambio = await enviar(1, 'PUT', e.ruta, registro(e, otra.id_carta));
    assert.equal(cambio.carta.id_carta, otra.id_carta);
    assert.equal(cambio.historial_cartas.length, 1);
    assert.equal(cambio.historial_cartas[0].estado, 'cancelada');
    await enviar(2, 'PUT', e.gestion + '/' + carta.id_carta, { nombre: 'Nombre actualizado QA' });
    const propio = await enviar(1, 'GET', '/ediciones/' + e.id + '/mi-registro');
    assert.equal(propio.registro.historial_cartas[0].nombre, 'Primero QA');
    assert.equal((await enviar(9, 'GET', '/ediciones/' + e.id + '/cartas')).cartas[0].id_carta, carta.id_carta);
    await enviar(2, 'POST', recibirCarta(cambio.carta), {});
    const recibido = (await enviar(1, 'GET', '/ediciones/' + e.id + '/mi-registro')).registro;
    assert.ok(recibido.carta.recibida_en);
    assert.equal(recibido.historial_cartas[0].recibida_en, null);
  });

  test('cancelar libera solo el regalo pendiente y permite volver a inscribirse sin duplicados', async () => {
    const e = await edicion(); const carta = await nuevaCarta(e); const otra = await nuevaCarta(e, 'Otra carta QA');
    const primero = await enviar(1, 'PUT', e.ruta, registro(e, carta.id_carta));
    await enviar(1, 'DELETE', e.ruta); await enviar(1, 'DELETE', e.ruta);
    const cancelado = (await enviar(1, 'GET', '/ediciones/' + e.id + '/mi-registro')).registro;
    assert.equal(cancelado.carta, null); assert.equal(cancelado.historial_cartas.length, 1);
    assert.equal(cancelado.aportaciones[0].estado, 'cancelada');
    await enviar(9, 'PUT', e.ruta, registro(e, carta.id_carta));
    await enviar(1, 'PUT', e.ruta, registro(e, carta.id_carta), 409);
    const reinscrito = await enviar(1, 'PUT', e.ruta, registro(e, otra.id_carta));
    assert.equal(reinscrito.id_registro, primero.id_registro);
    assert.equal(reinscrito.carta.id_carta, otra.id_carta);
    assert.equal(reinscrito.historial_cartas.length, 1);
  });

  test('la recepción registra responsable y fecha, es idempotente y conserva la carta incluso al cancelar', async () => {
    const e = await edicion(); const carta = await nuevaCarta(e); const otra = await nuevaCarta(e, 'Carta diferente QA');
    const propio = await enviar(1, 'PUT', e.ruta, registro(e, carta.id_carta));
    const ruta = recibirCarta(propio.carta);
    await enviar(9, 'POST', ruta, {}, 403); await enviar(22, 'POST', ruta, {}, 403);
    const [recibido, repetido] = await Promise.all([enviar(2, 'POST', ruta, {}), enviar(2, 'POST', ruta, {})]);
    assert.equal(recibido.recibida_en, repetido.recibida_en);
    await enviar(2, 'PUT', e.gestion + '/' + carta.id_carta, { activa: false }, 409);
    await enviar(2, 'PUT', e.gestion + '/' + carta.id_carta, { deseo: 'Otro deseo' }, 409);
    await enviar(1, 'PUT', e.ruta, registro(e, otra.id_carta), 409);
    const cambio = await enviar(1, 'PUT', e.ruta, registro(e));
    assert.equal(cambio.carta.estado, 'entregada');
    assert.equal(cambio.carta.recibida_por_nombre, 'Encargado QA');
    await enviar(1, 'DELETE', e.ruta);
    const cancelado = (await enviar(1, 'GET', '/ediciones/' + e.id + '/mi-registro')).registro;
    assert.equal(cancelado.carta.estado, 'entregada'); assert.equal(cancelado.aportaciones[0].estado, 'cancelada');
    assert.equal((await enviar(9, 'GET', '/ediciones/' + e.id + '/cartas')).cartas.some((fila) => fila.id_carta === carta.id_carta), false);
    assert.equal((await enviar(2, 'GET', e.gestion)).cartas.find((fila) => fila.id_carta === carta.id_carta).estado, 'entregada');
    assert.equal((await db.query("SELECT COUNT(*)::int AS n FROM actividad_clubes WHERE tipo_evento='regalo_carta_recibido' AND id_edicion=$1", [e.id])).rows[0].n, 1);
  });

  test('un fallo al registrar el historial revierte reserva, inscripción y aportaciones', async () => {
    const e = await edicion(); const carta = await nuevaCarta(e);
    await db.query("CREATE FUNCTION qa_fallo_cartas() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.tipo_evento='carta_reservada' THEN RAISE EXCEPTION 'Fallo QA'; END IF; RETURN NEW; END $$; CREATE TRIGGER qa_fallo_cartas BEFORE INSERT ON actividad_clubes FOR EACH ROW EXECUTE FUNCTION qa_fallo_cartas()");
    try { await enviar(1, 'PUT', e.ruta, registro(e, carta.id_carta), 500); }
    finally { await db.query('DROP TRIGGER qa_fallo_cartas ON actividad_clubes; DROP FUNCTION qa_fallo_cartas()'); }
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM actividades_registros WHERE id_edicion=$1', [e.id])).rows[0].n, 0);
    assert.equal((await enviar(1, 'GET', '/ediciones/' + e.id + '/cartas')).cartas.length, 1);
  });

  test('respeta fechas, archivo, relaciones entre ediciones y reasignación del encargado', async () => {
    const e = await edicion(); const carta = await nuevaCarta(e); const otra = await edicion();
    const ajena = await nuevaCarta(otra);
    fecha = '2026-12-05';
    await enviar(1, 'PUT', e.ruta, registro(e, carta.id_carta), 409);
    fecha = '2026-11-18';
    const propio = await enviar(1, 'PUT', e.ruta, registro(e, carta.id_carta));
    await assert.rejects(db.query('INSERT INTO actividades_cartas_reservas(id_carta,id_registro,id_aportacion,carta_snapshot) VALUES($1,$2,$3,$4)', [ajena.id_carta, propio.id_registro, propio.aportaciones[0].id_aportacion, datosCarta()]), { code: '23514' });
    await enviar(3, 'PUT', '/gestion/actividades/' + trineo + '/responsable', { id_responsable: 22 });
    await enviar(2, 'GET', e.gestion, undefined, 403);
    await enviar(22, 'GET', e.gestion);
    await enviar(3, 'PUT', '/gestion/actividades/' + trineo + '/responsable', { id_responsable: 2 });
    await db.query("UPDATE actividades_ediciones SET estado='archivada' WHERE id_edicion=$1", [e.id]);
    await enviar(2, 'POST', e.gestion, datosCarta(), 409);
    await enviar(1, 'GET', '/ediciones/' + e.id + '/cartas', undefined, 404);
  });

  test('la migración se puede repetir y el esquema completo conserva reservas e historial', async () => {
    const antes = (await db.query('SELECT * FROM actividades_cartas_reservas ORDER BY id_reserva')).rows;
    const cartas = (await db.query('SELECT * FROM actividades_cartas ORDER BY id_carta')).rows;
    const sql = await readFile(new URL('../migrations/migrate-trineo-cartas.sql', import.meta.url), 'utf8');
    await bootstrap.query(sql); await bootstrap.query(sql);
    const separar = await readFile(new URL('../migrations/migrate-trineo-aportaciones-independientes.sql', import.meta.url), 'utf8');
    await bootstrap.query(separar); await bootstrap.query(separar);
    await bootstrap.query(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
    assert.deepEqual((await db.query('SELECT * FROM actividades_cartas_reservas ORDER BY id_reserva')).rows, antes);
    assert.deepEqual((await db.query('SELECT * FROM actividades_cartas ORDER BY id_carta')).rows, cartas);
  });

  test('Trineo exige carta desde el principio y permite reservar sin aportaciones ni catálogo', async () => {
    const e = await edicion();
    await db.query('DELETE FROM actividades_aportes_catalogo WHERE id_edicion=$1', [e.id]);
    await enviar(1, 'PUT', e.ruta, { respuestas: {}, aportaciones: [] }, 400);
    const carta = await nuevaCarta(e);
    const propio = await enviar(1, 'PUT', e.ruta, { respuestas: {}, id_carta: carta.id_carta, aportaciones: [] });
    assert.equal(propio.carta.estado, 'reservada'); assert.equal(propio.carta.id_aportacion, null);
    assert.deepEqual(propio.aportaciones, []);
    const mio = (await enviar(1, 'GET', '/mis-registros')).find((fila) => fila.id_edicion === e.id);
    assert.equal(mio.carta.id_reserva, propio.carta.id_reserva);
    const recibida = await enviar(2, 'POST', recibirCarta(propio.carta), {});
    assert.equal(recibida.estado, 'entregada');
  });

  test('comida y globos se reciben aparte del regalo y no limitan a una sola opción', async () => {
    const e = await edicion(); const carta = await nuevaCarta(e);
    const globos = (await db.query("INSERT INTO actividades_aportes_catalogo(id_edicion,nombre,unidad,cantidad_minima) VALUES($1,'Globos QA','bolsas',1) RETURNING id_opcion", [e.id])).rows[0].id_opcion;
    const datos = { ...registro(e, carta.id_carta), aportaciones: [{ id_opcion: e.opcion, cantidad: 2 }, { id_opcion: globos, cantidad: 3 }] };
    const propio = await enviar(1, 'PUT', e.ruta, datos);
    assert.equal(propio.aportaciones.length, 2);
    const comida = propio.aportaciones.find((aporte) => aporte.id_opcion === e.opcion);
    await enviar(2, 'POST', '/gestion/aportaciones/' + comida.id_aportacion + '/recibir', {});
    const parcial = (await enviar(1, 'GET', '/ediciones/' + e.id + '/mi-registro')).registro;
    assert.equal(parcial.carta.estado, 'reservada');
    const otra = await nuevaCarta(e, 'Otro niño QA');
    const cambio = await enviar(1, 'PUT', e.ruta, { ...datos, id_carta: otra.id_carta });
    assert.equal(cambio.carta.id_carta, otra.id_carta);
    await enviar(2, 'POST', recibirCarta(cambio.carta), {});
    const final = (await enviar(1, 'GET', '/ediciones/' + e.id + '/mi-registro')).registro;
    assert.equal(final.carta.estado, 'entregada');
    assert.equal(final.aportaciones.find((aporte) => aporte.id_opcion === globos).estado, 'comprometida');
    assert.equal(final.historial_cartas[0].recibida_en, null);
  });

  test('ambas actividades respetan la configuración de aportación y solo Trineo utiliza cartas', async () => {
    for (const actividad of [trineo, misiones]) {
      for (const obligatoria of [true, false]) {
        const e = await edicion(actividad, obligatoria);
        const carta = actividad === trineo ? await nuevaCarta(e) : null;
        const datos = { respuestas: {}, aportaciones: [], ...(carta ? { id_carta: carta.id_carta } : {}) };
        await enviar(1, 'PUT', e.ruta, datos, obligatoria ? 400 : 200);
        if (obligatoria) await enviar(1, 'PUT', e.ruta, { ...datos, aportaciones: registro(e).aportaciones });
        if (actividad === misiones) {
          await enviar(1, 'PUT', e.ruta, { ...datos, aportaciones: registro(e).aportaciones, id_carta: 1 }, 400);
          await enviar(1, 'GET', '/ediciones/' + e.id + '/cartas', undefined, 404);
        }
      }
    }
  });

  test('una recepción de una reserva liberada no recibe por accidente el regalo de otro alumno', async () => {
    const e = await edicion(); const carta = await nuevaCarta(e);
    const primero = await enviar(1, 'PUT', e.ruta, registro(e, carta.id_carta));
    await enviar(1, 'DELETE', e.ruta);
    const segundo = await enviar(9, 'PUT', e.ruta, registro(e, carta.id_carta));
    await enviar(2, 'POST', recibirCarta(primero.carta), {}, 409);
    assert.equal((await enviar(9, 'GET', '/ediciones/' + e.id + '/mi-registro')).registro.carta.estado, 'reservada');
    assert.notEqual(primero.carta.id_reserva, segundo.carta.id_reserva);
  });

  test('los regalos vinculados anteriormente conservan su recepción y no cuentan como materiales', async () => {
    const e = await edicion(); const carta = await nuevaCarta(e); const anterior = await inscripcionAnterior(e);
    const aporte = (await db.query("INSERT INTO actividades_aportaciones(id_registro,id_opcion,nombre,unidad,cantidad,cantidad_minima) VALUES($1,$2,'Regalo anterior','regalo',1,1) RETURNING *", [anterior.id_registro, e.opcion])).rows[0];
    await db.query('INSERT INTO actividades_cartas_reservas(id_carta,id_registro,id_aportacion,carta_snapshot) VALUES($1,$2,$3,$4)', [carta.id_carta, anterior.id_registro, aporte.id_aportacion, datosCarta()]);
    await enviar(2, 'POST', '/gestion/aportaciones/' + aporte.id_aportacion + '/recibir', {});
    const propio = (await enviar(1, 'GET', '/ediciones/' + e.id + '/mi-registro')).registro;
    assert.equal(propio.carta.estado, 'entregada'); assert.equal(propio.aportaciones[0].es_regalo_carta, true);
    const repetido = await enviar(2, 'POST', recibirCarta(propio.carta), {});
    assert.equal(repetido.recibida_en, propio.carta.recibida_en);
    const corregido = await enviar(1, 'PUT', e.ruta, registro(e, carta.id_carta));
    assert.equal(corregido.aportaciones[0].estado, 'recibida'); assert.equal(corregido.carta.estado, 'entregada');
    assert.equal((await db.query("SELECT COUNT(*)::int AS n FROM actividad_clubes WHERE id_edicion=$1 AND tipo_evento='regalo_carta_recibido'", [e.id])).rows[0].n, 1);
  });

  test('un fallo al registrar la recepción revierte el regalo y permite reintentar', async () => {
    const e = await edicion(); const carta = await nuevaCarta(e);
    const propio = await enviar(1, 'PUT', e.ruta, { ...registro(e, carta.id_carta), aportaciones: [] });
    await db.query("CREATE FUNCTION qa_fallo_entrega() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.tipo_evento='regalo_carta_recibido' THEN RAISE EXCEPTION 'Fallo QA'; END IF; RETURN NEW; END $$; CREATE TRIGGER qa_fallo_entrega BEFORE INSERT ON actividad_clubes FOR EACH ROW EXECUTE FUNCTION qa_fallo_entrega()");
    try { await enviar(2, 'POST', recibirCarta(propio.carta), {}, 500); }
    finally { await db.query('DROP TRIGGER qa_fallo_entrega ON actividad_clubes; DROP FUNCTION qa_fallo_entrega()'); }
    assert.equal((await enviar(1, 'GET', '/ediciones/' + e.id + '/mi-registro')).registro.carta.estado, 'reservada');
    await enviar(2, 'POST', recibirCarta(propio.carta), {});
  });

  test('actualiza una base anterior conservando la entrega original y sin atribuirla a cartas liberadas', async () => {
    const nombre = esquema + '_anterior';
    const anterior = new pg.Client({ connectionString }); await anterior.connect();
    try {
      await anterior.query('CREATE SCHEMA ' + nombre); await anterior.query('SET search_path TO ' + nombre);
      const completo = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
      await anterior.query(completo.slice(0, completo.indexOf('-- TRINEO: cartas y reservas')) + '\nCOMMIT;');
      await anterior.query(await readFile(new URL('./fixtures/trineo-cartas-v1.sql', import.meta.url), 'utf8'));
      await anterior.query("INSERT INTO usuarios(id_usuario,nombre_completo,correo_institucional,institutional_id,id_rol) VALUES(1,'Alumno histórico','uno@example.test','00000001',1),(2,'Encargado histórico','dos@example.test','00000002',2)");
      const actividad = (await anterior.query("SELECT id_club FROM clubes WHERE plantilla='trineo'")).rows[0].id_club;
      const e = (await anterior.query("INSERT INTO actividades_ediciones(id_actividad,nombre,requiere_aportacion) VALUES($1,'Histórica',TRUE) RETURNING id_edicion", [actividad])).rows[0].id_edicion;
      const r = (await anterior.query("INSERT INTO actividades_registros(id_edicion,id_usuario,nombre_completo,matricula) VALUES($1,1,'Alumno histórico','00000001') RETURNING id_registro", [e])).rows[0].id_registro;
      const o = (await anterior.query("INSERT INTO actividades_aportes_catalogo(id_edicion,nombre,unidad,cantidad_minima) VALUES($1,'Regalo','piezas',1) RETURNING id_opcion", [e])).rows[0].id_opcion;
      const a = (await anterior.query("INSERT INTO actividades_aportaciones(id_registro,id_opcion,nombre,unidad,cantidad,cantidad_minima) VALUES($1,$2,'Regalo','piezas',1,1) RETURNING id_aportacion", [r, o])).rows[0].id_aportacion;
      const cartas = (await anterior.query("INSERT INTO actividades_cartas(id_edicion,nombre,edad,deseo) VALUES($1,'Primero',7,'Trompo'),($1,'Segundo',8,'Balón') RETURNING id_carta", [e])).rows;
      await anterior.query('INSERT INTO actividades_cartas_reservas(id_carta,id_registro,id_aportacion,carta_snapshot,cancelada_en) VALUES($1,$2,$3,$4,NOW()),($5,$2,$3,$4,NULL)', [cartas[0].id_carta, r, a, datosCarta(), cartas[1].id_carta]);
      await anterior.query("UPDATE actividades_aportaciones SET estado='recibida',recibida_en='2026-11-10T10:00:00Z',recibida_por=2 WHERE id_aportacion=$1", [a]);
      await anterior.query("INSERT INTO usuarios(id_usuario,nombre_completo,correo_institucional,institutional_id,id_rol) VALUES(9,'Histórico sin fecha','nueve@example.test','00000009',1)");
      const sinFecha = (await anterior.query("INSERT INTO actividades_registros(id_edicion,id_usuario,nombre_completo,matricula) VALUES($1,9,'Histórico sin fecha','00000009') RETURNING id_registro", [e])).rows[0].id_registro;
      const regaloSinFecha = (await anterior.query("INSERT INTO actividades_aportaciones(id_registro,id_opcion,nombre,unidad,cantidad,cantidad_minima,estado) VALUES($1,$2,'Regalo recibido sin fecha','piezas',1,1,'recibida') RETURNING id_aportacion", [sinFecha, o])).rows[0].id_aportacion;
      const cartaSinFecha = (await anterior.query("INSERT INTO actividades_cartas(id_edicion,nombre,edad,deseo) VALUES($1,'Tercero',6,'Juguete') RETURNING id_carta", [e])).rows[0].id_carta;
      await anterior.query('INSERT INTO actividades_cartas_reservas(id_carta,id_registro,id_aportacion,carta_snapshot) VALUES($1,$2,$3,$4)', [cartaSinFecha, sinFecha, regaloSinFecha, datosCarta()]);
      const migracion = await readFile(new URL('../migrations/migrate-trineo-aportaciones-independientes.sql', import.meta.url), 'utf8');
      await anterior.query(migracion); await anterior.query(migracion);
      const reservas = (await anterior.query('SELECT * FROM actividades_cartas_reservas ORDER BY id_reserva')).rows;
      assert.equal(reservas[0].recibida_en, null);
      assert.equal(reservas[1].recibida_en.toISOString(), '2026-11-10T10:00:00.000Z');
      assert.equal(reservas[1].recibida_por, 2); assert.equal(reservas[1].id_aportacion, a);
      assert.equal(reservas[1].recibida, true); assert.equal(reservas[0].recibida, false);
      assert.equal(reservas[2].recibida, true); assert.equal(reservas[2].recibida_en, null);
      await assert.rejects(anterior.query('UPDATE actividades_cartas_reservas SET cancelada_en=NOW() WHERE id_reserva=$1', [reservas[2].id_reserva]), { code: '23514' });
      assert.equal((await anterior.query('SELECT requiere_aportacion FROM actividades_ediciones WHERE id_edicion=$1', [e])).rows[0].requiere_aportacion, true);
      await anterior.query(completo);
      assert.deepEqual((await anterior.query('SELECT * FROM actividades_cartas_reservas ORDER BY id_reserva')).rows, reservas);
    } finally {
      await anterior.query('ROLLBACK'); await anterior.query('DROP SCHEMA IF EXISTS ' + nombre + ' CASCADE'); await anterior.end();
    }
  });
});
