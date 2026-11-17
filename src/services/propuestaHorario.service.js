import { request } from './api-core';
export const propuestaHorarioService = {
  espacios: () => request('/horarios/espacios'),
  crearEspacio: (nombre) => request('/horarios/espacios', { method: 'POST', body: JSON.stringify({ nombre }) }),
  listar: (clubId) => request(clubId ? `/horarios/solicitudes/club/${clubId}` : '/horarios/solicitudes'),
  crear: (clubId, datos) => request(`/horarios/solicitudes/club/${clubId}`, { method: 'POST', body: JSON.stringify(datos) }),
  editar: (id, datos) => request(`/horarios/solicitudes/${id}`, { method: 'PUT', body: JSON.stringify(datos) }),
  enviar: (id) => request(`/horarios/solicitudes/${id}/enviar`, { method: 'POST' }),
  retirar: (id) => request(`/horarios/solicitudes/${id}/retirar`, { method: 'POST' }),
  revisar: (id, accion, observaciones) => request(`/horarios/solicitudes/${id}/revision`, { method: 'POST', body: JSON.stringify({ accion, observaciones }) }),
};
