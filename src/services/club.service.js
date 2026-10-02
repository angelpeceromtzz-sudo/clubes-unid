import { request } from './api-core';

export const clubService = {
  getClubes: () => request('/clubes'),

  getClub: (id) => request(`/clubes/${id}`),

  createClub: (data) =>
    request('/clubes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateClub: (id, data) =>
    request(`/clubes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  updateClubEstatus: (id, id_estatus_club) =>
    request(`/clubes/${id}/estatus`, {
      method: 'PUT',
      body: JSON.stringify({ id_estatus_club }),
    }),

  updateVicepresidente: (idClub, idUsuario) =>
    request(`/clubes/${idClub}/vicepresidente`, {
      method: 'PUT',
      body: JSON.stringify({ id_usuario: idUsuario || null }),
    }),

  asignarClubAPresidente: (userId, clubId) =>
    request(`/usuarios/${userId}/asignar-club`, {
      method: 'PUT',
      body: JSON.stringify({ id_club: clubId }),
    }),

  getActividadClubes: (page = 1) => request(`/clubes/actividad?page=${page}`),

  getActividad: (page = 1) => request(`/notificaciones/actividad?page=${page}`),
};
