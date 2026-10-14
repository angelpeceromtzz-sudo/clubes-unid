import { request, getToken, API_BASE } from './api-core';

export const convocatoriaService = {
  getConvocatorias: (clubId) => request(`/convocatorias/${clubId}`),

  getVistaPrevia: (clubId) => request(`/convocatorias/preview/${clubId}`),

  createConvocatoria: (data) =>
    request('/convocatorias', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  generarConvocatorias: (id_club) =>
    request('/convocatorias/generar', {
      method: 'POST',
      body: JSON.stringify({ id_club }),
    }),

  actualizarConvocatoria: (id, data) =>
    request(`/convocatorias/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  enviarConvocatoria: (id) =>
    request(`/convocatorias/${id}/enviar`, {
      method: 'POST',
    }),

  deleteConvocatoria: (id) =>
    request(`/convocatorias/${id}`, { method: 'DELETE' }),

  getConvocatoriaClub: (clubId) => request(`/clubes/${clubId}/convocatoria`),

  actualizarConfiguracionConvocatoria: (clubId, data) =>
    request(`/clubes/${clubId}/convocatoria`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  cerrarConvocatoria: (clubId) =>
    request(`/clubes/${clubId}/cerrar-convocatoria`, {
      method: 'POST',
    }),

  getHistorialOfertas: (clubId) => request(`/formularios/ofertas/${clubId}`),

  // El HTML de asistencia no se pide con request() porque no es JSON; se trae
  // con fetch autenticado y se convierte en Blob para no exponer el JWT en la URL.
  descargarAsistencia: async (id) => {
    const token = getToken();
    const res = await fetch(`${API_BASE}/convocatorias/${id}/asistencia`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      throw new Error(`No se pudo generar la lista de asistencia (status ${res.status}).`);
    }
    return res.blob();
  },
};
