import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { before, beforeEach, after, describe, test } from 'node:test';
import pg from 'pg';

const dbUrl = process.env.CLUBS_TEST_DATABASE_URL;
if (dbUrl) {
  const url = new URL(dbUrl);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  assert.ok(decodeURIComponent(url.pathname).endsWith('_pruebas'));
}
process.env.JWT_SECRET = 'restantes-pruebas-locales-sin-credenciales';
process.env.DB_PASSWORD ??= 'restantes-pruebas';
const { default: pool } = await import('../db.js');
const { default: clubes } = await import('../routes/clubes.js');
const { default: inscripciones } = await import('../routes/inscripciones.js');
const { default: reconocimientos } = await import('../routes/reconocimientos.js');
const { default: preferencias } = await import('../routes/preferencias.js');
const { default: express } = await import('express');
const { default: jwt } = await import('jsonwebtoken');
const migracion = readFileSync(new URL('../migrations/migrate-reconocimientos.sql', import.meta.url), 'utf8');
const schema = readFileSync(new URL('../schema.sql', import.meta.url), 'utf8');
const marcador = schema.indexOf('CREATE TABLE IF NOT EXISTS reconocimientos_usuario (');
assert.ok(marcador > 0);
const bloqueSchema = schema.slice(marcador);

describe('bloques restantes con HTTP, autorización y PostgreSQL real', { skip: !dbUrl && 'CLUBS_TEST_DATABASE_URL no definida', concurrency: false }, () => {
  const esquema = `restantes_test_${randomUUID().replaceAll('-', '')}`;
  let cliente, servidor, base;
  const originalQuery = pool.query;
  const originalConnect = pool.connect;
  before(async () => {
    cliente = new pg.Client({ connectionString: dbUrl, connectionTimeoutMillis: 5000 });
    await cliente.connect();
    await cliente.query(`CREATE SCHEMA "${esquema}"`);
    await cliente.query(`SET search_path TO "${esquema}", public`);
    await cliente.query(`
      CREATE TABLE usuarios(id_usuario INT PRIMARY KEY,nombre_completo TEXT,id_rol INT,deleted_at TIMESTAMPTZ);
      CREATE TABLE noticias(id_noticia INT PRIMARY KEY,titulo TEXT,categoria TEXT);
      CREATE TABLE cat_estatus_clubes(id_estatus_club INT PRIMARY KEY,nombre_estatus TEXT);
      CREATE TABLE clubes(id_club INT PRIMARY KEY,nombre_club TEXT,descripcion TEXT,categoria TEXT,imagen_portada TEXT,id_estatus_club INT);
      CREATE TABLE preferencias_usuario(id_usuario INT PRIMARY KEY,estado_onboarding TEXT,id_licenciatura INT);
      CREATE TABLE cat_categorias_interes(id_categoria_interes INT PRIMARY KEY,nombre TEXT,categoria_club TEXT);
      CREATE TABLE usuario_categorias_interes(id_usuario INT,id_categoria_interes INT);
      CREATE TABLE cat_motivaciones(id_motivacion INT PRIMARY KEY,nombre TEXT);
      CREATE TABLE usuario_motivaciones(id_usuario INT,id_motivacion INT);
      CREATE TABLE cat_licenciaturas(id_licenciatura INT PRIMARY KEY,nombre TEXT);
      CREATE TABLE actividades_propuestas(id_propuesta SERIAL PRIMARY KEY,id_usuario INT,texto TEXT);
      CREATE TABLE cat_estatus_inscripciones(id_estatus_inscripcion INT PRIMARY KEY,nombre_estatus TEXT);
      CREATE TABLE inscripciones(id_inscripcion INT PRIMARY KEY,id_usuario INT,id_club INT,id_estatus_inscripcion INT,fecha_inscripcion TIMESTAMPTZ,fecha_baja TIMESTAMPTZ);
      CREATE TABLE periodos_actividad(id_periodo INT PRIMARY KEY,nombre TEXT,fecha_inicio DATE,fecha_fin DATE);
    `);
    await cliente.query(migracion);
    await cliente.query(migracion);
    pool.query = (sql, valores) => cliente.query(sql, valores);
    pool.connect = async () => ({ query: pool.query, release() {} });
    const app = express();
    app.use(express.json());
    app.use('/api/clubes', clubes);
    app.use('/api/inscripciones', inscripciones);
    app.use('/api/reconocimientos', reconocimientos);
    app.use('/api/me', preferencias);
    servidor = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => servidor.once('listening', resolve));
    base = `http://127.0.0.1:${servidor.address().port}/api`;
  });
  after(async () => {
    if (servidor) await new Promise((resolve) => servidor.close(resolve));
    pool.query = originalQuery;
    pool.connect = originalConnect;
    if (cliente) {
      try {
        await cliente.query('ROLLBACK').catch(() => {});
        await cliente.query(`DROP SCHEMA IF EXISTS "${esquema}" CASCADE`);
      } finally { await cliente.end(); }
    }
  });
  beforeEach(async () => {
    await cliente.query(`TRUNCATE reconocimientos_usuario,usuarios,noticias,clubes,cat_estatus_clubes,preferencias_usuario,
      cat_categorias_interes,usuario_categorias_interes,cat_motivaciones,usuario_motivaciones,
      cat_licenciaturas,actividades_propuestas,inscripciones,cat_estatus_inscripciones,periodos_actividad RESTART IDENTITY CASCADE`);
    await cliente.query(`
      INSERT INTO usuarios VALUES (1,'Alumna Uno',1,NULL),(20,'Alumno Dos',1,NULL),(30,'Administración',3,NULL),(40,'Rectoría',4,NULL),(70,'Coordinación',7,NULL),(50,'Responsable',2,NULL),(60,'Mural',6,NULL);
      INSERT INTO noticias VALUES (10,'Logro del campus','noticia');
      INSERT INTO cat_estatus_clubes VALUES (1,'activo'),(2,'proximamente'),(3,'inactivo');
      INSERT INTO clubes VALUES (1,'Fútbol','','Deportes',NULL,1),(2,'Voleibol','','Deportes',NULL,2),(3,'Teatro','','Cultura',NULL,1),(4,'Robótica','','Tecnología',NULL,1),(5,'Inactivo','','Cultura',NULL,3),(6,'Programación','','Tecnología',NULL,1),(7,'Lectura','','Cultura',NULL,1);
      INSERT INTO cat_categorias_interes VALUES (1,'Deportes','Deportes'),(2,'Cultura','Cultura');
      INSERT INTO cat_estatus_inscripciones VALUES (1,'activa'),(2,'baja');
    `);
  });
  async function pedir(ruta, usuario = 1, metodo = 'GET', datos) {
    const headers = { 'Content-Type': 'application/json' };
    if (usuario !== null) headers.Authorization = `Bearer ${jwt.sign({ id: usuario }, process.env.JWT_SECRET)}`;
    const respuesta = await fetch(base + ruta, { method: metodo, headers, body: datos === undefined ? undefined : JSON.stringify(datos) });
    return { estado: respuesta.status, datos: await respuesta.json() };
  }
  test('sugeridos sin preferencias responde cinco alternativas reales sin error de parámetros', async () => {
    const r = await pedir('/clubes/sugeridos');
    assert.equal(r.estado, 200);
    assert.deepEqual(r.datos.sugeridos, []);
    assert.equal(r.datos.alternativos.length, 5);
    assert.ok(r.datos.alternativos.every((fila) => fila.id_estatus_club !== 3));
  });
  test('sugeridos parciales completa sin duplicar ni incluir inactivos', async () => {
    await cliente.query("INSERT INTO preferencias_usuario VALUES (1,'completado',NULL); INSERT INTO usuario_categorias_interes VALUES (1,1)");
    const r = await pedir('/clubes/sugeridos');
    assert.equal(r.estado, 200);
    assert.deepEqual(r.datos.sugeridos.map((fila) => fila.id_club), [1, 2]);
    const todos = [...r.datos.sugeridos, ...r.datos.alternativos];
    assert.equal(todos.length, 5);
    assert.equal(new Set(todos.map((fila) => fila.id_club)).size, 5);
    assert.ok(todos.every((fila) => fila.id_estatus_club !== 3));
  });
  test('cinco sugeridos no añade alternativas y un catálogo vacío responde vacío', async () => {
    await cliente.query("INSERT INTO preferencias_usuario VALUES (1,'completado',NULL); INSERT INTO usuario_categorias_interes VALUES (1,1); INSERT INTO clubes VALUES (8,'Deporte 8','','Deportes',NULL,1),(9,'Deporte 9','','Deportes',NULL,1),(10,'Deporte 10','','Deportes',NULL,1)");
    const r = await pedir('/clubes/sugeridos');
    assert.equal(r.estado, 200);
    assert.equal(r.datos.sugeridos.length, 5);
    assert.deepEqual(r.datos.alternativos, []);
    await cliente.query('DELETE FROM clubes');
    const vacio = await pedir('/clubes/sugeridos');
    assert.equal(vacio.estado, 200);
    assert.deepEqual(vacio.datos, { sugeridos: [], alternativos: [] });
  });
  test('categorías coincidentes no duplican clubes y preferencias ajenas no se mezclan', async () => {
    await cliente.query("INSERT INTO preferencias_usuario VALUES (1,'completado',NULL); INSERT INTO cat_categorias_interes VALUES (3,'Otra deportiva','Deportes'); INSERT INTO usuario_categorias_interes VALUES (1,1),(1,3)");
    const r = await pedir('/clubes/sugeridos');
    assert.equal(r.estado, 200);
    const ids = [...r.datos.sugeridos, ...r.datos.alternativos].map((fila) => fila.id_club);
    assert.equal(ids.length, new Set(ids).size);
    const otro = await pedir('/clubes/sugeridos', 20);
    assert.equal(otro.estado, 200);
    assert.deepEqual(otro.datos.sugeridos, []);
  });
  test('historial incluye bajas, conserva fechas, aísla al alumno y no infiere periodos', async () => {
    await cliente.query("INSERT INTO periodos_actividad VALUES (1,'A','2026-01-01','2026-12-31'),(2,'B','2026-06-01','2027-01-31'); INSERT INTO inscripciones VALUES (1,1,1,1,'2026-07-01T15:00:00Z',NULL),(2,1,3,2,'2025-09-01T15:00:00Z','2025-12-01T15:00:00Z'),(3,20,4,1,'2026-07-01T15:00:00Z',NULL)");
    const r = await pedir('/inscripciones/mias?id_usuario=20');
    assert.equal(r.estado, 200);
    assert.equal(r.datos.length, 2);
    assert.deepEqual(new Set(r.datos.map((fila) => fila.id_inscripcion)), new Set([1, 2]));
    assert.equal(r.datos.find((fila) => fila.id_inscripcion === 2).fecha_baja, '2025-12-01T15:00:00.000Z');
    assert.ok(r.datos.every((fila) => fila.periodo_nombre == null));
  });
  test('reconocimientos exige sesión y limita el otorgamiento a roles autorizados', async () => {
    assert.equal((await pedir('/reconocimientos/mios', null)).estado, 401);
    for (const id of [1, 20, 50, 60]) assert.equal((await pedir('/reconocimientos', id, 'POST', { id_usuario: 1, codigo: 'LOGRO' })).estado, 403);
    for (const id of [30, 40, 70]) {
      const r = await pedir('/reconocimientos', id, 'POST', { id_usuario: 1, codigo: ' LOGRO ', id_noticia: 10 });
      assert.equal(r.estado, 201);
      assert.equal(r.datos.codigo, 'LOGRO');
      assert.equal(r.datos.otorgado_por, id);
    }
  });
  test('reconocimientos devuelve 400 ante datos inválidos y 404 ante referencias inexistentes', async () => {
    for (const datos of [
      {}, { id_usuario: '1', codigo: 'A' }, { id_usuario: -1, codigo: 'A' },
      { id_usuario: 2147483648, codigo: 'A' }, { id_usuario: 1, codigo: ' ' },
      { id_usuario: 1, codigo: 'A'.repeat(41) }, { id_usuario: 1, codigo: {} },
      { id_usuario: 1, codigo: 'A', descripcion: 'B'.repeat(201) },
      { id_usuario: 1, codigo: 'A', id_noticia: 1.5 },
      { id_usuario: 1, codigo: 'A', id_noticia: 2147483648 },
    ]) assert.equal((await pedir('/reconocimientos', 30, 'POST', datos)).estado, 400, JSON.stringify(datos));
    for (const datos of [{ id_usuario: 999, codigo: 'A' }, { id_usuario: 30, codigo: 'A' }, { id_usuario: 1, codigo: 'A', id_noticia: 999 }]) {
      assert.equal((await pedir('/reconocimientos', 30, 'POST', datos)).estado, 404);
    }
  });
  test('reconocimientos se persiste y solo aparece al destinatario con la noticia vinculada', async () => {
    assert.equal((await pedir('/reconocimientos', 30, 'POST', { id_usuario: 1, codigo: 'CAMPUS', descripcion: 'Participación', id_noticia: 10 })).estado, 201);
    const propios = await pedir('/reconocimientos/mios?id_usuario=20', 1);
    assert.equal(propios.estado, 200);
    assert.equal(propios.datos.length, 1);
    assert.equal(propios.datos[0].noticia_titulo, 'Logro del campus');
    assert.deepEqual((await pedir('/reconocimientos/mios', 20)).datos, []);
  });
  test('ruta canónica de preferencias responde agregados y respeta roles', async () => {
    for (const id of [1, 20, 50, 60]) assert.equal((await pedir('/me/preferencias/insights', id)).estado, 403);
    for (const id of [30, 40, 70]) {
      const r = await pedir('/me/preferencias/insights', id);
      assert.equal(r.estado, 200);
      for (const campo of ['estados', 'categorias', 'motivaciones', 'licenciaturas', 'propuestas']) assert.ok(Array.isArray(r.datos[campo]));
    }
  });
  test('migración real y schema real de reconocimientos son repetibles y equivalentes', async () => {
    await cliente.query(migracion);
    const columnas = async (nombre) => (await cliente.query("SELECT column_name,data_type,is_nullable,(column_default IS NOT NULL) AS tiene_default FROM information_schema.columns WHERE table_schema=$1 AND table_name='reconocimientos_usuario' ORDER BY ordinal_position", [nombre])).rows;
    const esperado = await columnas(esquema);
    const espejo = esquema + '_espejo';
    await cliente.query(`CREATE SCHEMA "${espejo}"`);
    try {
      await cliente.query(`SET search_path TO "${espejo}", public`);
      await cliente.query('CREATE TABLE usuarios(id_usuario INT PRIMARY KEY); CREATE TABLE noticias(id_noticia INT PRIMARY KEY)');
      await cliente.query(bloqueSchema);
      await cliente.query(bloqueSchema);
      assert.deepEqual(await columnas(espejo), esperado);
      const llaves = await cliente.query("SELECT count(*)::int AS total FROM pg_constraint WHERE conrelid='reconocimientos_usuario'::regclass AND contype='f'");
      assert.equal(llaves.rows[0].total, 3);
    } finally {
      await cliente.query(`SET search_path TO "${esquema}", public`);
      await cliente.query(`DROP SCHEMA "${espejo}" CASCADE`);
    }
  });
});
