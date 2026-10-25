import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'secreto-de-prueba-smtp-sin-config';
process.env.DB_PASSWORD = 'ficticio';
process.env.DATABASE_URL = '';
process.env.AUTH_OTP_ENABLED = 'true';
process.env.OTP_PEPPER = 'pepper-ficticio-solo-para-pruebas';
process.env.OTP_MAIL_PROVIDER = 'smtp';
process.env.SMTP_HOST = '';
process.env.SMTP_PORT = '';
process.env.SMTP_SECURE = '';
process.env.SMTP_USER = '';
process.env.SMTP_PASSWORD = '';
process.env.SMTP_FROM = '';
process.env.RATE_LIMIT_OTP_SOLICITUD_IP_15MIN = '10000';
process.env.RATE_LIMIT_OTP_SOLICITUD_CUENTA_15MIN = '10000';

const { default: express } = await import('express');
const { default: authRouter } = await import('../routes/auth.js');
const { mailer } = await import('../lib/mailer.js');

let servidor;
let base;

before(async () => {
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

test('SMTP sin variables responde 503 y no genera código', async () => {
  assert.equal(mailer.proveedor, 'smtp');
  assert.equal(mailer.configurado, false);

  const respuesta = await fetch(`${base}/api/auth/otp/solicitar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: 'alumno@red.unid.mx' }),
  });
  const cuerpo = await respuesta.json();

  assert.equal(respuesta.status, 503);
  assert.deepEqual(cuerpo, { error: 'El acceso mediante código no está disponible.' });
  assert.equal(JSON.stringify(cuerpo).match(/\d{6}/), null);
});
