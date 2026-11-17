// Las imágenes del mural solo pueden apuntar a HTTP(S) o a cargas locales.
export function imagenMuralSegura(valor) {
  if (typeof valor !== 'string' || /[\s\\]/.test(valor)) return null;
  if (valor.startsWith('/uploads/')) return valor;
  try {
    const url = new URL(valor);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

// El nombre de un control nunca puede sobrescribir la imagen ni los metadatos.
export function actualizarCampoMural(actual, nombre, valor) {
  switch (nombre) {
    case 'titulo': return { ...actual, titulo: valor };
    case 'subtitulo': return { ...actual, subtitulo: valor };
    case 'contenido': return { ...actual, contenido: valor };
    case 'enlace_url': return { ...actual, enlace_url: valor };
    case 'enlace_texto': return { ...actual, enlace_texto: valor };
    case 'fecha_retiro': return { ...actual, fecha_retiro: valor };
    case 'destacada': return { ...actual, destacada: valor === true };
    default: return actual;
  }
}

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
