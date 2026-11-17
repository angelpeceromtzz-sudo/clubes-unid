import { normalizarCodigoAsistencia } from '../../shared/actividades.js';

// Conserva solo los parámetros operativos del módulo al limpiar los datos de
// autenticación de Microsoft; nunca convierte un parámetro en una redirección.
export function rutaRegresoActividades(ruta, busqueda) {
  const parametros = new URLSearchParams(busqueda);
  const regreso = new URLSearchParams();
  if (/^\/actividades\/asistencia\/[1-9]\d*$/.test(ruta)) {
    try { regreso.set('codigo', normalizarCodigoAsistencia(parametros.get('codigo'))); }
    catch { /* Un código inválido se puede introducir de nuevo en la página. */ }
  } else if (ruta.startsWith('/actividades/')) {
    const edicion = parametros.get('edicion');
    if (/^[1-9]\d*$/.test(edicion || '')) regreso.set('edicion', edicion);
  }
  return ruta + (regreso.size ? '?' + regreso.toString() : '');
}
