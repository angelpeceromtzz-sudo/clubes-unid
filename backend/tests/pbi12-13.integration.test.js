import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import express from 'express';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import dotenv from 'dotenv';
import { validarPropuesta } from '../lib/propuestasHorario.js';
dotenv.config({ path: new URL('../.env', import.meta.url) });
const { default: pool } = await import('../db.js');

// Cada ejecución usa un esquema vacío y exclusivo; nunca lee ni escribe las tablas del sistema.
const esquema = `pbi_12_13_${randomBytes(6).toString('hex')}`;
const queryOriginal = pool.query.bind(pool);
const connectOriginal = pool.connect.bind(pool);
let testPool, servidor, base, creado = false;
process.env.JWT_SECRET = 'pbi12-13-clave-exclusiva-pruebas';

before(async () => {
  await queryOriginal(`CREATE SCHEMA "${esquema}"`); creado = true;
  testPool = new pg.Pool({ ...pool.options, password: pool.options.password, connectionString: pool.options.connectionString,
    options: `-c search_path=${esquema}`, max: 5, connectionTimeoutMillis: 5000 });
  await testPool.query(`
    CREATE TABLE usuarios (id_usuario INT PRIMARY KEY, id_rol INT NOT NULL, nombre_completo TEXT NOT NULL);
    CREATE TABLE clubes (id_club INT PRIMARY KEY, nombre_club TEXT NOT NULL, id_presidente INT, id_vicepresidente INT,
      fecha_apertura_programada TIMESTAMPTZ, fecha_limite_cierre TIMESTAMPTZ, max_postulaciones INT,
      cerrada_manualmente BOOLEAN DEFAULT FALSE, postulaciones_actuales INT DEFAULT 0);
    CREATE VIEW clubes_con_estado AS SELECT c.*, 'cerrado'::text AS estado_calculado, 0 AS formularios_recibidos FROM clubes c;
    CREATE TABLE horarios_club (id_horario SERIAL PRIMARY KEY, id_club INT NOT NULL, dia_semana INT NOT NULL,
      hora_inicio TIME NOT NULL, hora_fin TIME NOT NULL, lugar VARCHAR(255) NOT NULL,
      descripcion TEXT DEFAULT '', ubicacion_maps TEXT DEFAULT '', fecha_creacion TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE convocatorias (id_convocatoria SERIAL PRIMARY KEY, id_club INT, id_presidente INT,
      fecha DATE, hora TIME, lugar TEXT, bloque TEXT, periodo TEXT, enviada BOOLEAN DEFAULT FALSE);
    CREATE TABLE formularios (id_formulario SERIAL PRIMARY KEY, id_club INT, id_alumno INT, nombre_completo TEXT,
      matricula TEXT, status TEXT, fecha_envio TIMESTAMPTZ DEFAULT NOW(), id_convocatoria INT);
    CREATE TABLE notificaciones (id_notificacion SERIAL PRIMARY KEY, id_emisor INT, titulo TEXT, mensaje TEXT, audiencia TEXT, id_club INT, id_destinatario INT, CHECK (audiencia IN ('global','presidentes','alumnos','club')));
    CREATE TABLE actividad_clubes (id SERIAL PRIMARY KEY, tipo_evento TEXT, id_club INT, id_actor INT, descripcion TEXT, detalles JSONB);
    CREATE TABLE historial_admin (id SERIAL PRIMARY KEY, id_admin INT, admin_nombre TEXT, accion TEXT, descripcion TEXT, entidad_tipo TEXT, entidad_id INT, detalles JSONB);
    INSERT INTO usuarios VALUES (1,3,'Coordinación'),(2,2,'Presidente A'),(3,2,'Presidente B'),(4,1,'Alumno'),(5,4,'Rectoría'),(6,5,'Vicepresidente'),(7,3,'Coordinación B');
    INSERT INTO clubes(id_club,nombre_club,id_presidente,id_vicepresidente) VALUES (1,'Club A',2,6),(2,'Club B',3,NULL);
  `);
  const sql = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  const marcador = '-- PBI-13: horarios oficiales y propuestas revisadas por Coordinación (admin).';
  assert.ok(sql.includes(marcador));
  const migracion = sql.slice(sql.indexOf(marcador));
  await testPool.query(migracion);
  await testPool.query(migracion); // Debe poder reiniciarse el backend sin duplicar ni borrar datos.
  await testPool.query("INSERT INTO espacios_club(id_espacio,nombre) VALUES (1,'Cancha principal'),(2,'Salón cultural'); SELECT setval(pg_get_serial_sequence('espacios_club','id_espacio'),3,false)");
  pool.query = (...args) => testPool.query(...args);
  pool.connect = (...args) => testPool.connect(...args);
  const [{ default: horarios }, { default: convocatorias }, { default: clubes }, { default: formularios }] = await Promise.all([
    import('../routes/horarios.js'), import('../routes/convocatorias.js'), import('../routes/clubes.js'), import('../routes/formularios.js'),
  ]);
  const app = express(); app.use(express.json());
  app.use('/horarios', horarios); app.use('/convocatorias', convocatorias); app.use('/clubes', clubes); app.use('/formularios', formularios);
  servidor = app.listen(0, '127.0.0.1'); await new Promise((resolve) => servidor.once('listening', resolve));
  base = `http://127.0.0.1:${servidor.address().port}`;
});
after(async () => {
  if (servidor) await new Promise((resolve) => servidor.close(resolve));
  pool.query = queryOriginal; pool.connect = connectOriginal;
  if (testPool) await testPool.end();
  if (creado && /^pbi_12_13_[a-f0-9]{12}$/.test(esquema)) await queryOriginal(`DROP SCHEMA "${esquema}" CASCADE`);
  await pool.end();
});
beforeEach(async () => {
  await testPool.query(`TRUNCATE horarios_club, solicitudes_horario, historial_solicitudes_horario, notificaciones,
    formularios, convocatorias, solicitudes_convocatoria, actividad_clubes, historial_admin RESTART IDENTITY CASCADE;
    UPDATE clubes SET version_horario = 0, fecha_apertura_programada = NULL, fecha_limite_cierre = NULL, cerrada_manualmente = FALSE, max_postulaciones = NULL`);
});
async function enviar(method, ruta, datos, rol = 3, usuario) {
  const ids = { 1: 4, 2: 2, 3: 1, 4: 5, 5: 6 };
  const headers = { 'Content-Type': 'application/json' };
  if (rol) headers.Authorization = `Bearer ${jwt.sign({ id: usuario || ids[rol], id_rol: rol, nombre_completo: 'Prueba' }, process.env.JWT_SECRET)}`;
  const res = await fetch(`${base}${ruta}`, { method, headers, body: datos ? JSON.stringify(datos) : undefined });
  return { status: res.status, datos: await res.json() };
}
const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const sesion = { id_espacio: 1, dia_semana: 1, hora_inicio: '09:00', hora_fin: '10:00', descripcion: 'Actividad semanal' };
const propuesta = (cambios = {}) => ({ vigencia_inicio: hoy, vigencia_fin: null, detalle: [{ ...sesion }], ...cambios });
async function crearEnviar(club = 1, cambios = {}) {
  const creada = await enviar('POST', `/horarios/solicitudes/club/${club}`, propuesta(cambios), 2, club === 1 ? 2 : 3);
  assert.equal(creada.status, 200, JSON.stringify(creada.datos));
  const enviada = await enviar('POST', `/horarios/solicitudes/${creada.datos.id_solicitud}/enviar`, {}, 2, club === 1 ? 2 : 3);
  assert.equal(enviada.status, 200, JSON.stringify(enviada.datos));
  return enviada.datos;
}

