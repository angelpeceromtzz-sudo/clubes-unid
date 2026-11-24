import { API_BASE, getToken } from './api-core';

async function solicitar(ruta, { method = 'GET', datos, acceso } = {}) {
  const headers = {};
  if (acceso?.token) headers.Authorization = 'Registro ' + acceso.token;
  else if (getToken()) headers.Authorization = 'Bearer ' + getToken();
  if (datos !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  let respuesta;
  try {
    respuesta = await fetch(API_BASE + '/actividades' + ruta, { method, headers, body: datos === undefined ? undefined : JSON.stringify(datos) });
  } catch { throw new Error('No se pudo conectar. Revisa tu conexión e intenta de nuevo.'); }
  const resultado = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const error = new Error(resultado.error || 'No se pudo completar el registro del Trineo');
    error.status = respuesta.status;
    throw error;
  }
  return resultado;
}

export const trineoService = {
  crearInvitado: (id, datos) => solicitar('/trineo/ediciones/' + id + '/invitados', { method: 'POST', datos: { ...datos, origen: window.location.origin } }),
  consultarInvitado: (acceso) => solicitar('/trineo/invitados/' + acceso.folio, { acceso }),
  editarInvitado: (acceso, datos) => solicitar('/trineo/invitados/' + acceso.folio, { method: 'PUT', acceso, datos }),
  reenviarEnlace: (acceso) => solicitar('/trineo/invitados/' + acceso.folio + '/reenviar-enlace', { method: 'POST', acceso, datos: {} }),
  asistencia: (acceso, codigo, origen) => solicitar('/trineo/invitados/' + acceso.folio + '/asistencia', { method: 'POST', acceso, datos: { codigo, origen } }),
};
