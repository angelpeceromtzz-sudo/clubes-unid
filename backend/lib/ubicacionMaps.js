const MENSAJE_ENLACE = 'Pega un enlace válido de Google Maps u OpenStreetMap, o deja el mapa vacío.';
const HOSTS_OPENSTREETMAP = new Set(['openstreetmap.org', 'www.openstreetmap.org']);

export function normalizarEnlaceMapa(valor) {
  if (valor == null || valor === '') return '';
  const fallo = () => Object.assign(new Error(MENSAJE_ENLACE), { status: 400 });
  if (typeof valor !== 'string' || valor.trim().length > 2048) throw fallo();
  const enlace = valor.trim();
  if (!enlace) return '';
  let url;
  try { url = new URL(enlace); } catch { throw fallo(); }
  const host = url.hostname;
  const google = /^(www\.|maps\.)?google\.com(\.mx)?$/.test(host)
    && (host.startsWith('maps.') || /^\/maps(?:\/|$)/.test(url.pathname));
  const compartido = (host === 'maps.app.goo.gl' && url.pathname.length > 1)
    || (host === 'goo.gl' && /^\/maps\/.+/.test(url.pathname));
  const osm = HOSTS_OPENSTREETMAP.has(host);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !(google || compartido || osm)) throw fallo();
  return enlace;
}

function parCoordenadas(latitud, longitud) {
  if (latitud == null || longitud == null || latitud === '' || longitud === '') return null;
  const lat = Number(latitud), lng = Number(longitud);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
}

export function coordenadasEnlaceMapa(valor) {
  let enlace;
  try { enlace = normalizarEnlaceMapa(valor); } catch { return null; }
  if (!enlace) return null;
  const url = new URL(enlace);
  if (HOSTS_OPENSTREETMAP.has(url.hostname)) return parCoordenadas(url.searchParams.get('mlat'), url.searchParams.get('mlon'));
  // En los enlaces de lugares, @ suele ser el centro de la cámara, no el destino.
  const punto = enlace.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (punto) return parCoordenadas(punto[1], punto[2]);
  for (const clave of ['query', 'q', 'destination']) {
    const par = url.searchParams.get(clave)?.match(/^(?:loc:)?\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (par) return parCoordenadas(par[1], par[2]);
  }
  return null;
}

export function enlaceMapaCoordenadas(latitud, longitud) {
  const punto = parCoordenadas(latitud, longitud);
  if (!punto) throw new Error('Elige un punto válido en el mapa.');
  return 'https://www.google.com/maps/search/?api=1&query=' + punto.map((numero) => numero.toFixed(6)).join(',');
}
