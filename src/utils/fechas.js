export function calcularTiempoRestante(fechaExpiracion) {
  if (!fechaExpiracion) return null;
  const ahora = new Date();
  const exp = new Date(fechaExpiracion);
  const diff = exp - ahora;
  if (diff <= 0) return 'Expirada';

  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (dias > 0) return `${dias} día${dias !== 1 ? 's' : ''}`;
  if (horas > 0) return `${horas} hora${horas !== 1 ? 's' : ''}`;
  return 'Menos de 1 hora';
}

export function formatearFechaLegible(fechaIso) {
  if (!fechaIso) return '';
  const fecha = new Date(fechaIso);
  return fecha.toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: 'America/Mexico_City',
  });
}

export function toDatetimeLocal(fechaIso) {
  if (!fechaIso) return '';
  const d = new Date(fechaIso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function fromDatetimeLocal(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}
