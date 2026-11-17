import { request } from './api-core';

export const noticiaService = {
  getNoticias: (limite) =>
    request(limite ? `/noticias?limite=${limite}` : '/noticias'),

  getEventos: () => request('/noticias/eventos'),
  getMural: () => request('/noticias/mural'),

  getMisInteresesEventos: () => request('/noticias/eventos/intereses/mios'),

  marcarInteresEvento: (id) => request(`/noticias/eventos/${id}/interes`, { method: 'POST' }),

  // `estado` filtra por el estado del flujo de aprobación (PBI-17).
  getNoticiasAdmin: (estado) =>
    request(estado && estado !== 'todos' ? `/noticias/admin?status=${encodeURIComponent(estado)}` : '/noticias/admin'),

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

  /* --- Flujo de aprobación previa (PBI-17) --- */

  // draft|rejected → pending (admin o responsable del mural)
  enviarRevisionNoticia: (id) =>
    request(`/noticias/${id}/enviar-revision`, { method: 'POST' }),

  // pending → published (sólo rectoría)
  aprobarNoticia: (id) =>
    request(`/noticias/${id}/aprobar`, { method: 'POST' }),

  // pending → rejected, con motivo opcional (sólo rectoría)
  rechazarNoticia: (id, motivo) =>
    request(`/noticias/${id}/rechazar`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    }),

  // published → draft: la saca del muro sin eliminarla (sólo rectoría)
  ocultarNoticia: (id) =>
    request(`/noticias/${id}/ocultar`, { method: 'POST' }),
};
