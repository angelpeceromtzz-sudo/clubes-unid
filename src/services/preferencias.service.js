import { request } from './api-core';

export const preferenciasService = {
  getCatalogoIntereses: () => request('/catalogos/intereses'),

  getPreferencias: () => request('/me/preferencias'),

  guardarPreferencias: (datos) =>
    request('/me/preferencias', {
      method: 'PUT',
      body: JSON.stringify(datos),
    }),

  omitirOnboarding: () => request('/me/preferencias/omitir', { method: 'POST' }),
};