test('PBI-12: solo el presidente de su club crea; solo admin revisa, publica y cierra', async () => {
  for (const rol of [null,1,3,4,5]) for (const [method,ruta,datos] of [
    ['POST','/convocatorias/generar',{id_club:1}], ['PUT','/convocatorias/1',{lugar:'Salón'}],
    ['POST','/convocatorias/1/solicitar-revision',{}], ['PUT','/clubes/1/convocatoria',{max_postulaciones:20}],
  ]) assert.equal((await enviar(method,ruta,datos,rol)).status, rol ? 403 : 401);
  for (const rol of [null,1,2,4,5]) for (const [ruta,datos] of [
    ['/convocatorias/1/enviar',{}], ['/convocatorias/1/rechazar',{observaciones:'Ajustar'}],
    ['/clubes/1/convocatoria/revision',{accion:'aprobar',id_solicitud:1}], ['/clubes/1/cerrar-convocatoria',{}],
  ]) assert.equal((await enviar('POST',ruta,datos,rol)).status,rol ? 403 : 401);
  assert.equal((await enviar('GET','/clubes/1/convocatoria',null,2)).status,200);
  assert.equal((await enviar('GET','/clubes/2/convocatoria',null,2)).status,403);
  assert.equal((await enviar('GET','/clubes/2/convocatoria',null,3)).status,200);
  assert.equal((await enviar('PUT','/clubes/2/convocatoria',{max_postulaciones:20},2)).status,403);
  assert.equal((await enviar('POST','/convocatorias/generar',{id_club:2},2)).status,403);
  assert.equal((await enviar('PUT','/clubes/1/convocatoria',{fecha_apertura_programada:'2099-01-01T10:00:00Z',fecha_limite_cierre:'2098-01-01T00:00:00Z'},2)).status,400);
});

