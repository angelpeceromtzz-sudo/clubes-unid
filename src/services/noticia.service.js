import { request } from './api-core';

export const noticiaService = {
  getNoticias: (limite) =>
    request(limite ? `/noticias?limite=${limite}` : '/noticias'),

  getEventos: () => request('/noticias/eventos'),

  getMisInteresesEventos: () => request('/noticias/eventos/intereses/mios'),

  marcarInteresEvento: (id) => request(`/noticias/eventos/${id}/interes`, { method: 'POST' }),

  quitarInteresEvento: (id) => request(`/noticias/eventos/${id}/interes`, { method: 'DELETE' }),

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
