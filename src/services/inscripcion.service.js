import { request } from './api-core';

export const inscripcionService = {
  getInscripcionActiva: () => request('/inscripciones/activa'),

  createInscripcion: (id_club) =>
    request('/inscripciones', {
      method: 'POST',
      body: JSON.stringify({ id_club }),
    }),

  removeFromClub: (userId) =>
    request(`/inscripciones/${userId}`, { method: 'DELETE' }),

  bajarMiembro: (userId) =>
    request(`/inscripciones/${userId}`, { method: 'DELETE' }),

  getMisFormularios: () => request('/formularios'),

  createFormulario: (data) =>
    request('/formularios', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getSolicitudesPendientes: (clubId) => request(`/formularios/pendientes/${clubId}`),

  getAllSolicitudes: (clubId) => request(`/formularios/todos/${clubId}`),

  actualizarEstatusSolicitud: (id, status) =>
    request(`/formularios/${id}/estatus`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  getMisPostulaciones: () => request('/formularios/mis-postulaciones'),
};
