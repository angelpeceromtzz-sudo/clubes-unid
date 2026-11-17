import { normalizarCorreoOtp } from './otpAcceso.js';

export const LARGO_MINIMO_NOMBRE_OTP = 3;
export const LARGO_MAXIMO_NOMBRE_OTP = 150;

const CARACTERES_CONTROL = /\p{Cc}/gu;
const ESPACIOS = /\s+/g;
const TIENE_LETRA = /\p{L}/u;
const TIENE_DIGITO = /\d/;

export function normalizarNombreOtp(valor) {
  if (typeof valor !== 'string') {
    return '';
  }

  return valor
    .normalize('NFC')
    .replace(CARACTERES_CONTROL, ' ')
    .replace(ESPACIOS, ' ')
    .trim();
}

export function validarNombreOtp(valor, correo) {
  const nombre = normalizarNombreOtp(valor);

  if (!nombre) {
    return 'Escribe tu nombre completo.';
  }

  if (nombre.length < LARGO_MINIMO_NOMBRE_OTP) {
    return 'El nombre debe tener al menos 3 caracteres.';
  }

  if (nombre.length > LARGO_MAXIMO_NOMBRE_OTP) {
    return 'El nombre no puede superar los 150 caracteres.';
  }

  if (nombre.includes('@')) {
    return 'Escribe tu nombre completo, no tu correo.';
  }

  if (TIENE_DIGITO.test(nombre)) {
    return 'Escribe tu nombre completo, no tu matrícula.';
  }

  if (!TIENE_LETRA.test(nombre)) {
    return 'Escribe tu nombre completo.';
  }

  const correoNormalizado = normalizarCorreoOtp(correo);
  const parteLocal = correoNormalizado.split('@')[0];

  if (parteLocal && nombre.toLowerCase() === parteLocal) {
    return 'Escribe tu nombre completo, no tu matrícula.';
  }

  return '';
}

export function requiereNombreOtp(respuesta) {
  return respuesta?.requiere_nombre === true;
}

export function errorRequiereNombreOtp(error) {
  return error?.cuerpo?.requiere_nombre === true;
}
