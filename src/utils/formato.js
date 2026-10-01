/* Utilidades de formato de texto. */

export function formatearNombre(nombre) {
  if (!nombre) return '';
  return nombre
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function fechaRelativa(fecha) {
  const ahora = new Date();
  const entonces = new Date(fecha);
  const diffMs = ahora - entonces;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDias = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Ahora mismo';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHrs < 24) return `Hace ${diffHrs}h`;
  if (diffDias < 7) return `Hace ${diffDias}d`;
  return entonces.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

export function fechaCorta(fecha) {
  return new Date(fecha).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function contarPalabras(texto) {
  if (!texto) return 0;
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

// Recorta el texto a un máximo de palabras para la vista previa.
// Al cortar por espacios, los saltos de línea del original se colapsan en espacios.
export function recortarPalabras(texto, limite) {
  if (!texto) return '';
  if (contarPalabras(texto) <= limite) return texto;

  const palabras = texto.trim().split(/\s+/);
  return palabras.slice(0, limite).join(' ');
}
