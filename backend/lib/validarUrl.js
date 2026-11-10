// H10: validación de URLs que el usuario persiste y que luego se renderizan
// como href (ubicacion_maps) o como src de imagen (imagen_portada).
// Bloquea esquemas activos como javascript: o data:; solo se admite http(s)
// y, para portadas, rutas locales /uploads/ (patrón soportado por
// src/utils/imagen.js).

function esHttpUrl(valor) {
  try {
    const url = new URL(valor);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

// Campo opcional: vacío, null o undefined se aceptan (equivale a "sin URL").
// Límite = VARCHAR(500) de horarios_club.ubicacion_maps.
export function esUrlMapsValida(valor) {
  if (valor === undefined || valor === null || valor === '') return true;
  if (typeof valor !== 'string') return false;
  if (valor.length > 500) return false;
  return esHttpUrl(valor);
}

// Campo opcional: vacío se convierte en null al guardar. Límite = VARCHAR(255)
// de clubes.imagen_portada. Acepta además /uploads/ (almacenamiento local
// heredado que el frontend resuelve contra el backend).
// Modo estricto opcional (env IMAGEN_PORTADA_STRICT=1): además del esquema,
// exige host de Cloudinary o ruta /uploads/, para evitar imágenes remotas
// arbitrarias (tracking/píxeles) en páginas públicas. Por defecto se mantiene
// el comportamiento permisivo para no romper portadas existentes. (T-034)
const ESTRICTO_PORTADA = process.env.IMAGEN_PORTADA_STRICT === '1';

export function esImagenPortadaValida(valor) {
  if (valor === undefined || valor === null || valor === '') return true;
  if (typeof valor !== 'string') return false;
  if (valor.length > 255) return false;
  if (valor.startsWith('/uploads/')) return true;
  if (!esHttpUrl(valor)) return false;
  if (!ESTRICTO_PORTADA) return true;
  try {
    const host = new URL(valor).hostname.toLowerCase();
    return host === 'cloudinary.com' || host.endsWith('.cloudinary.com') || host === 'res.cloudinary.com';
  } catch {
    return false;
  }
}
