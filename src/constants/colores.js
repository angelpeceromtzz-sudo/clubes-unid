export const COLORES_BADGE = {
  Deportes: (dark) =>
    dark
      ? "text-amber-300 bg-amber-400/10 border-amber-400/20"
      : "text-amber-700 bg-amber-100 border-amber-200",
  Cultura: (dark) =>
    dark
      ? "text-green-300 bg-green-400/10 border-green-400/20"
      : "text-green-700 bg-green-100 border-green-200",
  Tecnología: (dark) =>
    dark
      ? "text-blue-300 bg-blue-400/10 border-blue-400/20"
      : "text-blue-700 bg-blue-100 border-blue-200",
};

export function clasesBadge(categoria, modoOscuro) {
  const fn = COLORES_BADGE[categoria];
  return fn ? fn(modoOscuro) : COLORES_BADGE.Deportes(modoOscuro);
}
