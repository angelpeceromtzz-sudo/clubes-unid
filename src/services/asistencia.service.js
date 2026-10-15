/* Servicio del módulo de Asistencia V1 (PBI-05) — presidente de club. */
import { request } from './api-core';

export const asistenciaService = {
  getPeriodoActivo: () => request('/asistencia/periodo/activo'),

  getSesionesHoy: () => request('/asistencia/sesiones/hoy'),

  getSesion: (id) => request(`/asistencia/sesiones/${id}`),

  iniciar: (id) =>
    request(`/asistencia/sesiones/${id}/iniciar`, { method: 'POST' }),

  guardarRegistros: (id, registros) =>
    request(`/asistencia/sesiones/${id}/registros`, {
      method: 'PUT',
      body: JSON.stringify({ registros }),
    }),

  finalizar: (id) =>
    request(`/asistencia/sesiones/${id}/finalizar`, { method: 'POST' }),

  cancelarSesion: (id, motivo, observacion) =>
    request(`/asistencia/sesiones/${id}/cancelar`, {
      method: 'PUT',
      body: JSON.stringify({ motivo, observacion: observacion || null }),
    }),

  getHistorial: ({ estado, id_periodo, limit } = {}) => {
    const params = new URLSearchParams();
    if (estado) params.set('estado', estado);
    if (id_periodo) params.set('id_periodo', id_periodo);
    if (limit) params.set('limit', limit);
    const qs = params.toString();
    return request(`/asistencia/historial${qs ? `?${qs}` : ''}`);
  },

  getEstadisticasClub: (idPeriodo) =>
    request(`/asistencia/estadisticas/club${idPeriodo ? `?id_periodo=${idPeriodo}` : ''}`),

  getEstadisticasIntegrante: (userId, idPeriodo) =>
    request(`/asistencia/estadisticas/integrante/${userId}${idPeriodo ? `?id_periodo=${idPeriodo}` : ''}`),
};
