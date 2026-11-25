// El expediente contiene datos personales. Esta política se monta antes del
// limitador global para cubrir también sus 429; el router la mantiene como
// segunda barrera para las respuestas generadas dentro de él.
export function noCacheExpediente(req, res, next) {
  const ruta = req.path.toLowerCase();
  if (ruta === '/api/expediente' || ruta.startsWith('/api/expediente/')) {
    res.set('Cache-Control', 'private, no-store');
  }
  next();
}
