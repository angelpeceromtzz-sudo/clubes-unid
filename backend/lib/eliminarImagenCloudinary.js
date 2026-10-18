// Limpieza de imágenes de Cloudinary al reemplazar o eliminar registros.
//
// Corrección del bug de `public_id` doble: `upload.js` fija `folder: 'clubs-unid'`,
// por lo que la `secure_url` guardada en BD ya incluye esa carpeta
// (.../upload/v123/clubs-unid/archivo.jpg). La versión anterior anteponía
// `clubs-unid/` otra vez y el `destroy` apuntaba a un id inexistente: el recurso
// nunca se borraba (huérfano silencioso).
//
// Reglas de uso (Ajuste de la ronda de seguridad):
// 1. Guardar primero el cambio en la base; solo si el UPDATE/DELETE tuvo éxito
//    se llama a `eliminarImagenCloudinary`. Si la escritura falla, el recurso
//    anterior se conserva.
// 2. Antes de destruir, verificar por IDENTIDAD de public_id (no por URL literal)
//    que el recurso no siga referenciado por otra columna/registro. Las
//    candidatas se consultan DESPUÉS de la escritura (estado ya actualizado).
import { v2 as cloudinary } from 'cloudinary';

const CARPETA = 'clubs-unid';

// H18: host de Cloudinary validado por partes del hostname (etiquetas), no
// por substring — `url.includes('cloudinary.com')` es el patrón que CodeQL
// marca como 'Incomplete URL substring sanitization': un URL ajeno como
// `https://atacante.test/upload/v1/x.jpg?q=cloudinary.com` pasaba el check
// y podía derivar en un destroy sobre un asset propio. `new URL` además
// descarta esquemas no http(s) y hostnames malformados.
export function esUrlCloudinary(valor) {
  if (typeof valor !== 'string') return false;
  try {
    const u = new URL(valor);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const host = u.hostname.toLowerCase();
    return host === 'cloudinary.com' || host.endsWith('.cloudinary.com');
  } catch {
    return false;
  }
}

// Extrae el public_id real de una secure_url de Cloudinary.
// Maneja: versión (v123/), transformaciones en URL (w_1920,c_limit/), query
// string, extensión en mayúsculas y la carpeta del upload (no se duplica).
export function extraerPublicId(url) {
  if (!esUrlCloudinary(url)) return null;
  const limpia = url.split(/[?#]/)[0];
  const subida = limpia.match(/\/upload\/(.+)$/);
  if (!subida) return null;
  let camino = subida[1];
  // Segmento de transformación en la URL (p. ej. w_1920,c_limit) — solo si
  // contiene una coma, que es como Cloudinary las compone.
  camino = camino.replace(/^[^/]+,[^/]+\//, '');
  // Versión numérica inmediata al upload.
  camino = camino.replace(/^v\d+\//, '');
  const sinExtension = camino.replace(/\.[A-Za-z0-9]+$/, '');
  if (!sinExtension || sinExtension.startsWith('/') || sinExtension.includes('..')) {
    return null;
  }
  // La URL ya incluye la carpeta del upload; no volver a anteponerla.
  return sinExtension.startsWith(`${CARPETA}/`) ? sinExtension : `${CARPETA}/${sinExtension}`;
}

// Compara dos URLs por identidad de recurso (public_id), no por texto literal:
// dos variantes de la misma imagen (distinta versión o query) cuentan como la
// misma identidad.
export function mismaIdentidad(urlA, urlB) {
  const a = extraerPublicId(urlA);
  const b = extraerPublicId(urlB);
  return Boolean(a && b && a === b);
}

// Destruye el recurso salvo que alguna candidata siga refiriéndolo por
// identidad. Devuelve el desenlace en vez de lanzar: la limpieza nunca debe
// romper la respuesta principal.
export async function eliminarImagenCloudinary(url, { candidatas = [] } = {}) {
  const publicId = extraerPublicId(url);
  if (!publicId) return { eliminada: false, motivo: 'sin-public-id' };
  const referenciada = candidatas.some((c) => mismaIdentidad(url, c));
  if (referenciada) return { eliminada: false, motivo: 'referenciada' };
  try {
    const r = await cloudinary.uploader.destroy(publicId, { invalidate: true });
    return { eliminada: r?.result === 'ok', resultado: r?.result ?? null };
  } catch (err) {
    console.error('Error al eliminar imagen de Cloudinary:', err.message);
    return { eliminada: false, motivo: 'error', error: err.message };
  }
}
