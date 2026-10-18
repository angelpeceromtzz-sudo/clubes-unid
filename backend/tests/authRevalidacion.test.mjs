// Pruebas de la revalidación de sesión contra la BD (auditoría H2).
//
// Ejercitan authenticate + requireRole con JWT firmado con un secreto
// ficticio y el pool sustituido por un stub controlable (usuarios activos,
// desactivados simulados vía el filtro deleted_at, y modo fallo de BD).
// Datos ficticios; sin base de datos ni red externa.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'secreto-de-prueba-ficticio-solo-para-tests';
process.env.DB_PASSWORD = 'ficticio';

const { default: pool } = await import('../db.js');
const { authenticate, requireRole } = await import('../middleware/auth.js');
const jwt = (await import('jsonwebtoken')).default;

const SECRET = process.env.JWT_SECRET;

// Fila que la BD "ve" para cada usuario activo (la consulta filtra deleted_at).
const USUARIOS = new Map([
  [10, { id_usuario: 10, nombre_completo: 'Admin Actualizado', id_rol: 3 }],
  [50, { id_usuario: 50, nombre_completo: 'Presidente Actual', id_rol: 2 }],
  [100, { id_usuario: 100, nombre_completo: 'Alumna Actual', id_rol: 1 }],
]);

let consultas = [];
let falloBD = false;

pool.query = async (sql, params = []) => {
  consultas.push({ sql: String(sql).trim(), params });
  if (falloBD) throw new Error('fallo simulado de PostgreSQL');
  if (/FROM usuarios u/.test(String(sql))) {
    const fila = USUARIOS.get(params[0]) ?? null;
    return { rows: fila ? [fila] : [], rowCount: fila ? 1 : 0 };
  }
  return { rows: [], rowCount: 0 };
};

beforeEach(() => {
  consultas = [];
  falloBD = false;
});

function tokenDe(claims, opciones = {}) {
  return jwt.sign(
    {
      id: 100,
      nombre_completo: 'Nombre Antiguo del Token',
      correo_institucional: 'ficticio@unid.mx',
      institutional_id: 'F000',
      id_rol: 1,
      rol: 'alumno',
      ...claims,
    },
    SECRET,
    { expiresIn: '5m', ...opciones }
  );
}

function mockRes() {
  const res = { statusCode: null, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
}

async function ejecutarAuthenticate(token) {
  const req = { headers: token ? { authorization: `Bearer ${token}` } : {} };
  const res = mockRes();
  let nextLlamado = false;
  await authenticate(req, res, () => { nextLlamado = true; });
  return { req, res, nextLlamado };
}

function consultasDeUsuarios() {
  return consultas.filter((c) => /FROM usuarios u/.test(c.sql));
}

// --- Aceptados ---

test('token válido y usuario activo: next() con los datos actuales de la BD', async () => {
  const { req, res, nextLlamado } = await ejecutarAuthenticate(tokenDe({ id: 50, id_rol: 2, nombre_completo: 'Nombre Antiguo' }));
  assert.equal(nextLlamado, true);
  assert.equal(res.statusCode, null);
  assert.deepEqual(req.user, { id: 50, nombre_completo: 'Presidente Actual', id_rol: 2 });
  assert.equal(consultasDeUsuarios().length, 1);
});

test('token con claims obsoletos: el rol y el nombre de la BD reemplazan a los del token (sin mezcla)', async () => {
  // Token mintido con id_rol 3 (admin) y nombre antiguo; la BD dice alumno.
  const { req, nextLlamado } = await ejecutarAuthenticate(tokenDe({ id: 100, id_rol: 3, nombre_completo: 'Antiguo Admin' }));
  assert.equal(nextLlamado, true);
  assert.equal(req.user.id_rol, 1, 'el rol debe venir de la BD, no del token');
  assert.equal(req.user.nombre_completo, 'Alumna Actual');
  assert.ok(!('nombre_completo' in req.user && req.user.nombre_completo === 'Antiguo Admin'));
});

test('flujo completo: alumno con token de admin pierde el acceso a ruta de rol 3', async () => {
  const { req, res, nextLlamado } = await ejecutarAuthenticate(tokenDe({ id: 100, id_rol: 3 }));
  assert.equal(nextLlamado, true);
  const res2 = mockRes();
  let pasoRole = false;
  requireRole(3)(req, res2, () => { pasoRole = true; });
  assert.equal(pasoRole, false);
  assert.equal(res2.statusCode, 403);
});

test('flujo completo: admin activo conserva el acceso a ruta de rol 3', async () => {
  const { req } = await ejecutarAuthenticate(tokenDe({ id: 10, id_rol: 1 }));
  const res2 = mockRes();
  let pasoRole = false;
  requireRole(3)(req, res2, () => { pasoRole = true; });
  assert.equal(pasoRole, true, 'el rol actual de BD (3) debe permitir el paso');
});

// --- Rechazados sin consultar la BD ---

test('sin header: 401 y ninguna consulta', async () => {
  const { res, nextLlamado } = await ejecutarAuthenticate(null);
  assert.equal(nextLlamado, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, 'Token no proporcionado');
  assert.equal(consultas.length, 0);
});

test('firma inválida: 401 y ninguna consulta a la BD', async () => {
  const falso = jwt.sign({ id: 10 }, 'otro-secreto-ficticio');
  const { res, nextLlamado } = await ejecutarAuthenticate(falso);
  assert.equal(nextLlamado, false);
  assert.equal(res.statusCode, 401);
  assert.equal(consultas.length, 0);
});

test('token expirado: 401 y ninguna consulta a la BD', async () => {
  const viejo = tokenDe({ id: 10 }, { expiresIn: '-10s' });
  const { res, nextLlamado } = await ejecutarAuthenticate(viejo);
  assert.equal(nextLlamado, false);
  assert.equal(res.statusCode, 401);
  assert.equal(consultas.length, 0);
});

test('token válido sin claim id: 401 y ninguna consulta', async () => {
  const sinId = jwt.sign({ id_rol: 3 }, SECRET, { expiresIn: '5m' });
  const { res, nextLlamado } = await ejecutarAuthenticate(sinId);
  assert.equal(nextLlamado, false);
  assert.equal(res.statusCode, 401);
  assert.equal(consultas.length, 0);
});

// --- Rechazados por estado de la cuenta ---

test('usuario inexistente con token firmado: 401 (sin fila activa)', async () => {
  const { res, nextLlamado } = await ejecutarAuthenticate(tokenDe({ id: 999, id_rol: 3 }));
  assert.equal(nextLlamado, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, 'Sesión no válida o cuenta desactivada');
});

test('usuario desactivado (deleted_at): la consulta filtrada no lo devuelve → 401', async () => {
  // El stub replica el filtro AND u.deleted_at IS NULL: un id no listado
  // equivale a inexistente o desactivado.
  const { res, nextLlamado } = await ejecutarAuthenticate(tokenDe({ id: 200, id_rol: 3 }));
  assert.equal(nextLlamado, false);
  assert.equal(res.statusCode, 401);
});

// --- Fallo de la BD: fail closed ---

test('fallo de la BD: 500 controlado, sin next() y sin aceptar los claims del token', async () => {
  falloBD = true;
  const { req, res, nextLlamado } = await ejecutarAuthenticate(tokenDe({ id: 10, id_rol: 3 }));
  assert.equal(nextLlamado, false);
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error, 'Error interno del servidor');
  assert.equal(req.user, undefined, 'no debe montarse req.user con datos del token como respaldo');
});
