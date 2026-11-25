import { DOMINIOS_OTP } from './otpAcceso.js';

const LONGITUD_MAXIMA_LOCAL = 64;

function separarCorreo(valor) {
  const texto = String(valor ?? '').trim().toLowerCase();

  if (!texto || /\s/.test(texto)) {
    return null;
  }

  const arroba = texto.indexOf('@');
  if (arroba !== texto.lastIndexOf('@')) {
    return null;
  }

  const parteLocal = arroba === -1 ? texto : texto.slice(0, arroba);
  if (!parteLocal || parteLocal.length > LONGITUD_MAXIMA_LOCAL) {
    return null;
  }

  return {
    parteLocal,
    dominio: arroba === -1 ? '' : texto.slice(arroba + 1),
  };
}

/**
 * Devuelve correos institucionales completos candidatos para el valor escrito.
 * Nunca modifica el valor: solo propone opciones que ya pasan la validación OTP.
 */
export function obtenerSugerenciasCorreo(valor, dominios = DOMINIOS_OTP) {
  const separado = separarCorreo(valor);
  if (!separado) {
    return [];
  }

  if (dominios.includes(separado.dominio)) {
    return [];
  }

  return dominios
    .filter((dominio) => dominio.startsWith(separado.dominio))
    .map((dominio) => aplicarDominioCorreo(valor, dominio));
}

/** Añade o reemplaza el dominio de un correo conservando su parte local. */
export function aplicarDominioCorreo(valor, dominio) {
  const separado = separarCorreo(valor);
  const dominioNormalizado = String(dominio ?? '').trim().toLowerCase().replace(/^@/, '');

  if (!separado || !dominioNormalizado) {
    return String(valor ?? '').trim().toLowerCase();
  }

  return `${separado.parteLocal}@${dominioNormalizado}`;
}
