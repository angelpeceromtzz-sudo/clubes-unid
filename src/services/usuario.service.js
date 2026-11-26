import { request } from './api-core';

export const usuarioService = {
  getUsuarios: () => request('/usuarios'),

  createUser: (data) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  desactivarUsuario: (id, password) =>
    request(`/usuarios/${id}/desactivar`, {
      method: 'PATCH',
      body: JSON.stringify({ password }),
    }),

  updateUserRol: (id, id_rol, password) =>
    request(`/usuarios/${id}/rol`, {
      method: 'PUT',
      body: JSON.stringify({ id_rol, password }),
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

  getUsuariosDesactivados: () => request('/usuarios/desactivados'),

  reactivarUsuario: (id) =>
    request(`/usuarios/${id}/reactivar`, { method: 'PATCH' }),
};
