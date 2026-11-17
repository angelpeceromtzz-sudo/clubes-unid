// Pruebas de rate limiting específicas del flujo OTP.
//
// Usan los limitadores reales con umbrales pequeños inyectados antes de los
// imports dinámicos. El repositorio y el mailer se sustituyen por dobles para
// no tocar PostgreSQL ni enviar correos. Cada prueba usa IP/correo propios para
// no mezclar contadores dentro del mismo proceso.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'secreto-de-prueba-otp-rate-limit';
process.env.DB_PASSWORD = 'ficticio';
process.env.AUTH_OTP_ENABLED = 'true';
process.env.OTP_PEPPER = 'pepper-ficticio-solo-para-pruebas';
process.env.OTP_EXPIRATION_MINUTES = '10';
process.env.OTP_MAIL_PROVIDER = 'mock';
process.env.RATE_LIMIT_OTP_SOLICITUD_IP_15MIN = '2';
process.env.RATE_LIMIT_OTP_SOLICITUD_CUENTA_15MIN = '2';
process.env.RATE_LIMIT_OTP_VERIFICACION_IP_15MIN = '3';
process.env.RATE_LIMIT_OTP_VERIFICACION_CUENTA_15MIN = '2';

const { default: express } = await import('express');
const { default: authRouter } = await import('../routes/auth.js');
const { otpStore } = await import('../lib/otpStore.js');
const { mailer } = await import('../lib/mailer.js');

let servidor;
let base;

before(async () => {
  otpStore.buscarUsuario = async () => null;
  otpStore.invalidarYGuardar = async () => ({ id_otp: 1 });
  otpStore.marcarConsumido = async () => {};
  otpStore.buscarCodigoActivo = async () => null;
  mailer.limpiarEnviados();

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use('/api/auth', authRouter);

  servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => servidor?.close());

function solicitar(ip, correo, ipExtra = '') {
  return fetch(`${base}/api/auth/otp/solicitar`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ipExtra ? `${ipExtra}, ${ip}` : ip,
    },
    body: JSON.stringify({ correo }),
  });
}

function verificar(ip, correo, codigo = '123456', ipExtra = '') {
  return fetch(`${base}/api/auth/otp/verificar`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ipExtra ? `${ipExtra}, ${ip}` : ip,
    },
    body: JSON.stringify({ correo, codigo }),
  });
}

test('solicitud: límite por IP aunque cambie el correo', async () => {
  const ip = '198.51.100.70';
  assert.equal((await solicitar(ip, 'a1@red.unid.mx')).status, 200);
  assert.equal((await solicitar(ip, 'a2@red.unid.mx')).status, 200);

  const bloqueada = await solicitar(ip, 'a3@red.unid.mx');
  assert.equal(bloqueada.status, 429);
  const cuerpo = await bloqueada.json();
  assert.match(cuerpo.error, /Demasiadas solicitudes/);
  assert.ok(bloqueada.headers.get('retry-after'), 'debe incluir Retry-After');
  assert.ok(bloqueada.headers.get('ratelimit'), 'debe incluir RateLimit');

  assert.equal((await solicitar('198.51.100.71', 'a3@red.unid.mx')).status, 200);
});

test('solicitud: límite por cuenta aunque cambie la IP', async () => {
  const correo = 'cuenta-limitada@red.unid.mx';
  assert.equal((await solicitar('198.51.100.72', correo)).status, 200);
  assert.equal((await solicitar('198.51.100.73', correo)).status, 200);
  assert.equal((await solicitar('198.51.100.74', correo)).status, 429);

  // Otra cuenta desde una IP ya usada tiene su propio contador de cuenta.
  assert.equal((await solicitar('198.51.100.74', 'otra-cuenta@red.unid.mx')).status, 200);
});

test('verificación: límite por cuenta aunque cambie la IP', async () => {
  const correo = 'verif-cuenta@red.unid.mx';
  assert.equal((await verificar('198.51.100.75', correo)).status, 401);
  assert.equal((await verificar('198.51.100.76', correo)).status, 401);
  assert.equal((await verificar('198.51.100.77', correo)).status, 429);

  assert.equal((await verificar('198.51.100.77', 'verif-otra@red.unid.mx')).status, 401);
});

test('verificación: límite por IP aunque cambie el correo', async () => {
  const ip = '198.51.100.78';
  assert.equal((await verificar(ip, 'b1@red.unid.mx')).status, 401);
  assert.equal((await verificar(ip, 'b2@red.unid.mx')).status, 401);
  assert.equal((await verificar(ip, 'b3@red.unid.mx')).status, 401);

  const bloqueada = await verificar(ip, 'b4@red.unid.mx');
  assert.equal(bloqueada.status, 429);

  assert.equal((await verificar('198.51.100.79', 'b4@red.unid.mx')).status, 401);
});

test('los contadores de solicitud y verificación son independientes', async () => {
  const ip = '198.51.100.80';
  const correo = 'separado@red.unid.mx';

  assert.equal((await solicitar(ip, correo)).status, 200);
  assert.equal((await solicitar(ip, correo)).status, 200);
  assert.equal((await solicitar(ip, correo)).status, 429);

  // La cuota de solicitud agotada no debe bloquear la verificación.
  assert.equal((await verificar(ip, correo)).status, 401);
});

test('un correo inválido también consume la cuota por IP (el límite va antes de validar)', async () => {
  const ip = '198.51.100.81';
  assert.equal((await solicitar(ip, 'invalido')).status, 400);
  assert.equal((await solicitar(ip, 'invalido')).status, 400);
  assert.equal((await solicitar(ip, 'valido@red.unid.mx')).status, 429);
});

test('X-Forwarded-For: trust proxy=1 usa la IP más cercana al proxy y evita spoofing', async () => {
  const ip = '198.51.100.82';
  assert.equal((await solicitar(ip, 'c1@red.unid.mx', '1.1.1.1')).status, 200);
  assert.equal((await solicitar(ip, 'c2@red.unid.mx', '2.2.2.2')).status, 200);
  assert.equal((await solicitar(ip, 'c3@red.unid.mx', '3.3.3.3')).status, 429);
});
