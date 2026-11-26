-- Migración idempotente: marca como rechazadas las ofertas de ingreso caducadas.
-- Ejecutar una sola vez en mantenimiento. No afecta ofertas vigentes ni aceptadas.

BEGIN;

UPDATE formularios
SET status = 'Rechazado',
    motivo_rechazo = 'Oferta expirada (72h)',
    fecha_respuesta = COALESCE(fecha_respuesta, NOW())
WHERE status = 'Oferta enviada'
  AND fecha_expiracion IS NOT NULL
  AND fecha_expiracion < NOW();

COMMIT;