/* Utilidades de formato para la vista ejecutiva. */

export function formatearEntero(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('es-MX');
}

export function formatearPorcentaje(numerador, denominador, decimales = 0) {
  const num = Number(numerador) || 0;
  const den = Number(denominador) || 0;
  if (den === 0) return '—';
  const factor = decimales === 0 ? 1 : 10 ** decimales;
  const valor = Math.round((num / den) * 100 * factor) / factor;
  return `${valor.toFixed(decimales)}%`;
}

export function formatearPorcentajeDirecto(valor, decimales = 0) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(decimales)}%`;
}

export function formatearFecha(fecha) {
  if (!fecha) return 'Sin fecha';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return 'Fecha inválida';
  return d.toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function truncarTexto(texto, maximo = 20) {
  const t = String(texto || '');
  return t.length > maximo ? `${t.slice(0, maximo)}…` : t;
}
