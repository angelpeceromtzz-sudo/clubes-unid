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