const configConv = {fecha_apertura_programada:'2099-01-01T10:00:00Z',fecha_limite_cierre:'2099-02-01T10:00:00Z',max_postulaciones:20};
test('PBI-12: la propuesta de inscripción no cambia lo publicado; admin aprueba una sola vez', async () => {
  const propuesta = await enviar('PUT','/clubes/1/convocatoria',{...configConv,estado:'aprobado',id_revisor:2},2);
  assert.equal(propuesta.status,200,JSON.stringify(propuesta.datos));
  assert.equal(propuesta.datos.fecha_apertura_programada,null);
  assert.equal(propuesta.datos.solicitud.estado,'pendiente');
  assert.equal(propuesta.datos.solicitud.id_revisor,null);
  assert.equal((await enviar('PUT','/clubes/1/convocatoria',configConv,2)).status,409);
  assert.equal(Number((await testPool.query("SELECT COUNT(*) FROM notificaciones WHERE id_destinatario=4")).rows[0].count),0);
  const respuestas = await Promise.all([
    enviar('POST','/clubes/1/convocatoria/revision',{accion:'aprobar',id_solicitud:propuesta.datos.solicitud.id_solicitud}),
    enviar('POST','/clubes/1/convocatoria/revision',{accion:'aprobar',id_solicitud:propuesta.datos.solicitud.id_solicitud},3,7),
  ]);
  assert.deepEqual(respuestas.map((r)=>r.status).sort(),[200,409]);
  const aprobada = (await enviar('GET','/clubes/1/convocatoria')).datos;
  assert.equal(aprobada.max_postulaciones,20);
  assert.equal(aprobada.fecha_apertura_programada,'2099-01-01T10:00:00.000Z');
  assert.equal(aprobada.solicitud.estado,'aprobado');
  assert.equal((await enviar('POST','/clubes/1/cerrar-convocatoria',{})).status,200);
});

test('PBI-12: admin devuelve con motivo; el presidente corrige y solicita otra revisión', async () => {
  const s = (await enviar('PUT','/clubes/1/convocatoria',configConv,2)).datos.solicitud;
  assert.equal((await enviar('POST','/clubes/1/convocatoria/revision',{accion:'rechazar',id_solicitud:s.id_solicitud})).status,400);
  const rechazo = await enviar('POST','/clubes/1/convocatoria/revision',{accion:'rechazar',id_solicitud:s.id_solicitud,observaciones:'Cambiar fecha'});
  assert.equal(rechazo.status,200,JSON.stringify(rechazo.datos));
  assert.equal(rechazo.datos.solicitud.observaciones,'Cambiar fecha');
  assert.equal(rechazo.datos.fecha_apertura_programada,null);
  assert.equal((await enviar('PUT','/clubes/1/convocatoria',{...configConv,max_postulaciones:30},2)).status,200);
  assert.equal(Number((await testPool.query('SELECT COUNT(*) FROM solicitudes_convocatoria')).rows[0].count),2);
});

test('PBI-12: no se puede proponer una inscripción cuyo cierre ya venció', async () => {
  const cierre = new Date(Date.now() - 60000).toISOString();
  const res = await enviar('PUT', '/clubes/1/convocatoria', { fecha_limite_cierre: cierre, max_postulaciones: 20 }, 2);
  assert.equal(res.status, 400);
  assert.match(res.datos.error, /cierre debe ser futura/);
  assert.equal(Number((await testPool.query('SELECT COUNT(*) FROM solicitudes_convocatoria')).rows[0].count), 0);
});

