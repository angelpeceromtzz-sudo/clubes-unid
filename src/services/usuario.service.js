import { request } from './api-core';

export const usuarioService = {
  getUsuarios: () => request('/usuarios'),

  createUser: (data) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteUser: (id) =>
    request(`/usuarios/${id}`, { method: 'DELETE' }),

  updateUserRol: (id, id_rol) =>
    request(`/usuarios/${id}/rol`, {
      method: 'PUT',
      body: JSON.stringify({ id_rol }),
    }),

  adminAction: (targetUserId, action, password) =>
    request('/usuarios/admin-action', {
      method: 'POST',
      body: JSON.stringify({ targetUserId, action, password }),
    }),

  asignarAlumnoClub: (id_usuario, id_club) =>
    request('/admin/asignar-alumno', {
      method: 'POST',
      body: JSON.stringify({ id_usuario, id_club }),
    }),
};
