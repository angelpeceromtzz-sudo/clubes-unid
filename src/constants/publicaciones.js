const ESTILOS_PUBLICACION = {
  evento: {
    label: 'Evento', icono: 'calendar', punto: 'bg-red-400', pin: 'bg-red-500 border-red-300', acento: 'border-red-500',
    oscuro: { badge: 'border-red-400/40 bg-red-500/15 text-red-300', borde: 'border-red-500/50', texto: 'text-red-300', fondo: 'bg-red-500/10' },
    claro: { badge: 'border-red-200 bg-red-50 text-red-700', borde: 'border-red-300', texto: 'text-red-700', fondo: 'bg-red-50' },
  },
  informativo: {
    label: 'Informativo', icono: 'info', punto: 'bg-blue-400', pin: 'bg-blue-500 border-blue-300', acento: 'border-blue-500',
    oscuro: { badge: 'border-blue-400/40 bg-blue-500/15 text-blue-300', borde: 'border-blue-500/50', texto: 'text-blue-300', fondo: 'bg-blue-500/10' },
    claro: { badge: 'border-blue-200 bg-blue-50 text-blue-700', borde: 'border-blue-300', texto: 'text-blue-700', fondo: 'bg-blue-50' },
  },
  promocion: {
    label: 'Promoción', icono: 'star', punto: 'bg-amber-400', pin: 'bg-amber-500 border-amber-300', acento: 'border-amber-500',
    oscuro: { badge: 'border-amber-400/40 bg-amber-500/15 text-amber-300', borde: 'border-amber-500/50', texto: 'text-amber-300', fondo: 'bg-amber-500/10' },
    claro: { badge: 'border-amber-200 bg-amber-50 text-amber-800', borde: 'border-amber-300', texto: 'text-amber-800', fondo: 'bg-amber-50' },
  },
};

export function estiloPublicacion(categoria, modoOscuro) {
  const estilo = ESTILOS_PUBLICACION[categoria] || ESTILOS_PUBLICACION.informativo;
  return { ...estilo, ...estilo[modoOscuro ? 'oscuro' : 'claro'] };
}
