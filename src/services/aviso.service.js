import { request } from './api-core';

export const avisoService = {
  getAvisos: (clubId) => request(`/avisos/${clubId}`),

  createAviso: (id_club, titulo, contenido) =>
    request('/avisos', {
      method: 'POST',
      body: JSON.stringify({ id_club, titulo, contenido }),
    }),

  deleteAviso: (id) =>
    request(`/avisos/${id}`, { method: 'DELETE' }),
};
