import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearMailer } from '../lib/mailer.js';
import { leerConfiguracionResend } from '../lib/resendMailer.js';

const API_KEY = 're_clave_ficticia_solo_para_pruebas';
const FROM = 'Clubs UNID <no-reply@unid.mx>';
const CORREO = 'alumno@red.unid.mx';
const CODIGO = '654321';
const ASUNTO = 'Tu código de acceso a Clubs UNID';

const ENV_RESEND = Object.freeze({
  RESEND_API_KEY: API_KEY,
  RESEND_FROM: FROM,
});

const LOGO = 'https://res.cloudinary.com/o7ozc3zt/image/upload/v1792979538/lobounid_jw1mjq.png';

const ENV_RESEND_CON_LOGO = Object.freeze({
  ...ENV_RESEND,
  OTP_LOGO_URL: LOGO,
});

function crearFetchFicticio({ status = 200, error = null, abortar = false } = {}) {
  const llamadas = [];

  return {
    llamadas,
    fetch: async (url, opciones) => {
      llamadas.push({ url, opciones });

      if (error) {
        throw error;
      }

      if (abortar) {
        return new Promise((_, reject) => {
          opciones.signal.addEventListener('abort', () => {
            const err = new Error('timeout ficticio');
            err.name = 'TimeoutError';
            reject(err);
          });
        });
      }

      return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => {
          throw new Error('el proveedor no debe leer el cuerpo de la respuesta');
        },
        text: async () => {
          throw new Error('el proveedor no debe leer el cuerpo de la respuesta');
        },
      };
    },
  };
}

function crearMailerPrueba(fake, opciones = {}) {
  return crearMailer('resend', {
    env: ENV_RESEND,
    fetchImpl: fake.fetch,
    ...opciones,
  });
}

function assertSinSecretos(texto) {
  assert.equal(String(texto).includes(API_KEY), false);
  assert.equal(String(texto).includes(CODIGO), false);
}

test('selecciona el proveedor resend con configuración completa', () => {
  const fake = crearFetchFicticio();
  const mailer = crearMailerPrueba(fake);

  assert.equal(mailer.proveedor, 'resend');
  assert.equal(mailer.configurado, true);
  assert.equal(mailer.estaDisponible(), true);
  assert.equal(mailer.motivoNoDisponible, null);
});

test('envía el código por la API HTTPS de Resend', async () => {
  const fake = crearFetchFicticio({ status: 200 });
  const mailer = crearMailerPrueba(fake);

  await mailer.enviarCodigoOtp({
    correo: CORREO,
    codigo: CODIGO,
    expiracion: new Date(Date.now() + 10 * 60 * 1000),
    minutos: 10,
  });

  assert.equal(fake.llamadas.length, 1);
  const { url, opciones } = fake.llamadas[0];

  assert.equal(url, 'https://api.resend.com/emails');
  assert.equal(opciones.method, 'POST');
  assert.equal(opciones.headers.Authorization, `Bearer ${API_KEY}`);
  assert.equal(opciones.headers['Content-Type'], 'application/json');
  assert.ok(opciones.signal instanceof AbortSignal);

  const cuerpo = JSON.parse(opciones.body);
  assert.deepEqual(Object.keys(cuerpo).sort(), ['from', 'html', 'subject', 'text', 'to']);
  assert.equal(cuerpo.from, FROM);
  assert.deepEqual(cuerpo.to, [CORREO]);
  assert.equal(cuerpo.subject, ASUNTO);
  assert.match(cuerpo.text, new RegExp(CODIGO));
  assert.match(cuerpo.text, /10 minutos/);
  assert.match(cuerpo.text, /No compartas este código/i);
  assert.match(cuerpo.html, new RegExp(CODIGO));
  assert.match(cuerpo.html, /10 minutos/);
  assert.match(cuerpo.html, /No compartas este código/i);
  assert.equal(cuerpo.html.includes('<img'), false);
  assert.equal(JSON.stringify(cuerpo).includes(API_KEY), false);
});

test('envía el código incluyendo el logo configurado en OTP_LOGO_URL', async () => {
  const fake = crearFetchFicticio({ status: 200 });
  const mailer = crearMailer('resend', {
    env: ENV_RESEND_CON_LOGO,
    fetchImpl: fake.fetch,
  });

  assert.equal(mailer.configurado, true);
  assert.equal(mailer.estaDisponible(), true);

  await mailer.enviarCodigoOtp({
    correo: CORREO,
    codigo: CODIGO,
    minutos: 10,
  });

  assert.equal(fake.llamadas.length, 1);
  const cuerpo = JSON.parse(fake.llamadas[0].opciones.body);
  assert.match(cuerpo.html, /<img src="https:\/\/res\.cloudinary\.com\/o7ozc3zt\/image\/upload\/v1\/clubs-unid\/logo\.png"/);
  assert.match(cuerpo.html, /alt="Clubs UNID"/);
});

test('acepta cualquier respuesta HTTP 2xx como éxito', async () => {
  for (const status of [200, 201, 204, 299]) {
    const fake = crearFetchFicticio({ status });
    const mailer = crearMailerPrueba(fake);

    await mailer.enviarCodigoOtp({ correo: CORREO, codigo: CODIGO, minutos: 10 });
    assert.equal(fake.llamadas.length, 1);
  }
});

