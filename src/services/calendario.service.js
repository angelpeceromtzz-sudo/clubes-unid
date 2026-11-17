import { request } from './api-core';

export const calendarioService = {
  getFechasCalendario: () => request('/calendario'),
  getFechasCalendarioAdmin: () => request('/calendario/admin'),
  createFechaCalendario: (datos) => request('/calendario', { method: 'POST', body: JSON.stringify(datos) }),
  updateFechaCalendario: (id, datos) => request(`/calendario/${id}`, { method: 'PUT', body: JSON.stringify(datos) }),
  deleteFechaCalendario: (id) => request(`/calendario/${id}`, { method: 'DELETE' }),
};
