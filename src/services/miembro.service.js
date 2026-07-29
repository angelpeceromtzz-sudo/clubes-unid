import { request } from './api-core';

export const miembroService = {
  getMiembros: (clubId) => request(`/clubes/${clubId}/miembros`),

  getHistorialMembresia: (clubId) => request(`/clubes/${clubId}/historial-membresia`),
};
