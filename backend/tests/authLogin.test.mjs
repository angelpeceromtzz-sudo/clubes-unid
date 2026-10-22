// Autenticación: normalización del correo, cuentas desactivadas y limitadores
// montados en las rutas reales.
//
// Monta el router real de auth con el pool simulado y los limitadores reales
// de lib/rateLimits.js, con umbrales pequeños inyectados por variables de
// entorno ANTES de los imports dinámicos (mismo patrón que rateLimit.test.mjs).
// Datos ficticios, sin red ni servicios desplegados.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'secreto-de-prueba-ficticio-solo-para-tests';
process.env.DB_PASSWORD = 'ficticio';
// Umbrales pequeños: el límite por cuenta salta en el tercer intento.
process.env.RATE_LIMIT_LOGIN_IP_15MIN = '50';
process.env.RATE_LIMIT_LOGIN_CUENTA_15MIN = '2';

const { default: express } = await import('express');
const bcrypt = (await import('bcryptjs')).default;
const { default: pool } = await import('../db.js');
const { default: authRouter } = await import('../routes/auth.js');

const CONTRASENA = 'contrasena-de-prueba';
const HASH = bcrypt.hashSync(CONTRASENA, 4);

// Estado simulado: se puede cambiar entre pruebas.
let usuario = null;
let consultas = [];

function responder(sql, params = []) {
  const texto = String(sql).trim();
  consultas.push({ texto, params });

  if (/FROM usuarios u[\s\S]*JOIN cat_roles/.test(texto)) {
    return { rows: usuario ? [usuario] : [], rowCount: usuario ? 1 : 0 };
  }

  return { rows: [], rowCount: 0 };
}

pool.query = async (sql, params) => responder(sql, params);

let servidor;
let base;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => servidor?.close());

const pedirLogin = async (correo, contrasena = CONTRASENA) => {
  const r = await fetch(`${base}/api/auth/login-local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo, contrasena }),
  });

  return { status: r.status, cuerpo: await r.json().catch(() => ({})) };
};

test('el correo se normaliza antes de buscar la cuenta', async () => {
  usuario = {
    id_usuario: 42,
    nombre_completo: 'Alumno Ficticio',
    correo_institucional: 'alumno@red.unid.mx',
    institutional_id: '00906641',
    password_hash: HASH,
    id_rol: 1,
    rol: 'Alumno',
    deleted_at: null,
  };
  consultas = [];

  const r = await pedirLogin('  Alumno@RED.UNID.MX  ');

  assert.equal(r.status, 200);
  assert.ok(r.cuerpo.token, 'debe emitir token');

  // La consulta recibe el correo normalizado, no el que escribió el alumno.
  const busqueda = consultas.find((c) => /FROM usuarios u/.test(c.texto));
  assert.ok(busqueda, 'debe consultar la tabla de usuarios');
  assert.equal(busqueda.params[0], 'alumno@red.unid.mx');
});

test('una cuenta desactivada no obtiene token', async () => {
  usuario = {
    id_usuario: 43,
    nombre_completo: 'Alumno Eliminado',
    correo_institucional: 'eliminado@red.unid.mx',
    institutional_id: '00906642',
    password_hash: HASH,
    id_rol: 1,
    rol: 'Alumno',
    deleted_at: '2026-01-01 00:00:00',
  };

  const r = await pedirLogin('eliminado@red.unid.mx');

  assert.equal(r.status, 401);
  assert.equal(r.cuerpo.error, 'Credenciales inválidas');
  assert.equal(r.cuerpo.token, undefined);
});

test('los limitadores están montados en la ruta real de login', async () => {
  // El límite por cuenta de lib/rateLimits.js está en 2 (inyectado arriba).
  usuario = null;
  consultas = [];

  const primera = await pedirLogin('intentos@red.unid.mx');
  const segunda = await pedirLogin('intentos@red.unid.mx');
  const tercera = await pedirLogin('intentos@red.unid.mx');

  assert.equal(primera.status, 401, 'el primer intento responde 401 (sin cuenta)');
  assert.equal(segunda.status, 401, 'el segundo intento responde 401');
  assert.equal(tercera.status, 429, 'el tercero debe chocar con el límite por cuenta');
});