async function vencerInscripcion(id) {
  await testPool.query(`UPDATE solicitudes_convocatoria SET configuracion = configuracion || jsonb_build_object(
    'fecha_apertura_programada', clock_timestamp() - interval '2 hours',
    'fecha_limite_cierre', clock_timestamp() - interval '1 minute') WHERE id_solicitud = $1`, [id]);
}

test('PBI-12: una inscripción vence antes de aprobar; se conserva y admite una nueva revisión', async () => {
  const s = (await enviar('PUT', '/clubes/1/convocatoria', configConv, 2)).datos.solicitud;
  await vencerInscripcion(s.id_solicitud);
  const tardia = await enviar('POST', '/clubes/1/convocatoria/revision', { accion: 'aprobar', id_solicitud: s.id_solicitud });
  assert.equal(tardia.status, 409);
  assert.equal(tardia.datos.solicitud.estado, 'vencido');
  assert.match(tardia.datos.error, /Actualiza las fechas/);
  assert.equal(tardia.datos.fecha_limite_cierre, null);
  assert.equal(tardia.datos.max_postulaciones, null);
  const anterior = (await testPool.query('SELECT * FROM solicitudes_convocatoria WHERE id_solicitud=$1', [s.id_solicitud])).rows[0];
  assert.equal(anterior.estado, 'vencido');
  assert.equal(anterior.id_revisor, null);
  assert.equal(Number((await testPool.query("SELECT COUNT(*) FROM notificaciones WHERE titulo='Convocatoria aprobada'")).rows[0].count), 0);
  const respuestas = await Promise.all([
    enviar('PUT', '/clubes/1/convocatoria', configConv, 2),
    enviar('PUT', '/clubes/1/convocatoria', configConv, 2),
  ]);
  assert.deepEqual(respuestas.map((r) => r.status).sort(), [200, 409]);
  const nueva = respuestas.find((r) => r.status === 200).datos.solicitud;
  assert.notEqual(nueva.id_solicitud, s.id_solicitud);
  assert.equal(nueva.estado, 'pendiente');
  assert.equal((await enviar('POST', '/clubes/1/convocatoria/revision', { accion: 'aprobar', id_solicitud: s.id_solicitud })).status, 409);
  const aprobada = await enviar('POST', '/clubes/1/convocatoria/revision', { accion: 'aprobar', id_solicitud: nueva.id_solicitud });
  assert.equal(aprobada.status, 200);
  assert.equal(aprobada.datos.solicitud.estado, 'aprobado');
  assert.equal(Number((await testPool.query('SELECT COUNT(*) FROM solicitudes_convocatoria')).rows[0].count), 2);
});

test('PBI-12: consultar detecta vencimiento y reenviar sin consulta previa también lo resuelve', async () => {
  const s = (await enviar('PUT', '/clubes/1/convocatoria', configConv, 2)).datos.solicitud;
  await vencerInscripcion(s.id_solicitud);
  const estado = await enviar('GET', '/clubes/1/convocatoria', null, 2);
  assert.equal(estado.datos.solicitud.estado, 'vencido');
  const nueva = (await enviar('PUT', '/clubes/1/convocatoria', configConv, 2)).datos.solicitud;
  await vencerInscripcion(nueva.id_solicitud);
  const reenvio = await enviar('PUT', '/clubes/1/convocatoria', configConv, 2);
  assert.equal(reenvio.status, 200);
  assert.notEqual(reenvio.datos.solicitud.id_solicitud, nueva.id_solicitud);
  assert.equal((await testPool.query('SELECT estado FROM solicitudes_convocatoria WHERE id_solicitud=$1', [nueva.id_solicitud])).rows[0].estado, 'vencido');
});

test('PBI-12: una apertura pasada sin cierre no vence; una aprobada conserva su estado al cerrar', async () => {
  const apertura = new Date(Date.now() - 3600000).toISOString();
  const propuesta = await enviar('PUT', '/clubes/1/convocatoria', { fecha_apertura_programada: apertura, fecha_limite_cierre: null }, 2);
  assert.equal(propuesta.status, 200);
  const s = propuesta.datos.solicitud;
  assert.equal((await enviar('GET', '/clubes/1/convocatoria', null, 2)).datos.solicitud.estado, 'pendiente');
  assert.equal((await enviar('POST', '/clubes/1/convocatoria/revision', { accion: 'aprobar', id_solicitud: s.id_solicitud })).status, 200);
  await vencerInscripcion(s.id_solicitud);
  assert.equal((await enviar('GET', '/clubes/1/convocatoria', null, 2)).datos.solicitud.estado, 'aprobado');
});

