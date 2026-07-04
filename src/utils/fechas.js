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
