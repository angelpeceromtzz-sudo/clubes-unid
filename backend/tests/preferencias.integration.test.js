// Integración del onboarding de preferencias contra una base PostgreSQL aislada.
//
// Solo se ejecuta si PREFERENCIAS_TEST_DB está definida. Por seguridad, el
// nombre debe terminar en "_pruebas" y no puede ser la base de desarrollo. La
// base debe tener aplicados backend/schema.sql y la migración correspondiente.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url) });

const BASE_PRUEBAS = process.env.PREFERENCIAS_TEST_DB;
const habilitado = Boolean(BASE_PRUEBAS);

if (habilitado && (!/_pruebas$/.test(BASE_PRUEBAS) || BASE_PRUEBAS === process.env.DB_NAME)) {
  throw new Error('PREFERENCIAS_TEST_DB debe terminar en "_pruebas" y no puede ser la base de desarrollo');
}

process.env.JWT_SECRET ??= 'preferencias-solo-pruebas';
process.env.RATE_LIMIT_PREFERENCIAS_MINUTO = '1000';

const ALUMNO_A = 9101;
const ALUMNO_B = 9102;
const PRESIDENTE = 9103;
const IDS_PRUEBA = [ALUMNO_A, ALUMNO_B, PRESIDENTE];

const correoApagado = {
  activo: false,
  frecuencia: 'inmediata',
  tipos: { clubes_convocatorias: false, mis_clubes: false, eventos: false, noticias: false, recordatorios: false },
};

let pool, testPool, queryOriginal, connectOriginal, servidor, baseUrl, token, catalogo;

function cuerpo(extra = {}) {
  return {
    origen: 'onboarding',
    categorias: [],
    actividades: [],
    motivaciones: [],
    genero: null,
    correo: correoApagado,
    propuestas: [],
    ...extra,
  };
}

