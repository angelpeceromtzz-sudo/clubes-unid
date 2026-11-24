// Procedencia OTP del JWT y revocación de privilegios al pasar a rol restringido.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'secreto-ficticio-de-pruebas-otp-jwt-rol';
process.env.DB_PASSWORD = 'ficticio';
process.env.AUTH_OTP_ENABLED = 'true';
process.env.OTP_PEPPER = 'pepper-ficticio-de-pruebas-otp-jwt-rol';
process.env.RATE_LIMIT_OTP_VERIFICACION_IP_15MIN = '10000';
process.env.RATE_LIMIT_OTP_VERIFICACION_CUENTA_15MIN = '10000';

const { default: express } = await import('express');
const jwt = (await import('jsonwebtoken')).default;
const { default: pool } = await import('../db.js');
const { authenticate, requireRole } = await import('../middleware/auth.js');
const { generarToken } = await import('../lib/jwt.js');
const { generarHashOtp, ROLES_SIN_OTP } = await import('../lib/otp.js');
const { default: authRouter } = await import('../routes/auth.js');
const { otpStore } = await import('../lib/otpStore.js');

const SECRET = process.env.JWT_SECRET;
const GENERACION = 'd'.repeat(64);
let usuarioActual;
let falloBD;
let consultas;
let servidor;
let base;

function respuestaMock() {
  const res = { statusCode: null, body: null };
  res.status = (status) => { res.statusCode = status; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

async function autenticar(token) {
  const req = { headers: token ? { authorization: `Bearer ${token}` } : {} };
  const res = respuestaMock();
  let siguiente = false;
  await authenticate(req, res, () => { siguiente = true; });
  return { req, res, siguiente };
}

function firmar(claims) {
  return jwt.sign({ id: 10, id_rol: 1, ...claims }, SECRET, { expiresIn: '5m' });
}

pool.query = async (sql, params = []) => {
  const texto = String(sql);
  consultas.push({ texto, params });
  if (falloBD) throw new Error('fallo simulado de PostgreSQL');

  if (texto.includes('UPDATE dispositivos_confiables d')) {
    return {
      rows: [{
        id_dispositivo: 1,
        expira_en: new Date(Date.now() + 86400000),
        generacion: GENERACION,
        ...usuarioActual,
        rol: 'responsable_club',
      }],
      rowCount: 1,
    };
  }

  if (/FROM usuarios u[\s\S]*JOIN dispositivos_confiables d/.test(texto)) {
    // Reproduce el filtro NOT (u.id_rol = ANY(ROLES_SIN_OTP)) de la consulta real.
    return ROLES_SIN_OTP.has(Number(usuarioActual.id_rol))
      ? { rows: [], rowCount: 0 }
      : { rows: [usuarioActual], rowCount: 1 };
  }

  if (/FROM usuarios u[\s\S]*u\.deleted_at IS NULL/.test(texto)) {
    return { rows: [usuarioActual], rowCount: 1 };
  }

  return { rows: [], rowCount: 0 };
};

before(async () => {
  otpStore.buscarCodigoActivo = async () => ({
    id_otp: 1,
    codigo_hash: generarHashOtp('123456'),
    expira_en: new Date(Date.now() + 600000),
    intentos: 0,
    max_intentos: 5,
  });
  otpStore.consumirCodigo = async () => ({ id_otp: 1 });
  otpStore.buscarUsuario = async () => ({ ...usuarioActual });
  otpStore.actualizarLastLogin = async () => {};

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${servidor.address().port}/api/auth/otp`;
});

after(() => servidor?.close());

beforeEach(() => {
  usuarioActual = {
    id_usuario: 10,
    nombre_completo: 'Usuario Ficticio',
    correo_institucional: 'usuario@red.unid.mx',
    institutional_id: 'F-001',
    id_rol: 2,
    rol: 'responsable_club',
    deleted_at: null,
  };
  falloBD = false;
  consultas = [];
});

test('generarToken marca false en login normal y true en OTP sin cambiar el contrato básico', () => {
  const normal = jwt.verify(generarToken(usuarioActual), SECRET);
  const otp = jwt.verify(generarToken(usuarioActual, { origenOtp: true }), SECRET);

  assert.equal(normal.auth_otp, false);
  assert.equal(otp.auth_otp, true);
  for (const claim of ['id', 'nombre_completo', 'correo_institucional', 'institutional_id', 'id_rol', 'rol', 'iat', 'exp']) {
    assert.ok(claim in otp, claim);
  }
  assert.throws(() => generarToken(usuarioActual, { origenOtp: 'true' }), /booleano/);
});

test('la verificación OTP emite auth_otp=true y ese token pierde acceso al promocionar a rol restringido', async () => {
  const respuesta = await fetch(`${base}/verificar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: usuarioActual.correo_institucional, codigo: '123456' }),
  });
  assert.equal(respuesta.status, 200);
  const datos = await respuesta.json();
  const payload = jwt.verify(datos.token, SECRET);
  assert.equal(payload.auth_otp, true);
  assert.equal(payload.id_rol, 2);
  assert.deepEqual(Object.keys(datos.user).sort(), [
    'correo_institucional', 'id_rol', 'id_usuario', 'institutional_id', 'nombre_completo', 'rol',
  ]);

  usuarioActual.id_rol = 3;
  usuarioActual.rol = 'admin';
  const { req, res, siguiente } = await autenticar(datos.token);
  assert.equal(siguiente, false);
  assert.equal(res.statusCode, 401);
  assert.equal(req.user, undefined);

  const resRol = respuestaMock();
  let permitido = false;
  requireRole(3)(req, resRol, () => { permitido = true; });
  assert.equal(permitido, false, 'no debe montarse req.user con privilegios administrativos');
});

