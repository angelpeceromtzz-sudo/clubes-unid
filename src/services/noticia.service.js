import { request } from './api-core';

export const noticiaService = {
  getNoticias: (limite) =>
    request(limite ? `/noticias?limite=${limite}` : '/noticias'),

  getNoticiasAdmin: () => request('/noticias/admin'),

  createNoticia: (data) =>
    request('/noticias', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateNoticia: (id, data) =>
    request(`/noticias/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteNoticia: (id) =>
    request(`/noticias/${id}`, { method: 'DELETE' }),
};
