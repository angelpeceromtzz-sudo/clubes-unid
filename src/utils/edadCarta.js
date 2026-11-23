export function formatearEdadCarta(valor) {
  const edad = Number(valor);
  if (!Number.isInteger(edad) || edad < 0 || edad > 100) return 'Edad no disponible';
  return edad === 0 ? 'Menos de 1 año' : edad === 1 ? '1 año' : edad + ' años';
}