test('la renovación de dispositivo confiable también emite auth_otp=true', async () => {
  const dispositivo = 'a'.repeat(64);
  const tokenConfiable = 'b'.repeat(64);
  const respuesta = await fetch(`${base}/dispositivo/renovar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Device': dispositivo,
      'X-Trusted-Device': tokenConfiable,
    },
  });
  assert.equal(respuesta.status, 200);
  const datos = await respuesta.json();
  const payload = jwt.verify(datos.token, SECRET);
  assert.equal(payload.auth_otp, true);
  assert.equal(payload.id_dispositivo_confiable, 1);
  assert.equal(payload.generacion_dispositivo_confiable, GENERACION);
});

test('auth_otp=true se rechaza para los tres roles restringidos actuales', async () => {
  for (const rol of ROLES_SIN_OTP) {
    usuarioActual.id_rol = rol;
    const { req, res, siguiente } = await autenticar(firmar({ auth_otp: true }));
    assert.equal(res.statusCode, 401, `rol ${rol}`);
    assert.equal(siguiente, false);
    assert.equal(req.user, undefined);
  }
});

test('auth_otp=true conserva los roles que sí pueden usar OTP', async () => {
  for (const rol of [1, 2, 5, 6]) {
    usuarioActual.id_rol = rol;
    const { req, res, siguiente } = await autenticar(firmar({ auth_otp: true, id_rol: 1 }));
    assert.equal(res.statusCode, null, `rol ${rol}`);
    assert.equal(siguiente, true);
    assert.equal(req.user.id_rol, rol, 'el rol autorizado debe venir de BD');
  }
});

test('los tokens local/Microsoft nuevos con auth_otp=false conservan los roles restringidos', async () => {
  for (const rol of ROLES_SIN_OTP) {
    usuarioActual.id_rol = rol;
    const { req, res, siguiente } = await autenticar(firmar({ auth_otp: false }));
    assert.equal(res.statusCode, null, `rol ${rol}`);
    assert.equal(siguiente, true);
    assert.equal(req.user.id_rol, rol);
  }
});

test('los tokens legacy sin claim conservan compatibilidad en roles permitidos', async () => {
  for (const rol of [1, 2, 5, 6]) {
    usuarioActual.id_rol = rol;
    const { req, res, siguiente } = await autenticar(firmar({}));
    assert.equal(res.statusCode, null, `rol ${rol}`);
    assert.equal(siguiente, true);
    assert.equal(req.user.id_rol, rol);
  }
});

test('los tokens legacy sin claim exigen reautenticar una vez en roles restringidos', async () => {
  // Sin claim no se puede distinguir un OTP antiguo de uno local/Microsoft: se
  // falla cerrado solo para los roles que OTP no puede usar.
  for (const rol of ROLES_SIN_OTP) {
    usuarioActual.id_rol = rol;
    const { req, res, siguiente } = await autenticar(firmar({}));
    assert.equal(res.statusCode, 401, `rol ${rol}`);
    assert.equal(siguiente, false);
    assert.equal(req.user, undefined);
    assert.match(res.body.error, /Inicia sesión nuevamente/);
  }
});

test('un claim auth_otp no booleano falla cerrado antes de consultar BD', async () => {
  for (const valor of [null, 'true', 1, 0, [], {}]) {
    consultas = [];
    const { req, res, siguiente } = await autenticar(firmar({ auth_otp: valor }));
    assert.equal(res.statusCode, 401, JSON.stringify(valor));
    assert.equal(siguiente, false);
    assert.equal(req.user, undefined);
    assert.equal(consultas.length, 0);
  }
});

test('un dispositivo confiable se trata como OTP aunque el claim falte o sea false', async () => {
  usuarioActual.id_rol = 4;
  for (const claims of [
    { id_dispositivo_confiable: 1, generacion_dispositivo_confiable: GENERACION },
    { id_dispositivo_confiable: 1, generacion_dispositivo_confiable: GENERACION, auth_otp: false },
  ]) {
    const { req, res, siguiente } = await autenticar(firmar(claims));
    assert.equal(res.statusCode, 401);
    assert.equal(siguiente, false);
    assert.equal(req.user, undefined);
  }
});

test('un fallo de BD con sesión OTP sigue fallando cerrado con 500', async () => {
  falloBD = true;
  const { req, res, siguiente } = await autenticar(firmar({ auth_otp: true }));
  assert.equal(res.statusCode, 500);
  assert.equal(siguiente, false);
  assert.equal(req.user, undefined);
});
