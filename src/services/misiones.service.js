import { API_BASE, getToken } from './api-core';

async function solicitar(ruta, { method = 'GET', datos, pdf, acceso, multipart = false, archivo = false } = {}) {
  const headers = {};
  if (acceso?.token) headers.Authorization = 'Registro ' + acceso.token;
  else if (getToken()) headers.Authorization = 'Bearer ' + getToken();
  let body;
  if (multipart) {
    body = new FormData();
    if (datos !== undefined) body.append('formulario', JSON.stringify(datos));
    if (pdf) body.append('pdf', pdf);
  } else if (datos !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(datos); }
  let respuesta;
  try { respuesta = await fetch(API_BASE + '/actividades' + ruta, { method, headers, body }); }
  catch { throw new Error('No se pudo conectar. Revisa tu conexión e intenta de nuevo.'); }
  if (respuesta.ok && archivo) return respuesta.blob();
  const resultado = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const error = new Error(resultado.error || 'No se pudo completar la operación de Misiones');
    error.status = respuesta.status;
    throw error;
  }
  return resultado;
}

export const misionesService = {
  crearInvitado: (id, datos, pdf) => solicitar('/ediciones/' + id + '/invitados', { method: 'POST', datos, pdf, multipart: true }),
  consultarInvitado: (acceso) => solicitar('/invitados/' + acceso.folio, { acceso }),
  editarInvitado: (acceso, datos, pdf) => solicitar('/invitados/' + acceso.folio, { method: 'PUT', acceso, datos, pdf, multipart: true }),
  guardarUnid: (id, datos, pdf) => solicitar('/ediciones/' + id + '/registro', { method: 'PUT', datos, pdf, multipart: true }),
  reenviarEnlace: (acceso) => solicitar('/invitados/' + acceso.folio + '/reenviar-enlace', { method: 'POST', acceso, datos: {} }),
  asistencia: (acceso, codigo, origen) => solicitar('/invitados/' + acceso.folio + '/asistencia', { method: 'POST', acceso, datos: { codigo, origen } }),
  disponibilidadInvitados: (id) => solicitar('/ediciones/' + id + '/acceso-invitados'),
  subirCodigo: (id, pdf) => solicitar('/gestion/actividades/' + id + '/codigo-conducta', { method: 'POST', pdf, multipart: true }),
  descargarPdf: (id, acceso) => solicitar('/documentos-misiones/' + id, { acceso, archivo: true }),
};
