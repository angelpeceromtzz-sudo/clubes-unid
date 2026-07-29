import { request } from './api-core';

export const diapositivaService = {
  getDiapositivasHero: () => request('/diapositivas-hero'),

  getDiapositivasHeroAdmin: () => request('/diapositivas-hero/admin'),

  createDiapositivaHero: (data) =>
    request('/diapositivas-hero', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateDiapositivaHero: (id, data) =>
    request(`/diapositivas-hero/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteDiapositivaHero: (id) =>
    request(`/diapositivas-hero/${id}`, { method: 'DELETE' }),
};
