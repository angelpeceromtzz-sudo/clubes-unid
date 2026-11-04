import { API_BASE, getToken } from './api-core';
import { nombreArchivoReporte } from '../components/ejecutivo/exportaciones.utils';

export async function descargarExcelEjecutivo(filtros) {
  const params = new URLSearchParams({ formato: 'xlsx' });
  for (const clave of ['id_club', 'id_periodo', 'carrera', 'estado']) {
    if (filtros[clave]) params.set(clave, filtros[clave]);
  }
  let respuesta;
  try {
    respuesta = await fetch(`${API_BASE}/estadisticas/ejecutivo/exportar?${params}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      signal: AbortSignal.timeout(60000),
    });
  } catch {
    throw new Error('No se pudo descargar Excel. Revisa tu conexión e inténtalo de nuevo.');
  }
  if (respuesta.status === 401) throw new Error('Tu sesión venció. Inicia sesión de nuevo para exportar.');
  if (respuesta.status === 403) throw new Error('Tu cuenta no tiene permiso para exportar este reporte.');
  if (!respuesta.ok) throw new Error('No se pudo generar Excel. Inténtalo de nuevo en unos momentos.');
  if (!respuesta.headers.get('content-type')?.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
    throw new Error('El servidor no devolvió un archivo Excel válido. Inténtalo de nuevo.');
  }
  const blob = await respuesta.blob();
  if (!blob.size) throw new Error('El archivo Excel está vacío. Inténtalo de nuevo.');
  const url = window.URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivoReporte('xlsx');
  document.body.appendChild(enlace);
  try { enlace.click(); }
  finally {
    enlace.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  }
}
