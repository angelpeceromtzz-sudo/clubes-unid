export const CATEGORIAS_EVENTO = [
  { value: 'social', label: 'Social' },
  { value: 'deportivo', label: 'Deportivo' },
  { value: 'cultural', label: 'Cultural' },
];

export function normalizarCategoriaEvento(value) {
  return CATEGORIAS_EVENTO.some((categoria) => categoria.value === value) ? value : 'social';
}

export function nombreCategoriaEvento(value) {
  return CATEGORIAS_EVENTO.find((categoria) => categoria.value === normalizarCategoriaEvento(value)).label;
}
