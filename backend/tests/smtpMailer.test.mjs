import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearMailer, crearMailerMock } from '../lib/mailer.js';
import {
  crearOpcionesNodemailer,
  leerConfiguracionSmtp,
} from '../lib/smtpMailer.js';

const CORREO = 'alumno@red.unid.mx';
const CODIGO = '654321';
const PASSWORD_FICTICIO = 'password-smtp-ficticio';

const ENV_SMTP = Object.freeze({
  SMTP_HOST: 'smtp.ejemplo.test',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_USER: 'usuario-ficticio',
  SMTP_PASSWORD: PASSWORD_FICTICIO,
  SMTP_FROM: 'Clubs UNID <no-reply@unid.mx>',
});

function crearTransporteFicticio() {
  const estado = { config: null, mensaje: null, llamadas: 0 };

  return {
    estado,
    crearTransporte: async (config) => {
      estado.config = config;
      estado.llamadas += 1;

      return {
        async sendMail(mensaje) {
          estado.mensaje = mensaje;
          return { messageId: 'mensaje-ficticio' };
        },
      };
    },
  };
}

function assertSinCodigoNiPassword(texto) {
  assert.equal(String(texto).includes(CODIGO), false);
  assert.equal(String(texto).includes(PASSWORD_FICTICIO), false);
}

test('mock es el proveedor predeterminado', () => {
  const original = process.env.OTP_MAIL_PROVIDER;
  delete process.env.OTP_MAIL_PROVIDER;

  try {
    const mailer = crearMailer();
    assert.equal(mailer.proveedor, 'mock');
    assert.equal(mailer.estaDisponible(), true);
  } finally {
    if (original === undefined) {
      delete process.env.OTP_MAIL_PROVIDER;
    } else {
      process.env.OTP_MAIL_PROVIDER = original;
    }
  }
});

test('selecciona el proveedor mock', () => {
  const mailer = crearMailer('mock');

  assert.equal(mailer.proveedor, 'mock');
  assert.equal(mailer.configurado, true);
  assert.equal(mailer.estaDisponible(), true);
});

test('selecciona el proveedor smtp cuando la configuración está completa', () => {
  const transporte = crearTransporteFicticio();
  const mailer = crearMailer('smtp', {
    env: ENV_SMTP,
    crearTransporte: transporte.crearTransporte,
  });

  assert.equal(mailer.proveedor, 'smtp');
  assert.equal(mailer.configurado, true);
  assert.equal(mailer.estaDisponible(), true);
  assert.equal(mailer.motivoNoDisponible, null);
});

test('el mock sigue guardando el código sin enviar correos', async () => {
  const mailer = crearMailerMock();
  mailer.limpiarEnviados();

  await mailer.enviarCodigoOtp({
    correo: CORREO,
    codigo: CODIGO,
    expiracion: new Date(Date.now() + 10 * 60 * 1000),
    minutos: 10,
  });

  const enviados = mailer.obtenerEnviados();
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].correo, CORREO);
  assert.equal(enviados[0].codigo, CODIGO);
  assert.equal(enviados[0].minutos, 10);
});

test('falla de forma controlada si faltan variables SMTP y no crea transporte', async () => {
  let transporteCreado = false;
  const mailer = crearMailer('smtp', {
    env: {},
    crearTransporte: async () => {
      transporteCreado = true;
      return { sendMail: async () => ({}) };
    },
  });

  assert.equal(mailer.proveedor, 'smtp');
  assert.equal(mailer.configurado, false);
  assert.equal(mailer.estaDisponible(), false);
  assert.match(mailer.motivoNoDisponible, /SMTP_HOST/);
  assert.match(mailer.motivoNoDisponible, /SMTP_PORT/);
  assert.match(mailer.motivoNoDisponible, /SMTP_FROM/);

  await assert.rejects(
    mailer.enviarCodigoOtp({ correo: CORREO, codigo: CODIGO, minutos: 10 }),
    (err) => {
      assert.equal(err.code, 'OTP_SMTP_CONFIG');
      assertSinCodigoNiPassword(err.message);
      return true;
    },
  );

  assert.equal(transporteCreado, false);
});

test('rechaza autenticación SMTP incompleta', () => {
  const sinPassword = leerConfiguracionSmtp({ ...ENV_SMTP, SMTP_PASSWORD: '' });
  const sinUsuario = leerConfiguracionSmtp({ ...ENV_SMTP, SMTP_USER: '' });

  assert.ok(sinPassword.errores.includes('falta SMTP_PASSWORD'));
  assert.ok(sinUsuario.errores.includes('falta SMTP_USER'));
});

