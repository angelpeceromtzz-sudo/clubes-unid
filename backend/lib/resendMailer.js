import { esCorreoInstitucionalValido } from './institutionalEmail.js';
import { crearContenidoOtp, esLogoOtpUrlValida } from './otpMailContent.js';

const URL_RESEND = 'https://api.resend.com/emails';
const TIEMPO_ESPERA_MS = 10000;

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

export function leerConfiguracionResend(env = process.env) {
  const errores = [];
  const apiKey = texto(env.RESEND_API_KEY);
  const from = texto(env.RESEND_FROM);
  const logoUrl = texto(env.OTP_LOGO_URL);

  if (!apiKey) {
    agregarError(errores, 'falta RESEND_API_KEY');
  } else if (tieneSaltoDeLinea(apiKey) || /\s/.test(apiKey)) {
    agregarError(errores, 'RESEND_API_KEY inválida');
  }

  if (!from) {
    agregarError(errores, 'falta RESEND_FROM');
  } else if (tieneSaltoDeLinea(from) || !from.includes('@')) {
    agregarError(errores, 'RESEND_FROM inválido');
  }

  if (logoUrl && !esLogoOtpUrlValida(logoUrl)) {
    agregarError(errores, 'OTP_LOGO_URL inválida');
  }

  return {
    config: { apiKey, from, logoUrl },
    errores,
  };
}

export function crearMailerResend({
  env = process.env,
  fetchImpl = globalThis.fetch,
  timeoutMs = TIEMPO_ESPERA_MS,
} = {}) {
  const { config, errores: erroresConfiguracion } = leerConfiguracionResend(env);
  const errores = [...erroresConfiguracion];
  const espera = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : TIEMPO_ESPERA_MS;

  if (typeof fetchImpl !== 'function') {
    agregarError(errores, 'fetch nativo no disponible');
  }

  function noDisponible(mensaje, code) {
    const err = new Error(mensaje);
    err.name = 'ErrorEnvioOtp';
    err.code = code;
    return err;
  }

  return {
    proveedor: 'resend',
    configurado: errores.length === 0,
    motivoNoDisponible: errores.length > 0 ? errores.join('; ') : null,

    estaDisponible() {
      return errores.length === 0;
    },

    async enviarCodigoOtp({ correo, codigo, expiracion, minutos }) {
      if (errores.length > 0) {
        throw noDisponible(
          `Configuración Resend incompleta: ${errores.join('; ')}`,
          'OTP_RESEND_CONFIG',
        );
      }

      if (!/^\d{6}$/.test(String(codigo))) {
        throw noDisponible('Código OTP inválido', 'OTP_RESEND_CODIGO');
      }

      if (!esCorreoInstitucionalValido(correo)) {
        throw noDisponible('Destinatario OTP inválido', 'OTP_RESEND_DESTINATARIO');
      }

      const contenido = crearContenidoOtp({
        codigo,
        expiracion,
        minutos,
        logoUrl: config.logoUrl,
      });
      const opciones = {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: config.from,
          to: [correo],
          subject: contenido.subject,
          html: contenido.html,
          text: contenido.text,
        }),
        signal: AbortSignal.timeout(espera),
      };

      let respuesta;

      try {
        respuesta = await fetchImpl(URL_RESEND, opciones);
      } catch (err) {
        const causa = err?.cause?.code || err?.code || '';
        const esTimeout =
          err?.name === 'AbortError' ||
          err?.name === 'TimeoutError' ||
          /TIMEOUT/i.test(String(causa));

        throw noDisponible(
          'No se pudo enviar el correo OTP',
          esTimeout ? 'OTP_RESEND_TIMEOUT' : 'OTP_RESEND_NETWORK',
        );
      }

      if (!respuesta || !respuesta.ok) {
        const err = noDisponible('No se pudo enviar el correo OTP', 'OTP_RESEND_HTTP');
        err.status = Number.isInteger(respuesta?.status) ? respuesta.status : null;
        throw err;
      }
    },
  };
}
