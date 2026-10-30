import { request } from './api-core';

export const clubService = {
  getClubes: () => request('/clubes'),

  // Lista completa (todos los estatus + datos de presidente) — panel admin.
  getClubesAdmin: () => request('/clubes/admin'),

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

  updateClubEstatus: (id, id_estatus_club, password) =>
    request(`/clubes/${id}/estatus`, {
      method: 'PUT',
      body: JSON.stringify({ id_estatus_club, force: Boolean(password), password: password || undefined }),
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

  getActividadClubes: (page = 1, filtros = {}) => {
    const params = new URLSearchParams({ page: String(page) });
    if (filtros.desde) params.set('desde', filtros.desde);
    if (filtros.hasta) params.set('hasta', filtros.hasta);
    if (filtros.actor) params.set('actor', filtros.actor);
    if (filtros.tipo) params.set('tipo', filtros.tipo);
    if (filtros.club) params.set('club', filtros.club);
    return request(`/clubes/actividad?${params.toString()}`);
  },

  getActividad: (page = 1) => request(`/notificaciones/actividad?page=${page}`),
};
