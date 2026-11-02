export const CATEGORIAS_EVENTO = [
  { value: 'social', label: 'Social', icono: 'users' },
  { value: 'deportivo', label: 'Deportivo', icono: 'trophy' },
  { value: 'cultural', label: 'Cultural', icono: 'drama' },
];

const ESTILOS_CATEGORIA_EVENTO = {
  social: { punto: 'bg-indigo-400', claro: 'bg-indigo-100 text-indigo-800', oscuro: 'bg-indigo-500/20 text-indigo-200' },
  deportivo: { punto: 'bg-red-400', claro: 'bg-red-100 text-red-800', oscuro: 'bg-red-500/20 text-red-200' },
  cultural: { punto: 'bg-rose-400', claro: 'bg-rose-100 text-rose-800', oscuro: 'bg-rose-500/20 text-rose-200' },
};

export function estiloCategoriaEvento(value, modoOscuro) {
  const estilo = ESTILOS_CATEGORIA_EVENTO[normalizarCategoriaEvento(value)];
  return { punto: estilo.punto, badge: estilo[modoOscuro ? 'oscuro' : 'claro'] };
}

export function normalizarCategoriaEvento(value) {
  return CATEGORIAS_EVENTO.some((categoria) => categoria.value === value) ? value : 'social';
}

export function nombreCategoriaEvento(value) {
  return CATEGORIAS_EVENTO.find((categoria) => categoria.value === normalizarCategoriaEvento(value)).label;
}

export function iconoCategoriaEvento(value) {
  return CATEGORIAS_EVENTO.find((categoria) => categoria.value === normalizarCategoriaEvento(value)).icono;
}
