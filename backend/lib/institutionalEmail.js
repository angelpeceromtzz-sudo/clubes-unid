// Validación centralizada del correo institucional para el flujo OTP.
//
// No se usa una condición amplia del tipo endsWith('.unid.mx'): el dominio se
// compara exactamente contra la lista permitida. Así se rechazan dominios
// parecidos (otro-unid.mx), subdominios no autorizados (sub.red.unid.mx) y
// sufijos engañosos (unid.mx.otrodominio.com).

export const DOMINIOS_INSTITUCIONALES_PERMITIDOS = Object.freeze([
  'red.unid.mx',
  'unid.mx',
]);

const LONGITUD_MAXIMA_CORREO = 100;
const LONGITUD_MAXIMA_PARTE_LOCAL = 64;

// Además de letras y dígitos, se aceptan los caracteres habituales de una
// parte local. Los espacios quedan fuera a propósito.
const PARTE_LOCAL_PERMITIDA = /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/i;

export function normalizarCorreoInstitucional(correo) {
  if (typeof correo !== 'string') {
    return '';
  }

  return correo.trim().toLowerCase();
}

export function esCorreoInstitucionalValido(correo) {
  const normalizado = normalizarCorreoInstitucional(correo);

  if (!normalizado || normalizado.length > LONGITUD_MAXIMA_CORREO) {
    return false;
  }

  if (normalizado.includes(' ')) {
    return false;
  }

  const partes = normalizado.split('@');
  if (partes.length !== 2) {
    return false;
  }

  const [parteLocal, dominio] = partes;

  if (!parteLocal || !dominio) {
    return false;
  }

  if (parteLocal.length > LONGITUD_MAXIMA_PARTE_LOCAL) {
    return false;
  }

  if (!PARTE_LOCAL_PERMITIDA.test(parteLocal)) {
    return false;
  }

  if (parteLocal.startsWith('.') || parteLocal.endsWith('.') || parteLocal.includes('..')) {
    return false;
  }

  return DOMINIOS_INSTITUCIONALES_PERMITIDOS.includes(dominio);
}

export function obtenerDominioCorreo(correo) {
  const normalizado = normalizarCorreoInstitucional(correo);
  const partes = normalizado.split('@');

  return partes.length === 2 ? partes[1] : '';
}
