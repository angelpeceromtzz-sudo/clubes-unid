-- ============================================================
-- MIGRACIÓN — LICENCIATURA Y PERIODO DE INGRESO EN PREFERENCIAS
-- ============================================================
-- Idempotente. Toca solo preferencias_usuario (columnas nuevas).
-- Aplicar a mano:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -f backend/migrations/migrate-onboarding-licenciatura-periodo.sql
-- ============================================================

BEGIN;

ALTER TABLE preferencias_usuario
  ADD COLUMN IF NOT EXISTS id_licenciatura INT
    REFERENCES cat_licenciaturas(id_licenciatura) ON DELETE SET NULL;

ALTER TABLE preferencias_usuario
  ADD COLUMN IF NOT EXISTS id_periodo_ingreso INT
    REFERENCES periodos_actividad(id_periodo) ON DELETE SET NULL;

COMMIT;