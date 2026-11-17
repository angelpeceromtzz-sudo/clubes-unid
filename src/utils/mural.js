export function enlaceMural(base) {
  try {
    const url = new URL(base);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
    url.pathname = '/calendario';
    url.search = '?vista=mural';
    url.hash = '';
    return url.href;
  } catch { return ''; }
}

export function clavePublicacionMural(item) {
  return item.origen === 'mural' ? `mural-${item.id_publicacion}` : item.origen === 'fecha' ? `fecha-${item.id_fecha}` : `noticia-${item.id_noticia}`;
}

export function estadoPublicacionMural(item, hoy) {
  const status = item.status || (item.publicada ? 'published' : 'draft');
  if (status === 'pending') return 'Pendiente de aprobación';
  if (status === 'rejected') return 'Devuelta para correcciones';
  if (status === 'published') {
    if (item.fecha_retiro && item.fecha_retiro < hoy) return 'Retirada';
    return 'Publicada';
  }
  return 'Borrador';
}

export const ESTADOS_MURAL = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'Borrador', label: 'Borrador' },
  { value: 'Pendiente de aprobación', label: 'Pendiente de aprobación' },
  { value: 'Publicada', label: 'Publicada' },
  { value: 'Retirada', label: 'Retirada' },
  { value: 'Devuelta para correcciones', label: 'Devuelta para correcciones' },
];