test('rechaza puerto, secure y remitente inválidos', () => {
  const puerto = leerConfiguracionSmtp({ ...ENV_SMTP, SMTP_PORT: '70000' });
  const secure = leerConfiguracionSmtp({ ...ENV_SMTP, SMTP_SECURE: 'si' });
  const from = leerConfiguracionSmtp({ ...ENV_SMTP, SMTP_FROM: 'sin-arroba' });
  const crlf = leerConfiguracionSmtp({
    ...ENV_SMTP,
    SMTP_FROM: 'Clubs UNID <no-reply@unid.mx>\r\nBcc: atacante@ejemplo.test',
  });

  assert.ok(puerto.errores.includes('SMTP_PORT inválido'));
  assert.ok(secure.errores.includes('SMTP_SECURE inválido'));
  assert.ok(from.errores.includes('SMTP_FROM inválido'));
  assert.ok(crlf.errores.includes('SMTP_FROM inválido'));
});

test('envío SMTP exitoso simulado incluye solo el contenido necesario', async () => {
  const transporte = crearTransporteFicticio();
  const mailer = crearMailer('smtp', {
    env: ENV_SMTP,
    crearTransporte: transporte.crearTransporte,
  });

  await mailer.enviarCodigoOtp({
    correo: CORREO,
    codigo: CODIGO,
    expiracion: new Date(Date.now() + 10 * 60 * 1000),
    minutos: 10,
  });

  assert.equal(transporte.estado.llamadas, 1);
  assert.equal(transporte.estado.config.host, ENV_SMTP.SMTP_HOST);
  assert.equal(transporte.estado.config.port, 587);
  assert.equal(transporte.estado.config.secure, false);
  assert.equal(transporte.estado.config.auth.user, ENV_SMTP.SMTP_USER);
  assert.equal(transporte.estado.config.auth.pass, PASSWORD_FICTICIO);

  const mensaje = transporte.estado.mensaje;
  assert.equal(mensaje.to, CORREO);
  assert.equal(mensaje.from, ENV_SMTP.SMTP_FROM);
  assert.equal(mensaje.subject, 'Tu código de acceso a Clubs UNID');
  assert.match(mensaje.text, /Clubs UNID/);
  assert.match(mensaje.text, new RegExp(CODIGO));
  assert.match(mensaje.text, /10 minutos/);
  assert.match(mensaje.text, /Si no solicitaste este código/i);
  assert.equal(mensaje.disableFileAccess, true);
  assert.equal(mensaje.disableUrlAccess, true);
  assert.equal(mensaje.text.includes('id_usuario'), false);
  assert.equal(mensaje.text.includes('id_rol'), false);
});

test('el transporte SMTP exige TLS y no permite archivos ni URLs', () => {
  const { config } = leerConfiguracionSmtp(ENV_SMTP);
  const opciones = crearOpcionesNodemailer(config);

  assert.equal(opciones.requireTLS, true);
  assert.equal(opciones.tls.rejectUnauthorized, true);
  assert.equal(opciones.tls.minVersion, 'TLSv1.2');
  assert.equal(opciones.disableFileAccess, true);
  assert.equal(opciones.disableUrlAccess, true);
  assert.equal(opciones.logger, false);
  assert.equal(opciones.debug, false);
  assert.equal(opciones.pool, true);
});

test('SMTP seguro directo no exige STARTTLS', () => {
  const { config } = leerConfiguracionSmtp({ ...ENV_SMTP, SMTP_SECURE: 'true' });
  const opciones = crearOpcionesNodemailer(config);

  assert.equal(config.secure, true);
  assert.equal(opciones.secure, true);
  assert.equal(opciones.requireTLS, false);
});

test('error de conexión SMTP se propaga sin el código ni credenciales', async () => {
  const mailer = crearMailer('smtp', {
    env: ENV_SMTP,
    crearTransporte: async () => ({
      async sendMail() {
        const err = new Error(`ECONNECTION al enviar ${CODIGO} con ${PASSWORD_FICTICIO}`);
        err.code = 'ECONNECTION';
        throw err;
      },
    }),
  });

  await assert.rejects(
    mailer.enviarCodigoOtp({ correo: CORREO, codigo: CODIGO, minutos: 10 }),
    (err) => {
      assert.equal(err.name, 'ErrorEnvioOtp');
      assert.equal(err.code, 'ECONNECTION');
      assertSinCodigoNiPassword(err.message);
      return true;
    },
  );
});

test('un proveedor desconocido no está disponible y falla cerrado', async () => {
  const mailer = crearMailer('otro-proveedor');

  assert.equal(mailer.configurado, false);
  assert.equal(mailer.estaDisponible(), false);

  await assert.rejects(
    mailer.enviarCodigoOtp({ correo: CORREO, codigo: CODIGO, minutos: 10 }),
    (err) => {
      assert.equal(err.code, 'OTP_MAIL_PROVIDER');
      assertSinCodigoNiPassword(err.message);
      return true;
    },
  );
});
