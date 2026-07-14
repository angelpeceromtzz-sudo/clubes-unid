-- ============================================================
-- MIGRACIÓN: Fechas programadas de apertura y cierre
-- Agrega columnas para control automático del ciclo de vida
-- de una convocatoria. El estado se calcula dinámicamente
-- a partir de estas fechas + el cupo, no se guarda.
-- ============================================================

ALTER TABLE convocatorias
  ADD COLUMN IF NOT EXISTS fecha_apertura_programada TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fecha_limite_cierre TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_convocatorias_fechas_programadas
  ON convocatorias (fecha_apertura_programada, fecha_limite_cierre);
