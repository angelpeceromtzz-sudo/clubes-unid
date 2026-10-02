import { request } from './api-core';

export const horarioService = {
  getHorarios: (clubId) => request(`/horarios/club/${clubId}`),

  createHorario: (clubId, data) =>
    request(`/horarios/club/${clubId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateHorario: (id, data) =>
    request(`/horarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteHorario: (id) =>
    request(`/horarios/${id}`, { method: 'DELETE' }),
};
