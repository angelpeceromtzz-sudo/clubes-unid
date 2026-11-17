// Cabeceras de seguridad del backend (H5b, T-034).
//
// Implementadas a mano en lugar de helmet(): el API sirve JSON e imágenes que
// el frontend (otro origen, Vercel) y los flujos de Cloudinary cargan de
// forma cross-origin; las opciones por defecto de helmet (CORP same-origin,
// CSP) podrían romper esos flujos y no se pueden verificar aquí en navegador.
// El set es mínimo, explícito y sin dependencias nuevas.
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

  // HSTS: solo tiene efecto sobre HTTPS. Render termina TLS y reenvía con
  // X-Forwarded-Proto; en desarrollo local (HTTP) se omite para no marcar
  // un origen inseguro. (T-034)
  const esHttps =
    req.secure === true ||
    req.headers['x-forwarded-proto'] === 'https' ||
    process.env.NODE_ENV === 'production';
  if (esHttps) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // CSP: el API no sirve HTML salvo la lista de asistencia. Para el resto se
  // aplica una política cerrada; para la asistencia se permite el marcado
  // inline que usa el template (estilos y window.print()). (T-034)
  const esAsistencia = typeof req.path === 'string' && req.path.endsWith('/asistencia');
  if (esAsistencia) {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; frame-ancestors 'none'; base-uri 'self'",
    );
  } else {
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  }

  next();
}