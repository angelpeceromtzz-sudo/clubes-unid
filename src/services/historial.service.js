import { request } from './api-core';

export const historialService = {
  getHistorial: (filtros = {}) => {
    const params = new URLSearchParams();
    if (filtros.desde) params.set('desde', filtros.desde);
    if (filtros.hasta) params.set('hasta', filtros.hasta);
    if (filtros.actor) params.set('actor', filtros.actor);
    if (filtros.accion) params.set('accion', filtros.accion);
    const query = params.toString();
    return request(`/historial${query ? `?${query}` : ''}`);
  },
};