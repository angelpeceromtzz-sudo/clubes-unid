import { request } from './api-core';

// Encuestas (PBI-10).
//
// Las dos funciones públicas se llaman sin sesión. `request` sólo adjunta el
// Authorization si hay un token en localStorage, así que desde un navegador con
// sesión iniciada el token sí viaja; es inofensivo porque el backend de
// /publico/* no lo mira. Lo que no se hace en ningún caso es confiar en él.
export const encuestaService = {
  // --- público ---
  obtenerPublica: (slug) => request(`/encuestas/publico/${slug}`),
  enviarRespuestas: (slug, payload) =>
    request(`/encuestas/publico/${slug}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // --- admin ---
  listar: () => request('/encuestas/admin'),
  obtener: (id) => request(`/encuestas/admin/${id}`),
  crear: (data) =>
    request('/encuestas/admin', { method: 'POST', body: JSON.stringify(data) }),
  actualizar: (id, data) =>
    request(`/encuestas/admin/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminar: (id) => request(`/encuestas/admin/${id}`, { method: 'DELETE' }),

  crearPregunta: (idEncuesta, data) =>
    request(`/encuestas/admin/${idEncuesta}/preguntas`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  actualizarPregunta: (idPregunta, data) =>
    request(`/encuestas/admin/preguntas/${idPregunta}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  eliminarPregunta: (idPregunta) =>
    request(`/encuestas/admin/preguntas/${idPregunta}`, { method: 'DELETE' }),
  actualizarOpciones: (idPregunta, opciones) =>
    request(`/encuestas/admin/preguntas/${idPregunta}/opciones`, {
      method: 'PUT',
      body: JSON.stringify({ opciones }),
    }),
};

// Catálogos de solo lectura.
export const catalogoService = {
  getLicenciaturas: () => request('/catalogos/licenciaturas'),
};
