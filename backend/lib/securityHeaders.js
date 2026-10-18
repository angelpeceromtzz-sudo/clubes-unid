// Cabeceras de seguridad del backend (H5b).
//
// Implementadas a mano en lugar de helmet(): el API sirve JSON e imágenes que
// el frontend (otro origen, Vercel) y los flujos de Cloudinary cargan de
// forma cross-origin; las opciones por defecto de helmet (CORP same-origin,
// CSP) podrían romper esos flujos y no se pueden verificar aquí en navegador.
// El set es mínimo, explícito y sin dependencias nuevas. CSP queda para la
// fase de estrategia de sesión (H9).
export function cabecerasSeguridad(req, res, next) {
  // Impide que el navegador interpreque respuestas como otro tipo (sniffing).
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // El API no debe ser embebido en iframes (clickjacking de datos).
  res.setHeader('X-Frame-Options', 'DENY');
  // No enviar referrer desde el cliente hacia el API.
  res.setHeader('Referrer-Policy', 'no-referrer');
  // Cross-origin explícito: las imágenes del API se sirven al frontend
  // (Vercel) y a la CDN de Cloudinary; same-origin rompería esa carga.
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  // Bloquea Flash/PDF antiguos con políticas cross-domain.
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  next();
}
