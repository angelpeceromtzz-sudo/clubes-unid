import { request } from './api-core';

export const notificacionService = {
  getNotificaciones: () => request('/notificaciones'),

  createNotificacion: (titulo, mensaje, audiencia, id_club, id_destinatario, opciones = {}) =>
    request('/notificaciones', {
      method: 'POST',
      body: JSON.stringify({ titulo, mensaje, audiencia, id_club, id_destinatario, mostrar_en_mural: opciones.mostrar_en_mural, url_imagen: opciones.url_imagen }),
    }),

  marcarNotificacionLeida: (id) =>
    request(`/notificaciones/${id}/leer`, { method: 'POST' }),

  marcarTodasNotificacionesLeidas: () =>
    request('/notificaciones/leer-todas', { method: 'POST' }),

  eliminarNotificacion: (id) =>
    request(`/notificaciones/${id}`, { method: 'DELETE' }),
};
