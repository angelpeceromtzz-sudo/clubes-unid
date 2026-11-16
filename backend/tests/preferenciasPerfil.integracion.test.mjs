import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';
import pg from 'pg';

const dbUrl = process.env.CLUBS_TEST_DATABASE_URL;
if (dbUrl) {
  const url = new URL(dbUrl);
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname));
  assert.ok(decodeURIComponent(url.pathname).endsWith('_pruebas'));
}
process.env.JWT_SECRET = 'preferencias-historicas-solo-pruebas';
process.env.DB_PASSWORD ??= 'preferencias-pruebas';
process.env.RATE_LIMIT_PREFERENCIAS_MINUTO = '1000';
const { default: pool } = await import('../db.js');
const { default: rutas } = await import('../routes/preferencias.js');
const { default: express } = await import('express');
const { default: jwt } = await import('jsonwebtoken');
const migracion = readFileSync(new URL('../migrations/migrate-onboarding-preferencias.sql', import.meta.url), 'utf8');

describe('edición de preferencias sin reescribir contexto académico', { skip: !dbUrl && 'CLUBS_TEST_DATABASE_URL no definida', concurrency: false }, () => {
  const esquema = `perfil_test_${randomUUID().replaceAll('-', '')}`;
  let cliente, servidor, base;
  const originalQuery = pool.query;
  const originalConnect = pool.connect;
  before(async () => {
    cliente = new pg.Client({ connectionString: dbUrl, connectionTimeoutMillis: 5000 });
    await cliente.connect();
    await cliente.query(`CREATE SCHEMA "${esquema}"; SET search_path TO "${esquema}", public`);
    await cliente.query(`CREATE TABLE usuarios(id_usuario INT PRIMARY KEY,nombre_completo TEXT,id_rol INT,deleted_at TIMESTAMPTZ);
      CREATE TABLE cat_licenciaturas(id_licenciatura INT PRIMARY KEY,nombre TEXT);
      CREATE TABLE periodos_actividad(id_periodo INT PRIMARY KEY,nombre TEXT,fecha_inicio DATE,fecha_fin DATE,activo BOOLEAN);
      INSERT INTO cat_licenciaturas VALUES (1,'Ingeniería');
      INSERT INTO periodos_actividad VALUES (1,'Periodo anterior','2000-01-01','2000-04-30',false),(2,'Periodo vigente','2020-01-01','2099-12-31',false)`);
    await cliente.query(migracion);
    pool.query = (sql, valores) => cliente.query(sql, valores);
    pool.connect = async () => ({ query: pool.query, release() {} });
    const app = express();
    app.use(express.json());
    app.use('/api/me', rutas);
    servidor = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => servidor.once('listening', resolve));
    base = `http://127.0.0.1:${servidor.address().port}/api/me/preferencias`;
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
    await cliente.query("TRUNCATE usuarios CASCADE; INSERT INTO usuarios VALUES (1,'Alumna de prueba',1,NULL)");
  });
  function cuerpo(extra = {}) {
    return { origen: 'perfil', categorias: [], actividades: [], motivaciones: [], genero: 'mujer', propuestas: [],
      correo: { activo: false, frecuencia: 'inmediata', tipos: { clubes_convocatorias: false, mis_clubes: false, eventos: false, noticias: false, recordatorios: false } }, ...extra };
  }
  async function guardar(datos) {
    const respuesta = await fetch(base, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign({ id: 1 }, process.env.JWT_SECRET)}` }, body: JSON.stringify(datos) });
    return { estado: respuesta.status, datos: await respuesta.json() };
  }
  async function fila() { return (await cliente.query('SELECT * FROM preferencias_usuario WHERE id_usuario=1')).rows[0]; }
  test('un completado con periodo histórico edita preferencias sin moverlo al vigente', async () => {
    await cliente.query("INSERT INTO preferencias_usuario(id_usuario,estado_onboarding,id_licenciatura,id_periodo_ingreso) VALUES (1,'completado',1,1)");
    const respuesta = await guardar(cuerpo({ id_licenciatura: 1, id_periodo_ingreso: 1 }));
    assert.equal(respuesta.estado, 200);
    assert.equal((await fila()).id_periodo_ingreso, 1);
    assert.equal((await fila()).genero, 'mujer');
    assert.equal(respuesta.datos.periodo_actual_id, 2);
  });
  test('un completado antiguo con datos académicos vacíos no recibe datos inventados', async () => {
    await cliente.query("INSERT INTO preferencias_usuario(id_usuario,estado_onboarding) VALUES (1,'completado')");
    assert.equal((await guardar(cuerpo())).estado, 200);
    assert.equal((await fila()).id_licenciatura, null);
    assert.equal((await fila()).id_periodo_ingreso, null);
  });
  test('origen perfil no permite saltarse los datos obligatorios del onboarding pendiente', async () => {
    await cliente.query("INSERT INTO preferencias_usuario(id_usuario,estado_onboarding) VALUES (1,'pendiente')");
    assert.equal((await guardar(cuerpo())).estado, 400);
    assert.equal((await fila()).estado_onboarding, 'pendiente');
    await cliente.query('DELETE FROM preferencias_usuario WHERE id_usuario=1');
    assert.equal((await guardar(cuerpo())).estado, 400);
    assert.equal(await fila(), undefined);
  });
  test('los ids manipulados o la repetición del onboarding no sobrescriben el contexto completado', async () => {
    await cliente.query("INSERT INTO preferencias_usuario(id_usuario,estado_onboarding,id_licenciatura,id_periodo_ingreso) VALUES (1,'completado',1,1)");
    const respuesta = await guardar(cuerpo({ origen: 'onboarding', id_licenciatura: 999, id_periodo_ingreso: 2 }));
    assert.equal(respuesta.estado, 200);
    assert.equal((await fila()).id_licenciatura, 1);
    assert.equal((await fila()).id_periodo_ingreso, 1);
  });
  test('una repetición tardía conserva el contexto completado por la primera petición', async () => {
    await cliente.query("INSERT INTO preferencias_usuario(id_usuario,estado_onboarding) VALUES (1,'pendiente')");
    const primera = await guardar(cuerpo({ origen: 'onboarding', id_licenciatura: 1, id_periodo_ingreso: 2 }));
    assert.equal(primera.estado, 200);
    const segunda = await guardar(cuerpo({ origen: 'onboarding', id_licenciatura: 999, id_periodo_ingreso: 1 }));
    assert.equal(segunda.estado, 200);
    assert.equal((await fila()).id_licenciatura, 1);
    assert.equal((await fila()).id_periodo_ingreso, 2);
  });
  test('un onboarding nuevo sigue exigiendo datos académicos válidos', async () => {
    assert.equal((await guardar(cuerpo({ origen: 'onboarding' }))).estado, 400);
    assert.equal((await guardar(cuerpo({ origen: 'onboarding', id_licenciatura: 1, id_periodo_ingreso: 1 }))).estado, 400);
    assert.equal((await guardar(cuerpo({ origen: 'onboarding', id_licenciatura: 1, id_periodo_ingreso: 2 }))).estado, 200);
    assert.equal((await fila()).estado_onboarding, 'completado');
    assert.equal((await fila()).id_periodo_ingreso, 2);
  });
});
