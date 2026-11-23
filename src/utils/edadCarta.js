export function formatearEdadCarta(valor) {
  const edad = Number(valor);
  if (!Number.isFinite(edad)) return 'Edad no disponible';
  const anios = Math.floor(edad + 0.000001);
  const meses = Math.round((edad - anios) * 12);
  if (anios === 0) return meses === 1 ? '1 mes' : meses + ' meses';
  if (meses === 0) return anios === 1 ? '1 año' : anios + ' años';
  return `${anios} ${anios === 1 ? 'año' : 'años'} y ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
}
