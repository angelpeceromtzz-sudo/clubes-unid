import { request } from './api-core';

export const historialService = {
  getHistorial: () => request('/historial'),
};