async function prepararBloquePendiente() {
  await testPool.query("INSERT INTO formularios(id_club,id_alumno,nombre_completo,status) VALUES (1,4,'Alumno','Preseleccionado')");
  assert.equal((await enviar('POST', '/convocatorias/generar', { id_club: 1 }, 2)).status, 200);
  const id = (await testPool.query('SELECT id_convocatoria FROM convocatorias')).rows[0].id_convocatoria;
  assert.equal((await enviar('PUT', '/convocatorias/' + id, { fecha: '2099-01-20', hora: '10:00', lugar: 'Cancha' }, 2)).status, 200);
  assert.equal((await enviar('POST', `/convocatorias/${id}/solicitar-revision`, {}, 2)).status, 200);
  return id;
}

async function vencerBloque(id) {
  await testPool.query(`UPDATE convocatorias SET
    fecha = ((clock_timestamp() AT TIME ZONE 'America/Mexico_City') - interval '1 minute')::date,
    hora = ((clock_timestamp() AT TIME ZONE 'America/Mexico_City') - interval '1 minute')::time
    WHERE id_convocatoria=$1`, [id]);
}

test('PBI-12: un bloque vencido no se publica ni convoca alumnos; puede reprogramarse y reenviarse', async () => {
  const id = await prepararBloquePendiente();
  await vencerBloque(id);
  const tardia = await enviar('POST', `/convocatorias/${id}/enviar`, {});
  assert.equal(tardia.status, 409);
  assert.match(tardia.datos.error, /venció/);
  let c = (await testPool.query('SELECT * FROM convocatorias WHERE id_convocatoria=$1', [id])).rows[0];
  assert.equal(c.estado_revision, 'vencido');
  assert.equal(c.enviada, false);
  assert.equal((await testPool.query('SELECT status FROM formularios')).rows[0].status, 'Preseleccionado');
  assert.equal(Number((await testPool.query("SELECT COUNT(*) FROM notificaciones WHERE audiencia='alumnos'")).rows[0].count), 0);
  assert.equal((await enviar('PUT', `/convocatorias/${id}`, { fecha: '2099-01-20', hora: '11:00' }, 2)).status, 200);
  assert.equal((await enviar('POST', `/convocatorias/${id}/enviar`, {})).status, 409);
  assert.equal((await enviar('POST', `/convocatorias/${id}/solicitar-revision`, {}, 2)).status, 200);
  assert.equal((await enviar('POST', `/convocatorias/${id}/enviar`, {})).status, 200);
  await vencerBloque(id);
  c = (await enviar('GET', '/convocatorias/1', null, 2)).datos[0];
  assert.equal(c.estado_revision, 'aprobado');
  assert.equal(c.enviada, true);
});

test('PBI-12: un bloque vence al consultar o editar; fecha y hora pasadas no permiten solicitar revisión', async () => {
  const id = await prepararBloquePendiente();
  await vencerBloque(id);
  const listado = await enviar('GET', '/convocatorias/1', null, 2);
  assert.equal(listado.datos[0].estado_revision, 'vencido');
  assert.ok(new Date(listado.datos[0].fecha_evaluacion) < new Date());
  assert.equal((await enviar('PUT', `/convocatorias/${id}`, { lugar: 'Salón' }, 2)).status, 200);
  assert.equal((await enviar('POST', `/convocatorias/${id}/solicitar-revision`, {}, 2)).status, 400);
  await testPool.query("UPDATE convocatorias SET estado_revision='pendiente' WHERE id_convocatoria=$1", [id]);
  assert.equal((await enviar('PUT', `/convocatorias/${id}`, { fecha: '2099-01-20', hora: '12:00' }, 2)).status, 200);
  assert.equal((await enviar('POST', `/convocatorias/${id}/solicitar-revision`, {}, 2)).status, 200);
});

