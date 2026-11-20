const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

export function accesoMisionesValido(acceso) {
  return Boolean(acceso && UUID.test(acceso.folio) && TOKEN.test(acceso.token));
}
export function leerAccesoMisiones(clave, storage = globalThis.localStorage) {
  try {
    const acceso = JSON.parse(storage.getItem('misiones_acceso_' + clave));
    return accesoMisionesValido(acceso) ? acceso : null;
  } catch { return null; }
}
export function guardarAccesoMisiones(acceso, idEdicion, storage = globalThis.localStorage) {
  if (!accesoMisionesValido(acceso)) return;
  const valor = JSON.stringify({ folio: acceso.folio, token: acceso.token });
  try {
    storage.setItem('misiones_acceso_' + acceso.folio, valor);
    storage.setItem('misiones_acceso_edicion_' + idEdicion, valor);
  } catch { /* El enlace sigue disponible aunque el navegador impida guardarlo. */ }
}
export function extraerAccesoMisiones(enlace, origen) {
  try {
    const url = new URL(enlace, origen);
    const coincidencia = /^\/actividades\/misiones\/registro\/([^/]+)$/.exec(url.pathname);
    const acceso = { folio: coincidencia?.[1], token: new URLSearchParams(url.hash.slice(1)).get('acceso') };
    return url.origin === new URL(origen).origin && accesoMisionesValido(acceso) ? acceso : null;
  } catch { return null; }
}
export function enlacePrivadoMisiones(acceso, origen) {
  if (!accesoMisionesValido(acceso)) return '';
  return new URL('/actividades/misiones/registro/' + acceso.folio + '#acceso=' + acceso.token, origen).href;
}
