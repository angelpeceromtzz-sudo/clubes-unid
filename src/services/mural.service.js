import { request } from './api-core';

export const muralService = {
  listar: (admin = false) => request(admin ? '/mural/admin' : '/mural'),
  crear: (datos) => request('/mural', { method: 'POST', body: JSON.stringify(datos) }),
  editar: (id, datos) => request(`/mural/${id}`, { method: 'PUT', body: JSON.stringify(datos) }),
  eliminar: (id) => request(`/mural/${id}`, { method: 'DELETE' }),
  configuracion: () => request('/mural/config'),
  guardarConfiguracion: (url) => request('/mural/config', { method: 'PUT', body: JSON.stringify({ url_publica: url }) }),
};