test('PBI-12: un bloque que aún no empieza en hora de México sigue pendiente', async () => {
  const id = await prepararBloquePendiente();
  const futuro = (await testPool.query(`UPDATE convocatorias SET
    fecha = ((clock_timestamp() AT TIME ZONE 'America/Mexico_City') + interval '1 hour')::date,
    hora = ((clock_timestamp() AT TIME ZONE 'America/Mexico_City') + interval '1 hour')::time
    WHERE id_convocatoria=$1 RETURNING ((fecha + hora) AT TIME ZONE 'America/Mexico_City') AS instante`, [id])).rows[0].instante;
  const listado = await enviar('GET', '/convocatorias/1', null, 2);
  assert.equal(listado.datos[0].estado_revision, 'pendiente');
  assert.equal(new Date(listado.datos[0].fecha_evaluacion).getTime(), futuro.getTime());
  assert.ok(futuro > new Date());
  assert.equal((await enviar('POST', `/convocatorias/${id}/enviar`, {})).status, 200);
});

test('PBI-12: el presidente prepara bloques sin convocar alumnos y admin publica después de revisión', async () => {
  await testPool.query("INSERT INTO formularios(id_club,id_alumno,nombre_completo,status) VALUES (1,4,'Alumno','Preseleccionado')");
  assert.equal((await enviar('POST','/convocatorias/generar',{id_club:1},2)).status,200);
  assert.equal((await enviar('POST','/convocatorias/generar',{id_club:1},2)).status,409);
  const id = (await testPool.query('SELECT id_convocatoria FROM convocatorias')).rows[0].id_convocatoria;
  assert.equal((await enviar('POST','/convocatorias/'+id+'/enviar',{})).status,409);
  assert.equal((await enviar('POST','/convocatorias/'+id+'/solicitar-revision',{},2)).status,400);
  assert.equal((await enviar('PUT','/convocatorias/'+id,{fecha:'2099-02-30',hora:'10:00',lugar:'Cancha'},2)).status,400);
  assert.equal((await enviar('PUT','/convocatorias/'+id,{fecha:'2099-01-20',hora:'10:00',lugar:'Cancha principal'},2,3)).status,404);
  assert.equal((await enviar('PUT','/convocatorias/'+id,{fecha:'2099-01-20',hora:'10:00',lugar:'Cancha principal'},2)).status,200);
  assert.equal((await enviar('POST','/convocatorias/'+id+'/solicitar-revision',{},2)).status,200);
  assert.equal((await enviar('PUT','/convocatorias/'+id,{lugar:'Otro'},2)).status,409);
  assert.equal((await testPool.query('SELECT status FROM formularios')).rows[0].status,'Preseleccionado');
  assert.equal(Number((await testPool.query("SELECT COUNT(*) FROM notificaciones WHERE audiencia = 'alumnos'")).rows[0].count),0);
  const respuestas = await Promise.all([enviar('POST','/convocatorias/'+id+'/enviar',{}),enviar('POST','/convocatorias/'+id+'/enviar',{},3,7)]);
  assert.deepEqual(respuestas.map((r) => r.status).sort(),[200,409]);
  assert.equal(Number((await testPool.query("SELECT COUNT(*) FROM notificaciones WHERE audiencia = 'alumnos'")).rows[0].count),1);
  assert.equal((await testPool.query('SELECT status FROM formularios')).rows[0].status,'Convocado');
  assert.equal((await testPool.query('SELECT estado_revision FROM convocatorias')).rows[0].estado_revision,'aprobado');
  assert.equal((await enviar('PUT','/convocatorias/'+id,{lugar:'Otro lugar'},2)).status,409);
});

test('PBI-12: bloques devueltos requieren corrección y nueva solicitud; admin no puede editar al presidente', async () => {
  await testPool.query("INSERT INTO convocatorias(id_club,id_presidente,bloque,periodo,fecha,hora,lugar,estado_revision) VALUES (1,2,'A','Prueba','2099-01-01','10:00','Salón','pendiente')");
  assert.equal((await enviar('PUT','/convocatorias/1',{lugar:'Otro'},3)).status,403);
  assert.equal((await enviar('POST','/convocatorias/1/rechazar',{})).status,400);
  assert.equal((await enviar('POST','/convocatorias/1/rechazar',{observaciones:'Ajusta la hora'})).status,200);
  assert.equal((await enviar('POST','/convocatorias/1/enviar',{})).status,409);
  assert.equal((await enviar('PUT','/convocatorias/1',{hora:'11:00'},2)).status,200);
  assert.equal((await enviar('POST','/convocatorias/1/solicitar-revision',{},2)).status,200);
  assert.equal((await testPool.query('SELECT estado_revision FROM convocatorias')).rows[0].estado_revision,'pendiente');
  assert.equal(Number((await testPool.query("SELECT COUNT(*) FROM notificaciones WHERE audiencia='club'")).rows[0].count),0);
});

