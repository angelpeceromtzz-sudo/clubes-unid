// H15: manejador global de errores del backend (respaldo de los try/catch
// de cada ruta).
//
// Si un handler lanza, devuelve next(err) o el error viene del middleware de
// CORS, Express recurre a su manejador por defecto: en desarrollo responde el
// err.message y el stack completo en HTML (fuga de detalles internos) y en
// producción un HTML plano sin cabeceras JSON. Este manejador:
//   - registra el detalle solo en el log del servidor;
//   - conserva los códigos 4xx intencionados (p. ej. err.status = 400 de un
//     body JSON malformado de express.json) con mensaje propio;
//   - responde 500 con el mismo mensaje genérico que el resto del backend.
export function manejadorErroresGlobal(err, req, res, next) {
  console.error('Error global:', err);

  if (res.headersSent) {
    // Si la respuesta ya empezó, no se puede enmascarar: se traspasa a
    // Express para que cierre la conexión como corresponde.
    return next(err);
  }

  const estado = Number.isInteger(err?.status) && err.status >= 400 && err.status < 600
    ? err.status
    : 500;
  const mensaje = estado >= 500
    ? 'Error interno del servidor'
    : 'Solicitud inválida';

  res.status(estado).json({ error: mensaje });
}
