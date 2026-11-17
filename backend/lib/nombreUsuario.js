export const LARGO_MINIMO_NOMBRE = 3;
export const LARGO_MAXIMO_NOMBRE = 150;

const CARACTERES_CONTROL = /\p{Cc}/gu;
const ESPACIOS = /\s+/g;
const TIENE_LETRA = /\p{L}/u;
const TIENE_DIGITO = /\d/;

export function normalizarNombreCompleto(valor) {
  if (typeof valor !== 'string') {
    return '';
  }

  return valor
    .normalize('NFC')
    .replace(CARACTERES_CONTROL, ' ')
    .replace(ESPACIOS, ' ')
    .trim();
}

export function validarNombreCompleto(valor, correo) {
  const nombre = normalizarNombreCompleto(valor);

  if (!nombre) {
    return { valido: false, nombre, error: 'Escribe tu nombre completo.' };
  }

  if (nombre.length < LARGO_MINIMO_NOMBRE) {
    return {
      valido: false,
      nombre,
      error: 'El nombre debe tener al menos 3 caracteres.',
    };
  }

  if (nombre.length > LARGO_MAXIMO_NOMBRE) {
    return {
      valido: false,
      nombre,
      error: 'El nombre no puede superar los 150 caracteres.',
    };
  }

  if (nombre.includes('@')) {
    return {
      valido: false,
      nombre,
      error: 'Escribe tu nombre completo, no tu correo.',
    };
  }

  if (TIENE_DIGITO.test(nombre)) {
    return {
      valido: false,
      nombre,
      error: 'Escribe tu nombre completo, no tu matrícula.',
    };
  }

  if (!TIENE_LETRA.test(nombre)) {
    return { valido: false, nombre, error: 'Escribe tu nombre completo.' };
  }

  const parteLocal = String(correo ?? '').split('@')[0].trim().toLowerCase();

  if (parteLocal && nombre.toLowerCase() === parteLocal) {
    return {
      valido: false,
      nombre,
      error: 'Escribe tu nombre completo, no tu matrícula.',
    };
  }

  return { valido: true, nombre, error: '' };
}