async function peticion(metodo, ruta, { usuario, datos } = {}) {
  const cabeceras = { 'Content-Type': 'application/json' };
  if (usuario) cabeceras.Authorization = `Bearer ${token(usuario)}`;
  const res = await fetch(baseUrl + ruta, {
    method: metodo,
    headers: cabeceras,
    body: datos === undefined ? undefined : JSON.stringify(datos),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

function idPor(lista, campo, valor) {
  const item = lista.find((x) => x[campo] === valor);
  assert.ok(item, `No existe en el catálogo: ${valor}`);
  return item.id;
}

const idCategoria = (nombre) => idPor(catalogo.categorias, 'nombre', nombre);
const idActividad = (nombre) => idPor(catalogo.actividades, 'nombre', nombre);
const idMotivacion = (codigo) => idPor(catalogo.motivaciones, 'codigo', codigo);

async function contarHistorial(idUsuario) {
  const r = await testPool.query('SELECT count(*)::int AS n FROM historial_consentimiento_correo WHERE id_usuario = $1', [idUsuario]);
  return r.rows[0].n;
}

describe('onboarding de preferencias (integración)', { skip: habilitado ? false : 'PREFERENCIAS_TEST_DB no definida' }, () => {
  before(async () => {
    const { default: poolDesarrollo } = await import('../db.js');
    pool = poolDesarrollo;
    const host = process.env.DB_HOST || 'localhost';
    if (!['localhost', '127.0.0.1'].includes(host)) {
      throw new Error('La prueba de integración solo se ejecuta contra un PostgreSQL local');
    }
    testPool = new pg.Pool({
      host,
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: BASE_PRUEBAS,
      max: 5,
      connectionTimeoutMillis: 5000,
    });

    const verificacion = await testPool.query("SELECT to_regclass('public.preferencias_usuario') AS t");
    if (!verificacion.rows[0].t) {
      throw new Error('Aplica backend/schema.sql y la migración en la base de pruebas antes de ejecutar esta prueba');
    }

    queryOriginal = pool.query.bind(pool);
    connectOriginal = pool.connect.bind(pool);
    pool.query = (...args) => testPool.query(...args);
    pool.connect = (...args) => testPool.connect(...args);

    await testPool.query('DELETE FROM usuarios WHERE id_usuario = ANY($1::int[])', [IDS_PRUEBA]);
    await testPool.query(
      `INSERT INTO usuarios (id_usuario, nombre_completo, correo_institucional, id_rol) VALUES
       ($1, 'Alumno Prueba Uno', 'pref.prueba.1@test.local', 1),
       ($2, 'Alumno Prueba Dos', 'pref.prueba.2@test.local', 1),
       ($3, 'Presidente Prueba', 'pref.prueba.3@test.local', 2)`,
      [ALUMNO_A, ALUMNO_B, PRESIDENTE],
    );

    const jwt = (await import('jsonwebtoken')).default;
    token = (id) => jwt.sign({ id }, process.env.JWT_SECRET);

    const express = (await import('express')).default;
    const { default: preferenciasRoutes } = await import('../routes/preferencias.js');
    const { default: catalogosRoutes } = await import('../routes/catalogos.js');
    const app = express();
    app.use(express.json());
    app.use('/api/catalogos', catalogosRoutes);
    app.use('/api/me', preferenciasRoutes);
    await new Promise((resolver) => {
      servidor = app.listen(0, '127.0.0.1', resolver);
    });
    baseUrl = `http://127.0.0.1:${servidor.address().port}`;

    const respuesta = await peticion('GET', '/api/catalogos/intereses');
    catalogo = respuesta.json;
  });

  after(async () => {
    if (!habilitado) return;
    servidor?.closeAllConnections();
    await new Promise((resolver) => servidor?.close(resolver));
    await testPool?.query('DELETE FROM usuarios WHERE id_usuario = ANY($1::int[])', [IDS_PRUEBA]).catch(() => {});
    pool.query = queryOriginal;
    pool.connect = connectOriginal;
    await testPool?.end();
  });

  test('catálogo: cuatro categorías con actividades activas y seis motivaciones', async () => {
    assert.equal(catalogo.categorias.length, 4);
    const nombres = catalogo.categorias.map((c) => c.nombre).sort();
    assert.deepEqual(nombres, ['Culturales', 'Deportivos', 'Sociales', 'Tecnología']);
    for (const categoria of catalogo.categorias) {
      const actividades = catalogo.actividades.filter((a) => a.id_categoria === categoria.id);
      assert.ok(actividades.length >= 1, `La categoría ${categoria.nombre} no tiene actividades`);
    }
    const tecnologia = catalogo.actividades
      .filter((a) => a.id_categoria === idCategoria('Tecnología'))
      .map((a) => a.nombre)
      .sort();
    assert.deepEqual(tecnologia, ['Desarrollo web', 'Programación', 'Robótica', 'Videojuegos']);
    assert.equal(catalogo.motivaciones.length, 6);
  });

  test('sin token no se accede a las preferencias', async () => {
    const r = await peticion('GET', '/api/me/preferencias');
    assert.equal(r.status, 401);
  });

  test('un presidente de club no accede al onboarding de alumnos', async () => {
    const r = await peticion('GET', '/api/me/preferencias', { usuario: PRESIDENTE });
    assert.equal(r.status, 403);
  });

  test('un alumno nuevo aparece como pendiente con el correo desactivado', async () => {
    const r = await peticion('GET', '/api/me/preferencias', { usuario: ALUMNO_A });
    assert.equal(r.status, 200);
    assert.equal(r.json.estado_onboarding, 'pendiente');
    assert.equal(r.json.correo.activo, false);
    assert.ok(Object.values(r.json.correo.tipos).every((v) => v === false));
    assert.deepEqual(r.json.categorias, []);
    assert.equal(r.json.correos_no_configurables.length, 3);
  });

  test('una actividad sin su categoría seleccionada se rechaza y no cambia el estado', async () => {
    const r = await peticion('PUT', '/api/me/preferencias', {
      usuario: ALUMNO_A,
      datos: cuerpo({ categorias: [idCategoria('Deportivos')], actividades: [idActividad('Programación')] }),
    });
    assert.equal(r.status, 400);
    const estado = await peticion('GET', '/api/me/preferencias', { usuario: ALUMNO_A });
    assert.equal(estado.json.estado_onboarding, 'pendiente');
  });

  test('guardar respuestas válidas completa el onboarding sin activar el correo', async () => {
    const datos = cuerpo({
      categorias: [idCategoria('Deportivos'), idCategoria('Tecnología')],
      actividades: [idActividad('Fútbol'), idActividad('Programación')],
      motivaciones: [idMotivacion('amistades'), idMotivacion('talentos')],
      genero: 'prefiero_no_responder',
      correo: { ...correoApagado, tipos: { ...correoApagado.tipos, eventos: true } },
      propuestas: ['Club de Ajedrez Avanzado'],
    });
    const r = await peticion('PUT', '/api/me/preferencias', { usuario: ALUMNO_A, datos });
    assert.equal(r.status, 200);
    assert.equal(r.json.estado_onboarding, 'completado');
    assert.equal(r.json.correo.activo, false);
    assert.equal(r.json.correo.tipos.eventos, true, 'la selección de tipos se conserva con el correo apagado');
    assert.equal(r.json.propuestas.length, 1);
    assert.deepEqual(r.json.propuestas_duplicadas, []);
    assert.equal(await contarHistorial(ALUMNO_A), 0, 'sin correo activo no hay consentimiento que registrar');
  });

  test('repetir una propuesta equivalente la reporta como duplicada y no la guarda otra vez', async () => {
    const r = await peticion('PUT', '/api/me/preferencias', {
      usuario: ALUMNO_A,
      datos: cuerpo({
        categorias: [idCategoria('Deportivos'), idCategoria('Tecnología')],
        actividades: [idActividad('Fútbol'), idActividad('Programación')],
        motivaciones: [idMotivacion('amistades'), idMotivacion('talentos')],
        correo: { ...correoApagado, tipos: { ...correoApagado.tipos, eventos: true } },
        propuestas: ['club de ajedrez AVANZADO'],
      }),
    });
    assert.equal(r.status, 200);
    assert.deepEqual(r.json.propuestas_duplicadas, ['club de ajedrez AVANZADO']);
    assert.equal(r.json.propuestas.length, 1);
  });

  test('activar el correo registra el consentimiento general y de cada tipo activo', async () => {
    const datos = cuerpo({
      categorias: [idCategoria('Deportivos'), idCategoria('Tecnología')],
      actividades: [idActividad('Fútbol'), idActividad('Programación')],
      motivaciones: [idMotivacion('amistades'), idMotivacion('talentos')],
      correo: { activo: true, frecuencia: 'diaria', tipos: { ...correoApagado.tipos, eventos: true, noticias: true } },
    });
    const r = await peticion('PUT', '/api/me/preferencias', { usuario: ALUMNO_A, datos });
    assert.equal(r.status, 200);
    const historial = await peticion('GET', '/api/me/preferencias/historial-correo', { usuario: ALUMNO_A });
    assert.equal(historial.json.historial.length, 3);
    assert.ok(historial.json.historial.every((fila) => fila.version_aviso === null), 'sin aviso publicado la versión es NULL');
    const tipos = historial.json.historial.map((f) => `${f.tipo}:${f.accion}`).sort();
    assert.deepEqual(tipos, ['eventos:otorgado', 'general:otorgado', 'noticias:otorgado']);
  });

  test('repetir el mismo cambio es idempotente: no crea filas nuevas', async () => {
    const datos = cuerpo({
      categorias: [idCategoria('Deportivos'), idCategoria('Tecnología')],
      actividades: [idActividad('Fútbol'), idActividad('Programación')],
      motivaciones: [idMotivacion('amistades'), idMotivacion('talentos')],
      correo: { activo: true, frecuencia: 'diaria', tipos: { ...correoApagado.tipos, eventos: true, noticias: true } },
    });
    const antes = await contarHistorial(ALUMNO_A);
    const r = await peticion('PUT', '/api/me/preferencias', { usuario: ALUMNO_A, datos });
    assert.equal(r.status, 200);
    assert.equal(await contarHistorial(ALUMNO_A), antes);
  });

  test('cambiar la frecuencia con el correo activo registra el nuevo término', async () => {
    const antes = await contarHistorial(ALUMNO_A);
    const datos = cuerpo({
      categorias: [idCategoria('Deportivos'), idCategoria('Tecnología')],
      actividades: [idActividad('Fútbol'), idActividad('Programación')],
      motivaciones: [idMotivacion('amistades'), idMotivacion('talentos')],
      correo: { activo: true, frecuencia: 'semanal', tipos: { ...correoApagado.tipos, eventos: true, noticias: true } },
    });
    const r = await peticion('PUT', '/api/me/preferencias', { usuario: ALUMNO_A, datos });
    assert.equal(r.status, 200);
    assert.equal(await contarHistorial(ALUMNO_A), antes + 1);
  });

  test('retirar el correo registra la retirada y conserva la selección de tipos', async () => {
    const antes = await contarHistorial(ALUMNO_A);
    const datos = cuerpo({
      categorias: [idCategoria('Deportivos'), idCategoria('Tecnología')],
      actividades: [idActividad('Fútbol'), idActividad('Programación')],
      motivaciones: [idMotivacion('amistades'), idMotivacion('talentos')],
      correo: { activo: false, frecuencia: 'semanal', tipos: { ...correoApagado.tipos, eventos: true, noticias: true } },
    });
    const r = await peticion('PUT', '/api/me/preferencias', { usuario: ALUMNO_A, datos });
    assert.equal(r.status, 200);
    assert.equal(r.json.correo.activo, false);
    assert.equal(r.json.correo.tipos.eventos, true);
    assert.equal(r.json.correo.tipos.noticias, true);
    assert.equal(await contarHistorial(ALUMNO_A), antes + 3);
  });

  test('omitir registra el estado sin inventar respuestas y es idempotente', async () => {
    const primera = await peticion('POST', '/api/me/preferencias/omitir', { usuario: ALUMNO_B });
    assert.equal(primera.status, 200);
    assert.equal(primera.json.estado_onboarding, 'omitido');
    const marca = await testPool.query('SELECT onboarding_omitido_en FROM preferencias_usuario WHERE id_usuario = $1', [ALUMNO_B]);
    const segunda = await peticion('POST', '/api/me/preferencias/omitir', { usuario: ALUMNO_B });
    assert.equal(segunda.json.estado_onboarding, 'omitido');
    const marcaTras = await testPool.query('SELECT onboarding_omitido_en FROM preferencias_usuario WHERE id_usuario = $1', [ALUMNO_B]);
    assert.equal(marcaTras.rows[0].onboarding_omitido_en.getTime(), marca.rows[0].onboarding_omitido_en.getTime());
  });

  test('un alumno que omitió puede completar sus preferencias después desde el perfil', async () => {
    const r = await peticion('PUT', '/api/me/preferencias', {
      usuario: ALUMNO_B,
      datos: cuerpo({ origen: 'perfil', categorias: [idCategoria('Culturales')], actividades: [idActividad('Danza')] }),
    });
    assert.equal(r.status, 200);
    assert.equal(r.json.estado_onboarding, 'completado');
  });

  test('omitir después de completar no cambia el estado', async () => {
    const r = await peticion('POST', '/api/me/preferencias/omitir', { usuario: ALUMNO_A });
    assert.equal(r.json.estado_onboarding, 'completado');
  });

  test('cada alumno ve solo sus propias selecciones', async () => {
    const a = await peticion('GET', '/api/me/preferencias', { usuario: ALUMNO_A });
    const b = await peticion('GET', '/api/me/preferencias', { usuario: ALUMNO_B });
    assert.ok(!b.json.categorias.includes(idCategoria('Tecnología')));
    assert.deepEqual(b.json.categorias, [idCategoria('Culturales')]);
    assert.ok(!a.json.categorias.includes(idCategoria('Culturales')));
  });

  test('los datos inválidos se rechazan con 400', async () => {
    const base = cuerpo({ categorias: [idCategoria('Deportivos')] });
    const casos = [
      { ...base, genero: 'otro' },
      { ...base, correo: { ...correoApagado, frecuencia: 'mensual' } },
      { ...base, correo: { activo: true, frecuencia: 'diaria', tipos: { eventos: true } } },
      { ...base, propuestas: ['<b>club</b>'] },
      { ...base, propuestas: ['Uno uno', 'Dos dos', 'Tres tres', 'Cuatro cuatro'] },
      { ...base, origen: 'admin' },
    ];
    for (const datos of casos) {
      const r = await peticion('PUT', '/api/me/preferencias', { usuario: ALUMNO_B, datos });
      assert.equal(r.status, 400, JSON.stringify(datos.genero ?? datos.propuestas ?? datos.correo ?? datos.origen));
    }
  });

  test('el límite de propuestas pendientes se aplica y responde 409', async () => {
    const enviar = (propuestas) => peticion('PUT', '/api/me/preferencias', {
      usuario: ALUMNO_B,
      datos: cuerpo({ origen: 'perfil', categorias: [idCategoria('Culturales')], actividades: [idActividad('Danza')], propuestas }),
    });
    assert.equal((await enviar(['Propuesta uno', 'Propuesta dos', 'Propuesta tres'])).status, 200);
    assert.equal((await enviar(['Propuesta cuatro', 'Propuesta cinco', 'Propuesta seis'])).status, 200);
    assert.equal((await enviar(['Propuesta siete', 'Propuesta ocho', 'Propuesta nueve'])).status, 200);
    const exceso = await enviar(['Propuesta diez', 'Propuesta once']);
    assert.equal(exceso.status, 409);
  });

  test('una propuesta repetida no cuenta para el límite y se reporta como duplicada', async () => {
    const enviar = (propuestas) => peticion('PUT', '/api/me/preferencias', {
      usuario: ALUMNO_B,
      datos: cuerpo({ origen: 'perfil', categorias: [idCategoria('Culturales')], actividades: [idActividad('Danza')], propuestas }),
    });
    const repetida = await enviar(['propuesta UNO']);
    assert.equal(repetida.status, 200);
    assert.deepEqual(repetida.json.propuestas_duplicadas, ['propuesta UNO']);
    const nueva = await enviar(['Propuesta diez']);
    assert.equal(nueva.status, 200);
    const sinCupo = await enviar(['Propuesta once']);
    assert.equal(sinCupo.status, 409);
    const pendientes = await testPool.query(
      `SELECT count(*)::int AS n FROM actividades_propuestas WHERE id_usuario = $1 AND estado = 'pendiente'`,
      [ALUMNO_B],
    );
    assert.equal(pendientes.rows[0].n, 10);
  });

  test('envíos simultáneos idénticos son seguros y no duplican el historial', async () => {
    const datos = cuerpo({ origen: 'perfil', categorias: [idCategoria('Culturales')], actividades: [idActividad('Danza')] });
    const antes = await contarHistorial(ALUMNO_B);
    const respuestas = await Promise.all(
      Array.from({ length: 5 }, () => peticion('PUT', '/api/me/preferencias', { usuario: ALUMNO_B, datos })),
    );
    assert.ok(respuestas.every((r) => r.status === 200));
    assert.equal(await contarHistorial(ALUMNO_B), antes);
  });

  test('el historial solo devuelve filas del propio alumno', async () => {
    const r = await peticion('GET', '/api/me/preferencias/historial-correo', { usuario: ALUMNO_B });
    const esperado = await contarHistorial(ALUMNO_B);
    assert.equal(r.json.historial.length, Math.min(esperado, 200));
  });
});
