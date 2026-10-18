// H13: identificadores de ruta no numéricos → 400 en vez de 500.
//
// Sin validación, un valor como 'abc' llega a PostgreSQL (`WHERE id = 'abc'`),
// provoca un error de casteo y el handler lo devuelve como 500. La solución
// compartida (lib/validarId.js) cubre dos frentes:
//   - validarParamsEnteros(router): se registra en los 12 routers que declaran
//     parámetros de id; los callbacks de router.param responden 400 antes de
//     que el valor llegue a los handlers y a la BD;
//   - validación explícita del query param id_club de /padron (parseInt → NaN
//     también terminaba en 500).
// horarios.js queda fuera a propósito: sus middlewares requireClubLeader y
// requireHorarioLeader ya validan con mensajes propios (H16, verificado en
// horariosAutorizacion.test.mjs).
// Pruebas con Express real, pool simulado y JWT ficticios; sin BD ni red.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

process.env.JWT_SECRET = 'secreto-de-prueba-ficticio-solo-para-tests';
process.env.DB_PASSWORD = 'ficticio';

const { default: express } = await import('express');
const jwt = (await import('jsonwebtoken')).default;
const { default: pool } = await import('../db.js');
const { esIdEntero } = await import('../lib/validarId.js');
const { default: avisosRouter } = await import('../routes/avisos.js');
const { default: clubesRouter } = await import('../routes/clubes.js');
const { default: estadisticasRouter } = await import('../routes/estadisticas.js');
const { default: notificacionesRouter } = await import('../routes/notificaciones.js');
const { default: encuestasRouter } = await import('../routes/encuestas.js');

function responder(sql, params = []) {
  const texto = String(sql).trim();

  // Revalidación de authenticate (H2): alumno rol 1 y rectoría rol 4.
  if (/FROM usuarios u[\s\S]*WHERE u\.id_usuario = \$1 AND u\.deleted_at IS NULL/.test(texto)) {
    const usuarios = {
      100: { id_usuario: 100, nombre_completo: 'Alumno Ficticio', id_rol: 1 },
      300: { id_usuario: 300, nombre_completo: 'Rectoría Ficticia', id_rol: 4 },
    };
    const fila = usuarios[params[0]];
    return fila ? { rows: [fila], rowCount: 1 } : { rows: [], rowCount: 0 };
  }

  // Resto de consultas: sin filas. Los ids inválidos nunca deben llegar aquí:
  // si un caso con id 'abc' ejecuta una consulta, la validación falló.
  return { rows: [], rowCount: 0 };
}

pool.query = async (sql, params) => responder(sql, params);
pool.connect = async () => ({ query: responder, release: () => {} });

function token(id, nombre, rol) {
  return jwt.sign({ id, nombre_completo: nombre, id_rol: rol }, process.env.JWT_SECRET, { expiresIn: '5m' });
}
const tokenAlumno = token(100, 'Alumno Ficticio', 1);
const tokenRectoria = token(300, 'Rectoría Ficticia', 4);

let servidor;
let base;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/avisos', avisosRouter);
  app.use('/api/clubes', clubesRouter);
  app.use('/api/estadisticas', estadisticasRouter);
  app.use('/api/notificaciones', notificacionesRouter);
  app.use('/api/encuestas', encuestasRouter);
  servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => servidor?.close());

async function pedir(metodo, ruta, tokenUsuario) {
  return fetch(`${base}${ruta}`, {
    method: metodo,
    headers: {
      'content-type': 'application/json',
      ...(tokenUsuario ? { authorization: `Bearer ${tokenUsuario}` } : {}),
    },
  });
}

// --- Unidad ---

test('esIdEntero admite enteros positivos y rechaza basura', () => {
  assert.equal(esIdEntero('1'), true);
  assert.equal(esIdEntero(1), true);
  assert.equal(esIdEntero('123456789012345'), true, '15 dígitos es el máximo');
  assert.equal(esIdEntero('0'), false, 'cero no es un id de registro');
  assert.equal(esIdEntero('012'), false, 'ceros a la izquierda');
  assert.equal(esIdEntero('-1'), false);
  assert.equal(esIdEntero('1.5'), false);
  assert.equal(esIdEntero('1e3'), false);
  assert.equal(esIdEntero('abc'), false);
  assert.equal(esIdEntero(''), false);
  assert.equal(esIdEntero(null), false);
  assert.equal(esIdEntero(undefined), false);
  assert.equal(esIdEntero({}), false);
  assert.equal(esIdEntero(1.5), false);
  assert.equal(esIdEntero(0), false);
  assert.equal(esIdEntero('1234567890123456'), false, '16 dígitos excede el entero seguro');
});

