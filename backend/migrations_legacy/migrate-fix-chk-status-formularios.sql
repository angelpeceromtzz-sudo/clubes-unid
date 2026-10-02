-- ============================================================
-- MIGRACIÓN: Corregir CHECK constraint chk_status en formularios
-- La BD de producción tenía una lista distinta que no incluía
-- 'Oferta enviada', 'Preseleccionado', 'Convocado', 'Miembro oficial'
-- ============================================================

ALTER TABLE formularios DROP CONSTRAINT IF EXISTS chk_status;

ALTER TABLE formularios ADD CONSTRAINT chk_status
  CHECK (status IN (
    'En revisión',
    'Preseleccionado',
    'Convocado',
    'Oferta enviada',
    'Miembro oficial',
    'Rechazado'
  ));