test('falla de forma cerrada si faltan variables de Resend', async () => {
  const casos = [
    { env: {}, variables: ['RESEND_API_KEY', 'RESEND_FROM'] },
    { env: { RESEND_API_KEY: API_KEY }, variables: ['RESEND_FROM'] },
    { env: { RESEND_FROM: FROM }, variables: ['RESEND_API_KEY'] },
  ];

  for (const { env, variables } of casos) {
    const fake = crearFetchFicticio();
    const mailer = crearMailer('resend', { env, fetchImpl: fake.fetch });

    assert.equal(mailer.proveedor, 'resend');
    assert.equal(mailer.configurado, false);
    assert.equal(mailer.estaDisponible(), false);

    for (const variable of variables) {
      assert.match(mailer.motivoNoDisponible, new RegExp(variable));
    }

    assertSinSecretos(mailer.motivoNoDisponible);
    await assert.rejects(
      mailer.enviarCodigoOtp({ correo: CORREO, codigo: CODIGO, minutos: 10 }),
      (err) => {
        assert.equal(err.name, 'ErrorEnvioOtp');
        assert.equal(err.code, 'OTP_RESEND_CONFIG');
        assertSinSecretos(err.message);
        return true;
      },
    );
    assert.equal(fake.llamadas.length, 0);
  }
});

test('rechaza API key con espacios y remitente con CRLF', () => {
  const key = leerConfiguracionResend({ ...ENV_RESEND, RESEND_API_KEY: 're clave' });
  const from = leerConfiguracionResend({
    ...ENV_RESEND,
    RESEND_FROM: 'Clubs UNID <no-reply@unid.mx>\r\nBcc: atacante@ejemplo.test',
  });
  const logo = leerConfiguracionResend({
    ...ENV_RESEND,
    OTP_LOGO_URL: 'http://res.cloudinary.com/o7ozc3zt/image/upload/v1/clubs-unid/logo.png',
  });

  assert.ok(key.errores.includes('RESEND_API_KEY inválida'));
  assert.ok(from.errores.includes('RESEND_FROM inválido'));
  assert.ok(logo.errores.includes('OTP_LOGO_URL inválida'));
});

test('rechaza código o destinatario inválidos sin llamar a fetch', async () => {
  const casos = [
    { correo: CORREO, codigo: '12345', code: 'OTP_RESEND_CODIGO' },
    { correo: CORREO, codigo: 'abcdef', code: 'OTP_RESEND_CODIGO' },
    { correo: 'externo@gmail.com', codigo: CODIGO, code: 'OTP_RESEND_DESTINATARIO' },
  ];

  for (const caso of casos) {
    const fake = crearFetchFicticio();
    const mailer = crearMailerPrueba(fake);

    await assert.rejects(
      mailer.enviarCodigoOtp({ correo: caso.correo, codigo: caso.codigo, minutos: 10 }),
      (err) => {
        assert.equal(err.name, 'ErrorEnvioOtp');
        assert.equal(err.code, caso.code);
        assertSinSecretos(err.message);
        return true;
      },
    );
    assert.equal(fake.llamadas.length, 0);
  }
});

test('los errores HTTP de Resend se propagan de forma controlada', async () => {
  for (const status of [401, 422, 429, 500]) {
    const fake = crearFetchFicticio({ status });
    const mailer = crearMailerPrueba(fake);

    await assert.rejects(
      mailer.enviarCodigoOtp({ correo: CORREO, codigo: CODIGO, minutos: 10 }),
      (err) => {
        assert.equal(err.name, 'ErrorEnvioOtp');
        assert.equal(err.code, 'OTP_RESEND_HTTP');
        assert.equal(err.status, status);
        assertSinSecretos(err.message);
        assert.equal(err.message.includes('detalle-interno-de-resend'), false);
        return true;
      },
    );
    assert.equal(fake.llamadas.length, 1);
  }
});

test('un fallo de red se propaga sin credenciales ni código', async () => {
  const causa = new TypeError('fallo de red ficticio');
  causa.cause = { code: 'ECONNREFUSED' };
  const fake = crearFetchFicticio({ error: causa });
  const mailer = crearMailerPrueba(fake);

  await assert.rejects(
    mailer.enviarCodigoOtp({ correo: CORREO, codigo: CODIGO, minutos: 10 }),
    (err) => {
      assert.equal(err.name, 'ErrorEnvioOtp');
      assert.equal(err.code, 'OTP_RESEND_NETWORK');
      assertSinSecretos(err.message);
      return true;
    },
  );
});

test('el timeout se identifica sin exponer datos sensibles', async () => {
  const fake = crearFetchFicticio({ abortar: true });
  const mailer = crearMailerPrueba(fake, { timeoutMs: 10 });

  await assert.rejects(
    mailer.enviarCodigoOtp({ correo: CORREO, codigo: CODIGO, minutos: 10 }),
    (err) => {
      assert.equal(err.name, 'ErrorEnvioOtp');
      assert.equal(err.code, 'OTP_RESEND_TIMEOUT');
      assertSinSecretos(err.message);
      return true;
    },
  );
});

test('el proveedor no escribe API key ni código en consola', async () => {
  const fake = crearFetchFicticio({ status: 500 });
  const mailer = crearMailerPrueba(fake);
  const logs = [];
  const original = console.error;
  console.error = (...args) => logs.push(args.join(' '));

  try {
    await assert.rejects(
      mailer.enviarCodigoOtp({ correo: CORREO, codigo: CODIGO, minutos: 10 }),
    );
    const exitoso = crearFetchFicticio();
    await crearMailerPrueba(exitoso).enviarCodigoOtp({
      correo: CORREO,
      codigo: CODIGO,
      minutos: 10,
    });
  } finally {
    console.error = original;
  }

  assert.equal(logs.length, 0);
});
