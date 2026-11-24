const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

export function accesoTrineoValido(acceso) {
  return Boolean(acceso && UUID.test(acceso.folio) && TOKEN.test(acceso.token));
}

export function leerAccesoTrineo(clave, storage = globalThis.localStorage) {
  try {
    const acceso = JSON.parse(storage.getItem('trineo_acceso_' + clave));
    return accesoTrineoValido(acceso) ? acceso : null;
  } catch { return null; }
}

export function guardarAccesoTrineo(acceso, idEdicion, storage = globalThis.localStorage) {
  if (!accesoTrineoValido(acceso)) return;
  const valor = JSON.stringify({ folio: acceso.folio, token: acceso.token });
  try {
    storage.setItem('trineo_acceso_' + acceso.folio, valor);
    storage.setItem('trineo_acceso_edicion_' + idEdicion, valor);
  } catch { /* El enlace permanece disponible en la pantalla. */ }
}

export function extraerAccesoTrineo(enlace, origen) {
  try {
    const url = new URL(enlace, origen);
    const coincidencia = /^\/actividades\/trineo\/registro\/([^/]+)$/.exec(url.pathname);
    const acceso = { folio: coincidencia?.[1], token: new URLSearchParams(url.hash.slice(1)).get('acceso') };
    return url.origin === new URL(origen).origin && accesoTrineoValido(acceso) ? acceso : null;
  } catch { return null; }
}

export function enlacePrivadoTrineo(acceso, origen) {
  if (!accesoTrineoValido(acceso)) return '';
  return new URL('/actividades/trineo/registro/' + acceso.folio + '#acceso=' + acceso.token, origen).href;
}
