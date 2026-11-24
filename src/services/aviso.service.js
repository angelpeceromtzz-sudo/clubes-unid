import { request } from './api-core';

export const avisoService = {
  getAvisos: (clubId) => request(`/avisos/${clubId}`),
  getMisReaccionesAvisos: (clubId) => request(`/avisos/${clubId}/mis-reacciones`),
  guardarReaccionAviso: (id, reaccion) => request(`/avisos/${id}/reaccion`, {
    method: 'PUT',
    body: JSON.stringify({ reaccion }),
  }),

  createAviso: (id_club, titulo, contenido) =>
    request('/avisos', {
      method: 'POST',
      body: JSON.stringify({ id_club, titulo, contenido }),
    }),

  deleteAviso: (id) =>
    request(`/avisos/${id}`, { method: 'DELETE' }),
};