test('PBI-12: la ruta antigua de estatus no permite convocar sin aprobación', async () => {
  await testPool.query("INSERT INTO formularios(id_club,id_alumno,nombre_completo,status) VALUES (1,4,'Alumno','Preseleccionado')");
  for (const rol of [2,5]) assert.equal((await enviar('PUT','/formularios/1/estatus',{status:'Convocado'},rol)).status,409);
  for (const rol of [null,1,3,4]) assert.equal((await enviar('PUT','/formularios/1/estatus',{status:'Convocado'},rol)).status,rol ? 403 : 401);
  assert.equal((await testPool.query('SELECT status FROM formularios')).rows[0].status,'Preseleccionado');
});

test('PBI-13: la propuesta solo puede crearla el presidente de su club y solo admin puede revisar', async () => {
  for (const rol of [null,1,3,4,5]) assert.equal((await enviar('POST','/horarios/solicitudes/club/1',propuesta(),rol)).status,rol ? 403 : 401);
  assert.equal((await enviar('POST','/horarios/solicitudes/club/2',propuesta(),2)).status,403);
  for (const rol of [null,1,2,4,5]) assert.equal((await enviar('POST','/horarios/solicitudes/1/revision',{accion:'aprobar'},rol)).status,rol ? 403 : 401);
  for (const [method,ruta] of [['POST','/horarios/club/1'],['PUT','/horarios/1'],['DELETE','/horarios/1']]) assert.equal((await enviar(method,ruta,propuesta(),2)).status,409);
  assert.equal((await enviar('GET','/horarios/solicitudes/club/2',null,2)).status,403);
  assert.equal((await enviar('GET','/horarios/solicitudes',null,null)).status,401);
});

test('PBI-13: borrador y pendiente son privados; aprobación publica y edición posterior conserva la versión oficial', async () => {
  const s = await crearEnviar();
  assert.deepEqual((await enviar('GET','/horarios/club/1',null,null)).datos,[]);
  assert.equal((await enviar('POST',`/horarios/solicitudes/${s.id_solicitud}/revision`,{accion:'aprobar'})).status,200);
  assert.equal((await enviar('GET','/horarios/club/1',null,null)).datos[0].hora_inicio,'09:00:00');
  const nueva = await crearEnviar(1,{detalle:[{...sesion,hora_inicio:'11:00',hora_fin:'12:00'}]});
  assert.equal((await enviar('GET','/horarios/club/1',null,null)).datos[0].hora_inicio,'09:00:00');
  assert.equal((await enviar('POST',`/horarios/solicitudes/${nueva.id_solicitud}/revision`,{accion:'rechazar'})).status,400);
  assert.equal((await enviar('POST',`/horarios/solicitudes/${nueva.id_solicitud}/revision`,{accion:'rechazar',observaciones:'Revisar disponibilidad'})).status,200);
  assert.equal((await enviar('GET','/horarios/club/1',null,null)).datos[0].hora_inicio,'09:00:00');
  assert.ok((await testPool.query('SELECT * FROM notificaciones WHERE id_destinatario = 2')).rows.length);
  assert.ok((await testPool.query('SELECT * FROM historial_solicitudes_horario')).rows.length >= 5);
});

test('PBI-13: rechaza traslapes internos y valida edición y retirada de una solicitud pendiente', async () => {
  assert.equal((await enviar('POST','/horarios/solicitudes/club/1',propuesta({detalle:[sesion,{...sesion,hora_inicio:'09:30',hora_fin:'10:30'}]}),2)).status,400);
  const s = await crearEnviar();
  assert.equal((await enviar('PUT',`/horarios/solicitudes/${s.id_solicitud}`,propuesta(),2)).status,409);
  assert.equal((await enviar('POST',`/horarios/solicitudes/${s.id_solicitud}/retirar`,{},2)).status,200);
  assert.equal((await enviar('POST',`/horarios/solicitudes/${s.id_solicitud}/revision`,{accion:'aprobar'})).status,409);
  assert.equal((await enviar('PUT',`/horarios/solicitudes/${s.id_solicitud}`,propuesta({detalle:[{...sesion,hora_fin:'08:00'}]}),2)).status,400);
});

