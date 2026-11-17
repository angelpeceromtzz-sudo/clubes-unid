import { before, after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import express from 'express';
import pg from 'pg';
import { crearRouterActividades } from '../lib/actividadesRouter.js';
import { crearLimitador, claveUsuario } from '../lib/rateLimits.js';

// Nunca usa .env ni la conexión de la aplicación. Cada ejecución crea y
// elimina exclusivamente un esquema aleatorio en la base explícita de QA.
const connectionString = process.env.ACTIVIDADES_TEST_DATABASE_URL;
describe('pase de lista de actividades con PostgreSQL', { skip: !connectionString }, () => {
  const esquema = 'asistencia_actividad_' + randomBytes(6).toString('hex');
  const bootstrap = new pg.Client({ connectionString });
  let db, servidor, base, idActividad, otraActividad;
  let fecha = '2026-12-05';

  const autenticar = async (req, res, next) => {
    const usuario = (await db.query('SELECT id_usuario AS id,id_rol FROM usuarios WHERE id_usuario=$1 AND deleted_at IS NULL', [Number(req.headers['x-usuario-qa']) || -1])).rows[0];
    if (!usuario) return res.status(401).json({ error: 'Sesión requerida' });
    req.user = usuario; next();
  };
  function crearApp(limitarEscritura) {
    const app = express();
    app.use(express.json());
    app.use('/api/actividades', crearRouterActividades({
      db, autenticar, hoy: () => fecha, limitarEscritura,
      subirImagen: { single: () => (_req, _res, next) => next(), array: () => (_req, _res, next) => next() },
    }));
    return app;
  }
  async function enviar(usuario, metodo, ruta, datos, esperado = 200, raiz = base) {
    const respuesta = await fetch(raiz + ruta, { method: metodo,
      headers: { 'Content-Type': 'application/json', ...(usuario ? { 'x-usuario-qa': String(usuario) } : {}) },
      ...(datos === undefined ? {} : { body: JSON.stringify(datos) }),
    });
    const cuerpo = await respuesta.json();
    assert.equal(respuesta.status, esperado, metodo + ' ' + ruta + ': ' + JSON.stringify(cuerpo));
    assert.match(respuesta.headers.get('cache-control'), /private, no-store/);
    return cuerpo;
  }
  async function edicion(cambios = {}) {
    const { rows } = await db.query(`INSERT INTO actividades_ediciones(id_actividad,nombre,lugar,
      fecha_inicio,fecha_fin,hora_inicio,requiere_registro,estado,inscripcion_desde,inscripcion_hasta)
      VALUES($1,'Edición de prueba','Campus QA',$2,$3,'23:59',$4,$5,'2026-11-01',$6) RETURNING id_edicion`,
    [cambios.id_actividad || idActividad, cambios.fecha_inicio || '2026-12-05',
      cambios.fecha_fin === undefined ? '2026-12-06' : cambios.fecha_fin,
      cambios.requiere_registro !== false, cambios.estado || 'publicada', cambios.inscripcion_hasta || '2026-12-04']);
    return rows[0].id_edicion;
  }
  async function inscribir(idEdicion, usuario = 1, estado = 'confirmado') {
    return (await db.query(`INSERT INTO actividades_registros(id_edicion,id_usuario,nombre_completo,matricula,estado)
      SELECT $1,id_usuario,nombre_completo,institutional_id,$3 FROM usuarios WHERE id_usuario=$2 RETURNING id_registro`, [idEdicion, usuario, estado])).rows[0].id_registro;
  }
  const acceso = (idEdicion, usuario = 2) => enviar(usuario, 'POST', '/gestion/ediciones/' + idEdicion + '/asistencia/acceso', {});
  const marcar = (idEdicion, codigo, usuario = 1, origen = 'codigo', esperado = 200) =>
    enviar(usuario, 'POST', '/ediciones/' + idEdicion + '/asistencia', { codigo, origen }, esperado);

  before(async () => {
    await bootstrap.connect();
    await bootstrap.query('CREATE SCHEMA ' + esquema);
    await bootstrap.query('SET search_path TO ' + esquema);
    await bootstrap.query(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
    await bootstrap.query(`INSERT INTO usuarios(id_usuario,nombre_completo,institutional_id,id_rol,correo_institucional)
      SELECT id,'Persona QA '||id,lpad(id::text,8,'0'),rol,'asistencia'||id||'@example.test'
      FROM (VALUES(1,1),(2,2),(3,3),(4,4),(7,7),(11,1),(12,1),(13,1),(22,1)) AS u(id,rol)`);
    db = new pg.Pool({ connectionString, max: 12, options: '-c search_path=' + esquema });
    servidor = crearApp().listen(0, '127.0.0.1');
    await new Promise((resolve) => servidor.once('listening', resolve));
    base = 'http://127.0.0.1:' + servidor.address().port + '/api/actividades';
    const actividad = await enviar(3, 'POST', '/gestion/actividades', { nombre: 'Evento asistencia QA', descripcion: 'Pruebas del pase de lista', categoria: 'Cultural' }, 201);
    idActividad = actividad.id_actividad;
    const otra = await enviar(3, 'POST', '/gestion/actividades', { nombre: 'Otro evento asistencia QA', descripcion: 'Otra actividad', categoria: 'Cultural' }, 201);
    otraActividad = otra.id_actividad;
    await db.query("UPDATE catalogo_recursos SET estado='publicada',id_responsable=2 WHERE id_actividad=$1", [idActividad]);
    await db.query("UPDATE catalogo_recursos SET estado='publicada',id_responsable=22 WHERE id_actividad=$1", [otraActividad]);
  });
  after(async () => {
    if (servidor) await new Promise((resolve, reject) => servidor.close((error) => error ? reject(error) : resolve()));
    if (db) await db.end();
    await bootstrap.query('ROLLBACK');
    await bootstrap.query('DROP SCHEMA IF EXISTS ' + esquema + ' CASCADE');
    await bootstrap.end();
  });

  test('acceso estable y privado, permisos de encargado y supervisores, sin filtración en catálogo o bitácora', async () => {
    const id = await edicion();
    await enviar(null, 'POST', `/gestion/ediciones/${id}/asistencia/acceso`, {}, 401);
    for (const usuario of [1, 11, 22]) {
      await enviar(usuario, 'POST', `/gestion/ediciones/${id}/asistencia/acceso`, {}, 403);
      await enviar(usuario, 'GET', `/gestion/ediciones/${id}/asistencia`, undefined, 403);
    }
    const codigos = await Promise.all(Array.from({ length: 5 }, () => acceso(id)));
    assert.ok(codigos.every((fila) => fila.codigo === codigos[0].codigo));
    assert.match(codigos[0].codigo, /^[A-HJ-NP-Z2-9]{8}$/);
    for (const usuario of [3, 4, 7]) assert.equal((await acceso(id, usuario)).codigo, codigos[0].codigo);
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM actividades_asistencia_accesos WHERE id_edicion=$1', [id])).rows[0].n, 1);
    const eventos = (await db.query("SELECT detalles FROM actividad_clubes WHERE tipo_evento='asistencia_acceso_creado' AND id_edicion=$1", [id])).rows;
    assert.equal(eventos.length, 1);
    for (const respuesta of [await enviar(null, 'GET', '/'), await enviar(null, 'GET', '/detalle/evento-asistencia-qa'), eventos]) {
      assert.ok(!JSON.stringify(respuesta).includes(codigos[0].codigo));
    }
  });

  test('registro propio automático con inscripciones cerradas y datos personales reutilizados', async () => {
    const id = await edicion();
    const idRegistro = await inscribir(id);
    await inscribir(id, 11);
    const { codigo } = await acceso(id);
    const antes = (await db.query('SELECT * FROM actividades_registros WHERE id_registro=$1', [idRegistro])).rows[0];
    const marca = await enviar(1, 'POST', `/ediciones/${id}/asistencia`, { codigo: codigo.toLowerCase(), origen: 'qr', id_usuario: 11 });
    assert.equal(marca.asistencia.estado, 'presente');
    assert.equal(marca.asistencia.origen, 'qr');
    assert.ok(Number.isFinite(Date.parse(marca.asistencia.registrada_en)));
    assert.deepEqual(await marcar(id, codigo), marca);
    const propia = await enviar(1, 'GET', `/ediciones/${id}/mi-asistencia`);
    assert.deepEqual(propia.asistencia, marca.asistencia);
    assert.equal(propia.disponibilidad, 'disponible');
    assert.equal((await enviar(11, 'GET', `/ediciones/${id}/mi-asistencia`)).asistencia, null);
    assert.deepEqual((await enviar(1, 'GET', `/ediciones/${id}/mi-registro`)).asistencia, marca.asistencia);
    assert.deepEqual((await enviar(1, 'GET', '/mis-registros')).find((fila) => fila.id_edicion === id).asistencia, marca.asistencia);
    assert.deepEqual((await db.query('SELECT * FROM actividades_registros WHERE id_registro=$1', [idRegistro])).rows[0], antes);
    const lista = await enviar(2, 'GET', `/gestion/ediciones/${id}/asistencia`);
    assert.deepEqual(lista.totales, { inscritos: 2, asistentes: 1, sin_asistencia: 1 });
    assert.equal(lista.registros.find((fila) => fila.id_registro === idRegistro).asistencia.actor_nombre, 'Persona QA 1');
  });

  test('rechaza cuentas sin inscripción confirmada, inactivas y códigos incorrectos sin crear marcas', async () => {
    const id = await edicion();
    await inscribir(id, 1);
    await inscribir(id, 11, 'cancelado');
    await inscribir(id, 12, 'pendiente_completar');
    await inscribir(id, 13);
    const { codigo } = await acceso(id);
    await marcar(id, codigo, null, 'qr', 401);
    await marcar(id, codigo, 22, 'qr', 403);
    await marcar(id, codigo, 11, 'qr', 403);
    await marcar(id, codigo, 12, 'qr', 403);
    await db.query('UPDATE usuarios SET deleted_at=NOW() WHERE id_usuario=13');
    await marcar(id, codigo, 13, 'qr', 401);
    await db.query('UPDATE usuarios SET deleted_at=NULL WHERE id_usuario=13');
    for (const invalido of [null, {}, '123', codigo === 'AAAAAAAA' ? 'BBBBBBBB' : 'AAAAAAAA']) await marcar(id, invalido, 1, 'codigo', 400);
    await marcar(id, codigo, 1, 'manual', 400);
    await enviar(1, 'POST', `/ediciones/${id}/asistencia`, {}, 400);
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM actividades_asistencias a JOIN actividades_registros r USING(id_registro) WHERE r.id_edicion=$1', [id])).rows[0].n, 0);
  });

  test('respeta publicación y fechas inclusivas, incluso en una edición de un solo día', async () => {
    const id = await edicion();
    await inscribir(id);
    const { codigo } = await acceso(id);
    fecha = '2026-12-04'; await marcar(id, codigo, 1, 'qr', 409);
    fecha = '2026-12-05'; await marcar(id, codigo);
    fecha = '2026-12-06'; await inscribir(id, 11); await marcar(id, codigo, 11);
    fecha = '2026-12-07'; await inscribir(id, 12); await marcar(id, codigo, 12, 'codigo', 409);
    fecha = '2026-12-05';
    const soloDia = await edicion({ fecha_fin: null });
    await inscribir(soloDia); const codigoDia = (await acceso(soloDia)).codigo;
    await marcar(soloDia, codigoDia);
    fecha = '2026-12-06'; await inscribir(soloDia, 11); await marcar(soloDia, codigoDia, 11, 'qr', 409);
    fecha = '2026-12-05';
    for (const estado of ['borrador', 'pendiente', 'rechazada', 'archivada']) {
      await db.query('UPDATE actividades_ediciones SET estado=$1 WHERE id_edicion=$2', [estado, id]);
      await marcar(id, codigo, 12, 'qr', 409);
      await enviar(2, 'POST', `/gestion/ediciones/${id}/asistencia/acceso`, {}, 409);
    }
    await db.query("UPDATE actividades_ediciones SET estado='publicada' WHERE id_edicion=$1", [id]);
    await db.query("UPDATE catalogo_recursos SET estado='archivada' WHERE id_actividad=$1", [idActividad]);
    await marcar(id, codigo, 12, 'qr', 409);
    await db.query("UPDATE catalogo_recursos SET estado='publicada' WHERE id_actividad=$1", [idActividad]);
    const informativa = await edicion({ requiere_registro: false });
    await enviar(2, 'POST', `/gestion/ediciones/${informativa}/asistencia/acceso`, {}, 409);
    await marcar(informativa, 'ABCD2345', 1, 'qr', 409);
  });

  test('los reintentos concurrentes guardan una sola marca, fecha y evento de bitácora', async () => {
    const id = await edicion();
    const idRegistro = await inscribir(id);
    const { codigo } = await acceso(id);
    const marcas = await Promise.all(Array.from({ length: 8 }, (_valor, indice) => marcar(id, codigo, 1, indice % 2 ? 'qr' : 'codigo')));
    assert.ok(marcas.every((marca) => JSON.stringify(marca) === JSON.stringify(marcas[0])));
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM actividades_asistencias WHERE id_registro=$1', [idRegistro])).rows[0].n, 1);
    assert.equal((await db.query("SELECT COUNT(*)::int AS n FROM actividad_clubes WHERE tipo_evento='asistencia_registrada' AND detalles->>'id_registro'=$1", [String(idRegistro)])).rows[0].n, 1);
  });

  test('corrección manual con motivo, fuera de fechas, sin permitir que un alumno deshaga una anulación', async () => {
    const id = await edicion();
    const idRegistro = await inscribir(id);
    const { codigo } = await acceso(id);
    const ruta = `/gestion/ediciones/${id}/asistencia/${idRegistro}`;
    await enviar(1, 'PUT', ruta, { estado: 'presente', motivo: 'Intento ajeno' }, 403);
    for (const motivo of ['', '   ', null, 'A'.repeat(501)]) await enviar(2, 'PUT', ruta, { estado: 'presente', motivo }, 400);
    await enviar(2, 'PUT', ruta, { estado: 'ausente', motivo: 'Estado ajeno' }, 400);
    const ajena = await edicion({ id_actividad: otraActividad });
    const registroAjeno = await inscribir(ajena);
    await enviar(2, 'PUT', `/gestion/ediciones/${id}/asistencia/${registroAjeno}`, { estado: 'presente', motivo: 'No corresponde' }, 404);
    fecha = '2026-12-07';
    const manual = await enviar(2, 'PUT', ruta, { estado: 'presente', motivo: 'Llegó sin teléfono' });
    assert.equal(manual.asistencia.origen, 'manual');
    assert.deepEqual(await enviar(2, 'PUT', ruta, { estado: 'presente', motivo: 'Reintento' }), manual);
    await enviar(2, 'PUT', ruta, { estado: 'anulada', motivo: 'Se capturó a otra persona' });
    fecha = '2026-12-05';
    await marcar(id, codigo, 1, 'qr', 409);
    const restaurada = await enviar(2, 'PUT', ruta, { estado: 'presente', motivo: 'Se verificó la llegada personalmente' });
    assert.equal(restaurada.asistencia.estado, 'presente');
    const eventos = (await db.query("SELECT detalles FROM actividad_clubes WHERE tipo_evento='asistencia_corregida' AND detalles->>'id_registro'=$1 ORDER BY id_evento", [String(idRegistro)])).rows;
    assert.equal(eventos.length, 3);
    assert.equal(eventos[1].detalles.anterior.estado, 'presente');
    assert.equal(eventos[1].detalles.asistencia.estado, 'anulada');
    assert.equal(eventos[1].detalles.motivo, 'Se capturó a otra persona');
  });

  test('cancelar la inscripción y archivar la edición conservan la asistencia y sus conteos históricos', async () => {
    const id = await edicion({ inscripcion_hasta: '2026-12-06' });
    const idRegistro = await inscribir(id);
    const { codigo } = await acceso(id);
    const marca = await marcar(id, codigo);
    await enviar(1, 'DELETE', `/ediciones/${id}/registro`);
    assert.deepEqual((await enviar(1, 'GET', `/ediciones/${id}/mi-asistencia`)).asistencia, marca.asistencia);
    const lista = await enviar(2, 'GET', `/gestion/ediciones/${id}/asistencia`);
    assert.deepEqual(lista.totales, { inscritos: 0, asistentes: 1, sin_asistencia: 0 });
    assert.equal(lista.registros[0].estado_inscripcion, 'cancelado');
    await enviar(2, 'PUT', `/gestion/ediciones/${id}/asistencia/${idRegistro}`, { estado: 'presente', motivo: 'Intento sobre cancelada' }, 409);
    await db.query("UPDATE actividades_ediciones SET estado='archivada' WHERE id_edicion=$1", [id]);
    assert.deepEqual((await enviar(1, 'GET', `/ediciones/${id}/mi-asistencia`)).asistencia, marca.asistencia);
    assert.equal((await enviar(1, 'GET', '/mis-registros')).find((fila) => fila.id_edicion === id).asistencia.estado, 'presente');
    await assert.rejects(db.query('DELETE FROM actividades_registros WHERE id_registro=$1', [idRegistro]), (error) => ['23503', '23001'].includes(error.code));
  });

  test('reasignar la actividad revoca inmediatamente la lectura y las correcciones del encargado anterior', async () => {
    const id = await edicion();
    const idRegistro = await inscribir(id);
    await acceso(id);
    await enviar(7, 'PUT', `/gestion/actividades/${idActividad}/responsable`, { id_responsable: 22 });
    await enviar(2, 'GET', `/gestion/ediciones/${id}/asistencia`, undefined, 403);
    await enviar(2, 'POST', `/gestion/ediciones/${id}/asistencia/acceso`, {}, 403);
    await enviar(2, 'PUT', `/gestion/ediciones/${id}/asistencia/${idRegistro}`, { estado: 'presente', motivo: 'Ya no es encargado' }, 403);
    await enviar(22, 'GET', `/gestion/ediciones/${id}/asistencia`);
    await enviar(7, 'PUT', `/gestion/actividades/${idActividad}/responsable`, { id_responsable: 2 });
  });

  test('si falla la bitácora se revierte la generación del acceso y la asistencia', async () => {
    const id = await edicion();
    const idRegistro = await inscribir(id);
    await db.query(`CREATE FUNCTION rechazar_bitacora_asistencia() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.tipo_evento IN ('asistencia_acceso_creado','asistencia_registrada') THEN
        RAISE EXCEPTION 'Fallo simulado QA'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER rechazar_bitacora_asistencia BEFORE INSERT ON actividad_clubes
        FOR EACH ROW EXECUTE FUNCTION rechazar_bitacora_asistencia()`);
    try {
      await enviar(2, 'POST', `/gestion/ediciones/${id}/asistencia/acceso`, {}, 500);
      assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM actividades_asistencia_accesos WHERE id_edicion=$1', [id])).rows[0].n, 0);
      await db.query('ALTER TABLE actividad_clubes DISABLE TRIGGER rechazar_bitacora_asistencia');
      const { codigo } = await acceso(id);
      await db.query('ALTER TABLE actividad_clubes ENABLE TRIGGER rechazar_bitacora_asistencia');
      await marcar(id, codigo, 1, 'qr', 500);
      assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM actividades_asistencias WHERE id_registro=$1', [idRegistro])).rows[0].n, 0);
    } finally {
      await db.query('DROP TRIGGER rechazar_bitacora_asistencia ON actividad_clubes; DROP FUNCTION rechazar_bitacora_asistencia()');
    }
  });

  test('el registro usa el limitador de intentos por cuenta sin bloquear a otros alumnos del mismo evento', async () => {
    const id = await edicion();
    await inscribir(id); await inscribir(id, 11);
    const { codigo } = await acceso(id);
    const limite = crearLimitador({ identifier: 'asistencia-qa', windowMs: 60000, limit: 2, keyGenerator: claveUsuario });
    const limitado = crearApp(limite).listen(0, '127.0.0.1');
    await new Promise((resolve) => limitado.once('listening', resolve));
    const raiz = 'http://127.0.0.1:' + limitado.address().port + '/api/actividades';
    try {
      for (let i = 0; i < 2; i++) await enviar(1, 'POST', `/ediciones/${id}/asistencia`, { codigo: '123', origen: 'codigo' }, 400, raiz);
      await enviar(1, 'POST', `/ediciones/${id}/asistencia`, { codigo, origen: 'codigo' }, 429, raiz);
      await enviar(11, 'POST', `/ediciones/${id}/asistencia`, { codigo, origen: 'qr' }, 200, raiz);
    } finally { await new Promise((resolve) => limitado.close(resolve)); }
  });

  test('la migración aditiva y el esquema completo se pueden repetir conservando códigos, marcas e historial', async () => {
    const id = await edicion();
    const idRegistro = await inscribir(id);
    const codigo = (await acceso(id)).codigo;
    const marca = await marcar(id, codigo);
    const migracion = await readFile(new URL('../migrations/migrate-actividades-asistencia.sql', import.meta.url), 'utf8');
    await bootstrap.query(migracion);
    await bootstrap.query(migracion);
    await bootstrap.query(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
    assert.equal((await acceso(id)).codigo, codigo);
    assert.deepEqual((await enviar(1, 'GET', `/ediciones/${id}/mi-asistencia`)).asistencia, marca.asistencia);
    const fila = (await db.query('SELECT * FROM actividades_asistencias WHERE id_registro=$1', [idRegistro])).rows[0];
    assert.equal(fila.estado, 'presente');
    assert.equal((await db.query("SELECT COUNT(*)::int AS n FROM actividad_clubes WHERE tipo_evento='asistencia_registrada' AND detalles->>'id_registro'=$1", [String(idRegistro)])).rows[0].n, 1);
  });
});
