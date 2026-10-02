import { request } from './api-core';

export const notificacionService = {
  getNotificaciones: () => request('/notificaciones'),

  createNotificacion: (titulo, mensaje, audiencia, id_club, id_destinatario) =>
    request('/notificaciones', {
      method: 'POST',
      body: JSON.stringify({ titulo, mensaje, audiencia, id_club, id_destinatario }),
    }),

  marcarNotificacionLeida: (id) =>
    request(`/notificaciones/${id}/leer`, { method: 'POST' }),

  marcarTodasNotificacionesLeidas: () =>
    request('/notificaciones/leer-todas', { method: 'POST' }),

  eliminarNotificacion: (id) =>
    request(`/notificaciones/${id}`, { method: 'DELETE' }),
};