test('PBI-13: dos aprobaciones simultáneas del mismo espacio y franja solo permiten una reserva', async () => {
  const a = await crearEnviar(1);
  const b = await crearEnviar(2);
  const respuestas = await Promise.all([enviar('POST',`/horarios/solicitudes/${a.id_solicitud}/revision`,{accion:'aprobar'}),enviar('POST',`/horarios/solicitudes/${b.id_solicitud}/revision`,{accion:'aprobar'},3,7)]);
  assert.deepEqual(respuestas.map((r) => r.status).sort(),[200,409]);
  assert.equal(Number((await testPool.query('SELECT COUNT(*) FROM horarios_club')).rows[0].count),1);
});

test('PBI-13: franjas consecutivas no generan falsos conflictos', async () => {
  const a = await crearEnviar(1);
  assert.equal((await enviar('POST',`/horarios/solicitudes/${a.id_solicitud}/revision`,{accion:'aprobar'})).status,200);
  const b = await crearEnviar(2,{detalle:[{...sesion,hora_inicio:'10:00',hora_fin:'11:00'}]});
  assert.equal((await enviar('POST',`/horarios/solicitudes/${b.id_solicitud}/revision`,{accion:'aprobar'})).status,200);
  assert.equal(validarPropuesta(propuesta({vigencia_inicio:'2027-02-29'})), 'Selecciona una fecha de inicio válida');
});

test('PBI-13: dos clubes pueden usar la misma franja en vigencias que no coinciden', async () => {
  const a = await crearEnviar(1, { vigencia_fin: hoy });
  assert.equal((await enviar('POST', `/horarios/solicitudes/${a.id_solicitud}/revision`, { accion: 'aprobar' })).status, 200);
  const manana = new Date(`${hoy}T12:00:00Z`); manana.setUTCDate(manana.getUTCDate() + 1);
  const b = await crearEnviar(2, { vigencia_inicio: manana.toISOString().slice(0, 10) });
  assert.equal((await enviar('POST', `/horarios/solicitudes/${b.id_solicitud}/revision`, { accion: 'aprobar' })).status, 200);
});

test('PBI-13: un reemplazo futuro conserva el horario actual hasta su inicio de vigencia', async () => {
  const a = await crearEnviar();
  await enviar('POST',`/horarios/solicitudes/${a.id_solicitud}/revision`,{accion:'aprobar'});
  const futuro = new Date(`${hoy}T12:00:00Z`); futuro.setUTCDate(futuro.getUTCDate()+14);
  const inicio = futuro.toISOString().slice(0,10);
  const b = await crearEnviar(1,{vigencia_inicio:inicio,detalle:[{...sesion,hora_inicio:'15:00',hora_fin:'16:00'}]});
  assert.equal((await enviar('POST',`/horarios/solicitudes/${b.id_solicitud}/revision`,{accion:'aprobar'})).status,200);
  const oficiales = (await enviar('GET','/horarios/club/1',null,null)).datos;
  assert.equal(oficiales.length,1); assert.equal(oficiales[0].hora_inicio,'09:00:00');
});

test('PBI-13: días y horas son recurrentes sin caducidad semanal por defecto', async () => {
  const s = await crearEnviar(1, { detalle: [sesion, { ...sesion, dia_semana: 3 }] });
  assert.equal((await enviar('POST','/horarios/solicitudes/'+s.id_solicitud+'/revision',{accion:'aprobar'})).status,200);
  const oficiales = (await enviar('GET','/horarios/club/1',null,null)).datos;
  assert.deepEqual(oficiales.map(h=>h.dia_semana).sort(),[1,3]);
  assert.ok(oficiales.every(h=>h.vigencia_fin === null));
  assert.equal(Number((await testPool.query("SELECT COUNT(*) FROM horarios_club WHERE COALESCE(vigencia_fin, 'infinity'::date) >= CURRENT_DATE + 180")).rows[0].count),2);
});
