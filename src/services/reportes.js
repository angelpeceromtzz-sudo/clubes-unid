import { request } from './api';
import { uploadService } from './upload.service';

export async function crearReporte(payload) {
  return request('/reportes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function subirCapturaReporte(file) {
  return uploadService.uploadImagenReporte(file);
}

export async function listarReportesAdmin(params = {}) {
  const query = new URLSearchParams();
  if (params.estado) query.set('estado', params.estado);
  if (params.tipo) query.set('tipo', params.tipo);
  const qs = query.toString();
  return request(`/reportes${qs ? `?${qs}` : ''}`);
}

export async function actualizarReporteAdmin(id, payload) {
  return request(`/reportes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
