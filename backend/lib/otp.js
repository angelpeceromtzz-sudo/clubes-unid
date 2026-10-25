import crypto from 'node:crypto';

export const LONGITUD_CODIGO_OTP = 6;
export const MAX_INTENTOS_OTP = 5;
export const MINUTOS_EXPIRACION_OTP_POR_DEFECTO = 10;

const LIMITE_CODIGO = 10 ** LONGITUD_CODIGO_OTP;

function enteroPositivo(texto, defecto) {
  const numero = Number.parseInt(texto ?? '', 10);
  return Number.isInteger(numero) && numero > 0 ? numero : defecto;
}

export function normalizarCodigoOtp(codigo) {
  return typeof codigo === 'string' ? codigo.trim() : '';
}

export function esCodigoOtpValido(codigo) {
  return /^\d{6}$/.test(normalizarCodigoOtp(codigo));
}

export function generarCodigoOtp() {
  return String(crypto.randomInt(0, LIMITE_CODIGO)).padStart(LONGITUD_CODIGO_OTP, '0');
}

export function obtenerPepperOtp() {
  const pepper = process.env.OTP_PEPPER;

  if (typeof pepper !== 'string' || pepper.length === 0) {
    throw new Error('OTP_PEPPER no está configurado');
  }

  return pepper;
}

export function generarHashOtp(codigo, pepper = obtenerPepperOtp()) {
  const codigoNormalizado = normalizarCodigoOtp(codigo);

  if (!/^\d{6}$/.test(codigoNormalizado)) {
    throw new Error('Código OTP inválido');
  }

  return crypto
    .createHmac('sha256', pepper)
    .update(codigoNormalizado)
    .digest('hex');
}

export function compararHashOtp(codigo, hashEsperado, pepper = obtenerPepperOtp()) {
  if (typeof hashEsperado !== 'string' || !/^[a-f0-9]{64}$/i.test(hashEsperado)) {
    return false;
  }

  try {
    const hashCalculado = generarHashOtp(codigo, pepper);
    const calculado = Buffer.from(hashCalculado, 'hex');
    const esperado = Buffer.from(hashEsperado, 'hex');

    return calculado.length === esperado.length && crypto.timingSafeEqual(calculado, esperado);
  } catch {
    return false;
  }
}

export function obtenerMinutosExpiracionOtp() {
  return enteroPositivo(process.env.OTP_EXPIRATION_MINUTES, MINUTOS_EXPIRACION_OTP_POR_DEFECTO);
}

export function calcularExpiracionOtp(desde = new Date(), minutos = obtenerMinutosExpiracionOtp()) {
  return new Date(desde.getTime() + minutos * 60 * 1000);
}

export function estaExpiradoOtp(expiraEn, ahora = new Date()) {
  const fecha = expiraEn instanceof Date ? expiraEn : new Date(expiraEn);

  if (Number.isNaN(fecha.getTime())) {
    return true;
  }

  return fecha.getTime() <= ahora.getTime();
}

export function segundosHastaExpiracionOtp(expiraEn, ahora = new Date()) {
  const fecha = expiraEn instanceof Date ? expiraEn : new Date(expiraEn);

  if (Number.isNaN(fecha.getTime())) {
    return 0;
  }

  return Math.max(0, Math.ceil((fecha.getTime() - ahora.getTime()) / 1000));
}