// --- Rutas públicas: el parámetro se valida antes del handler ---

test('GET /api/avisos/:clubId no numérico → 400 (antes 500)', async () => {
  const r = await pedir('GET', '/api/avisos/abc');
  assert.equal(r.status, 400);
  assert.equal((await r.json()).error, 'clubId inválido');
});

test('GET /api/clubes/:id no numérico → 400 (antes 500)', async () => {
  const r = await pedir('GET', '/api/clubes/abc');
  assert.equal(r.status, 400);
  assert.equal((await r.json()).error, 'id inválido');
});

test('GET /api/clubes/:id numérico pasa la validación y llega al handler (404 simulado)', async () => {
  const r = await pedir('GET', '/api/clubes/9999');
  assert.equal(r.status, 404);
  assert.equal((await r.json()).error, 'Club no encontrado');
});

// --- Estadísticas: authenticate global corre antes que el parámetro ---

test('GET /api/estadisticas sin sesión sigue respondiendo 401 (H2 conservado)', async () => {
  const r = await pedir('GET', '/api/estadisticas/asistencia/abc');
  assert.equal(r.status, 401);
});

test('GET /api/estadisticas/asistencia/:id_club no numérico → 400 con sesión de rectoría', async () => {
  const r = await pedir('GET', '/api/estadisticas/asistencia/abc', tokenRectoria);
  assert.equal(r.status, 400);
  assert.equal((await r.json()).error, 'id_club inválido');
});

test('GET /api/estadisticas/padron?id_club no numérico → 400 (validación explícita, antes 500)', async () => {
  const r = await pedir('GET', '/api/estadisticas/padron?id_club=abc', tokenRectoria);
  assert.equal(r.status, 400);
  assert.equal((await r.json()).error, 'id_club inválido');
});

test('GET /api/estadisticas/padron?id_club=5 numérico pasa y responde 200', async () => {
  const r = await pedir('GET', '/api/estadisticas/padron?id_club=5', tokenRectoria);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), []);
});

// --- Notificaciones: el parámetro corre antes que authenticate en la ruta ---

test('POST /api/notificaciones/:id/leer no numérico → 400 con sesión activa (antes 500)', async () => {
  const r = await pedir('POST', '/api/notificaciones/abc/leer', tokenAlumno);
  assert.equal(r.status, 400);
  assert.equal((await r.json()).error, 'id inválido');
});

test('DELETE /api/notificaciones/:id no numérico → 400 con sesión activa (antes 500)', async () => {
  const r = await pedir('DELETE', '/api/notificaciones/abc', tokenAlumno);
  assert.equal(r.status, 400);
  assert.equal((await r.json()).error, 'id inválido');
});

// --- El slug de las encuestas públicas NO es un id: no se toca ---

test('GET /api/encuestas/publico/:slug conserva su comportamiento (404 simulado, sin 400)', async () => {
  const r = await pedir('GET', '/api/encuestas/publico/mi-club');
  assert.equal(r.status, 404);
  assert.equal((await r.json()).error, 'Encuesta no encontrada');
});

// --- Registro del helper en los routers (cableado de producción) ---

test('los 12 routers con parámetros de id registran validarParamsEnteros y horarios no', async () => {
  const conValidacion = [
    'avisos', 'clubes', 'convocatorias', 'diapositivasHero', 'encuestas',
    'estadisticas', 'formularios', 'inscripciones', 'noticias',
    'notificaciones', 'ofertas', 'usuarios',
  ];
  for (const nombre of conValidacion) {
    const texto = await readFile(new URL(`../routes/${nombre}.js`, import.meta.url), 'utf8');
    assert.match(texto, /validarParamsEnteros\(router\)/, `${nombre}.js debe registrar la validación H13`);
  }
  const horarios = await readFile(new URL('../routes/horarios.js', import.meta.url), 'utf8');
  assert.doesNotMatch(horarios, /validarParamsEnteros/, 'horarios ya lo cubren sus middlewares (H16)');
});
