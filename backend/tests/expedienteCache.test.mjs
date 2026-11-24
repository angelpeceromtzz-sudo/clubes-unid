// Cache-Control del expediente, incluidos errores y el límite anterior a auth.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'secreto-ficticio-de-pruebas-expediente-cache';
process.env.DB_PASSWORD = 'ficticio';
process.env.RATE_LIMIT_GLOBAL_MINUTO = '2';
process.env.RATE_LIMIT_LECTURAS_MINUTO = '100';

const { default: express } = await import('express');
const jwt = (await import('jsonwebtoken')).default;
const { default: pool } = await import('../db.js');
const { default: expedienteRouter } = await import('../routes/expediente.js');

let servidor;
let base;
let fallarReconocimientos = false;
let ipSiguiente = 1;

pool.query = async (sql, params = []) => {
  const texto = String(sql);
  if (/FROM usuarios u[\s\S]*WHERE u\.id_usuario = \$1 AND u\.deleted_at IS NULL/.test(texto)) {
    const id = Number(params[0]);
    const rol = id === 1 ? 1 : 3;
    return { rows: [{ id_usuario: id, nombre_completo: 'Usuario Ficticio', id_rol: rol }], rowCount: 1 };
  }
  if (/FROM expediente_reconocimientos/.test(texto)) {
    if (fallarReconocimientos) throw new Error('fallo simulado de reconocimientos');
    return { rows: [{ id_reconocimiento: 1, id_edicion: 10, actividad: 'Actividad Ficticia' }], rowCount: 1 };
  }
  if (/FROM usuarios u[\s\S]*u\.id_rol = \$2/.test(texto)) {
    return Number(params[0]) === 200
      ? { rows: [{ id_usuario: 200, nombre_completo: 'Alumno Ficticio' }], rowCount: 1 }
      : { rows: [], rowCount: 0 };
  }
  return { rows: [], rowCount: 0 };
};

before(async () => {
  const app = express();
  app.set('trust proxy', 1);
  app.use('/api/expediente', expedienteRouter);
  servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${servidor.address().port}/api/expediente`;
});

after(() => servidor?.close());

function token(idUsuario) {
  return jwt.sign({ id: idUsuario, auth_otp: false }, process.env.JWT_SECRET, { expiresIn: '5m' });
}

async function pedir(ruta, { idUsuario, ip } = {}) {
  const respuesta = await fetch(`${base}${ruta}`, {
    headers: {
      ...(idUsuario ? { authorization: `Bearer ${token(idUsuario)}` } : {}),
      'x-forwarded-for': ip || `192.0.2.${ipSiguiente++}`,
    },
  });
  assert.equal(respuesta.headers.get('cache-control'), 'private, no-store', ruta);
  return respuesta;
}

test('los tres endpoints exitosos no se cachean', async () => {
  const insignias = await pedir('/mis-reconocimientos', { idUsuario: 1 });
  assert.equal(insignias.status, 200);
  assert.equal((await insignias.json())[0].id_reconocimiento, 1);

  const busqueda = await pedir('/buscar?q=ana', { idUsuario: 3 });
  assert.equal(busqueda.status, 200);

  const detalle = await pedir('/200', { idUsuario: 3 });
  assert.equal(detalle.status, 200);
  assert.equal((await detalle.json()).reconocimientos[0].id_reconocimiento, 1);
});

test('401, 403, 400, 404 y 500 conservan la política privada sin caché', async () => {
  assert.equal((await pedir('/buscar?q=ana')).status, 401);
  assert.equal((await pedir('/buscar?q=ana', { idUsuario: 1 })).status, 403);
  assert.equal((await pedir('/buscar?q=an', { idUsuario: 3 })).status, 400);
  assert.equal((await pedir('/999', { idUsuario: 3 })).status, 404);

  fallarReconocimientos = true;
  try {
    assert.equal((await pedir('/mis-reconocimientos', { idUsuario: 1 })).status, 500);
  } finally {
    fallarReconocimientos = false;
  }
});

test('el 429 del limitador anterior a authenticate tampoco se cachea', async () => {
  const ip = '192.0.2.250';
  assert.equal((await pedir('/buscar?q=ana', { idUsuario: 3, ip })).status, 200);
  assert.equal((await pedir('/buscar?q=ana', { idUsuario: 3, ip })).status, 200);
  assert.equal((await pedir('/buscar?q=ana', { idUsuario: 3, ip })).status, 429);
});
