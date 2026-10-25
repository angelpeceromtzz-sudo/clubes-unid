import { esCorreoInstitucionalValido } from './institutionalEmail.js';
import { crearContenidoOtp } from './otpMailContent.js';

const TIEMPO_CONEXION_MS = 10000;
const TIEMPO_SALUDO_MS = 10000;
const TIEMPO_SOCKET_MS = 20000;

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function tieneSaltoDeLinea(valor) {
  return /[\r\n]/.test(valor);
}

function agregarError(errores, mensaje) {
  if (!errores.includes(mensaje)) {
    errores.push(mensaje);
  }
}

export function leerConfiguracionSmtp(env = process.env) {
  const errores = [];
  const host = texto(env.SMTP_HOST);
  const puertoTexto = texto(env.SMTP_PORT);
  const puerto = Number(puertoTexto);
  const from = texto(env.SMTP_FROM);
  const usuario = texto(env.SMTP_USER);
  const password = typeof env.SMTP_PASSWORD === 'string' ? env.SMTP_PASSWORD : '';
  const secureTexto = texto(env.SMTP_SECURE).toLowerCase();
  const secure = secureTexto === 'true' || secureTexto === '1';

  if (!host) {
    agregarError(errores, 'falta SMTP_HOST');
  } else if (tieneSaltoDeLinea(host) || /\s/.test(host)) {
    agregarError(errores, 'SMTP_HOST inválido');
  }

  if (!puertoTexto) {
    agregarError(errores, 'falta SMTP_PORT');
  } else if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
    agregarError(errores, 'SMTP_PORT inválido');
  }

  if (!from) {
    agregarError(errores, 'falta SMTP_FROM');
  } else if (tieneSaltoDeLinea(from) || !from.includes('@')) {
    agregarError(errores, 'SMTP_FROM inválido');
  }

  if (secureTexto && !['true', 'false', '1', '0'].includes(secureTexto)) {
    agregarError(errores, 'SMTP_SECURE inválido');
  }

  if (usuario && !password) {
    agregarError(errores, 'falta SMTP_PASSWORD');
  } else if (!usuario && password) {
    agregarError(errores, 'falta SMTP_USER');
  }

  return {
    config: {
      host,
      port: puerto,
      secure,
      from,
      auth: usuario && password ? { user: usuario, pass: password } : null,
    },
    errores,
  };
}

export function crearOpcionesNodemailer(config) {
  return {
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure,
    auth: config.auth || undefined,
    pool: true,
    maxConnections: 2,
    maxMessages: 50,
    connectionTimeout: TIEMPO_CONEXION_MS,
    greetingTimeout: TIEMPO_SALUDO_MS,
    socketTimeout: TIEMPO_SOCKET_MS,
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false,
    debug: false,
    tls: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    },
  };
}

async function crearTransporteNodemailer(config) {
  const { default: nodemailer } = await import('nodemailer');

  return nodemailer.createTransport(crearOpcionesNodemailer(config));
}

export function crearMensajeOtp({ correo, codigo, expiracion, minutos, from }) {
  const { subject, text } = crearContenidoOtp({ codigo, expiracion, minutos });

  return {
    from,
    to: correo,
    subject,
    text,
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}

export function crearMailerSmtp({
  env = process.env,
  crearTransporte = crearTransporteNodemailer,
} = {}) {
  const { config, errores } = leerConfiguracionSmtp(env);
  let transporte = null;

  return {
    proveedor: 'smtp',
    configurado: errores.length === 0,
    motivoNoDisponible: errores.length > 0 ? errores.join('; ') : null,

    estaDisponible() {
      return errores.length === 0;
    },

    async enviarCodigoOtp({ correo, codigo, expiracion, minutos }) {
      if (errores.length > 0) {
        const err = new Error(`Configuración SMTP incompleta: ${errores.join('; ')}`);
        err.code = 'OTP_SMTP_CONFIG';
        throw err;
      }

      if (!/^\d{6}$/.test(String(codigo))) {
        const err = new Error('Código OTP inválido');
        err.code = 'OTP_SMTP_CODIGO';
        throw err;
      }

      if (!esCorreoInstitucionalValido(correo)) {
        const err = new Error('Destinatario OTP inválido');
        err.code = 'OTP_SMTP_DESTINATARIO';
        throw err;
      }

      const mensaje = crearMensajeOtp({
        correo,
        codigo,
        expiracion,
        minutos,
        from: config.from,
      });

      try {
        if (!transporte) {
          transporte = await crearTransporte(config);
        }

        await transporte.sendMail(mensaje);
      } catch (err) {
        const error = new Error('No se pudo enviar el correo OTP');
        error.name = 'ErrorEnvioOtp';
        error.code = err?.code || 'OTP_SMTP_SEND';
        throw error;
      }
    },

    async cerrar() {
      if (transporte && typeof transporte.close === 'function') {
        transporte.close();
      }
    },
  };
}
