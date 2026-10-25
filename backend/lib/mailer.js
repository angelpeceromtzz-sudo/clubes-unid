import { crearMailerSmtp } from './smtpMailer.js';

const OUTBOX_MOCK = [];

function normalizarProveedor(proveedor) {
  const valor = typeof proveedor === 'string' ? proveedor.trim().toLowerCase() : '';
  return valor || 'mock';
}

export function crearMailerMock() {
  return {
    proveedor: 'mock',
    configurado: true,
    motivoNoDisponible: null,

    estaDisponible() {
      return true;
    },

    async enviarCodigoOtp({ correo, codigo, expiracion, minutos = 10 }) {
      OUTBOX_MOCK.push({
        correo,
        codigo,
        expiracion: expiracion instanceof Date ? expiracion : new Date(expiracion),
        minutos,
        enviadoEn: new Date(),
      });
    },

    obtenerEnviados() {
      return OUTBOX_MOCK.slice();
    },

    limpiarEnviados() {
      OUTBOX_MOCK.length = 0;
    },
  };
}

function crearMailerNoConfigurado(proveedor) {
  const motivo = `OTP_MAIL_PROVIDER="${proveedor}" no está soportado`;

  return {
    proveedor,
    configurado: false,
    motivoNoDisponible: motivo,

    estaDisponible() {
      return false;
    },

    async enviarCodigoOtp() {
      const err = new Error(motivo);
      err.code = 'OTP_MAIL_PROVIDER';
      throw err;
    },
  };
}

export function crearMailer(
  proveedor = process.env.OTP_MAIL_PROVIDER || 'mock',
  opciones = {},
) {
  const normalizado = normalizarProveedor(proveedor);

  if (normalizado === 'mock') {
    return crearMailerMock();
  }

  if (normalizado === 'smtp') {
    return crearMailerSmtp({
      env: opciones.env || process.env,
      crearTransporte: opciones.crearTransporte,
    });
  }

  return crearMailerNoConfigurado(normalizado);
}

export const mailer = crearMailer();
