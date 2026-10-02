import { request } from './api-core';

export const ofertaService = {
  asignarBloque: (formularioId, bloque) =>
    request(`/formularios/${formularioId}/bloque`, {
      method: 'PUT',
      body: JSON.stringify({ bloque }),
    }),

  seleccionarOfertas: (id_club, aceptados) =>
    request('/formularios/seleccionar', {
      method: 'POST',
      body: JSON.stringify({ id_club, aceptados }),
    }),

  enviarOfertas: (id_club, aprobados) =>
    request('/convocatorias/ofertas', {
      method: 'POST',
      body: JSON.stringify({ id_club, aprobados }),
    }),

  responderOferta: (id_formulario, decision) =>
    request(`/ofertas/${id_formulario}/respuesta`, {
      method: 'PUT',
      body: JSON.stringify({ decision }),
    }),
};
