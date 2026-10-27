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
  if (!item.publicada) return 'Borrador';
  if (item.fecha_retiro && item.fecha_retiro < hoy) return 'Retirada';
  return 'Publicada';
}
