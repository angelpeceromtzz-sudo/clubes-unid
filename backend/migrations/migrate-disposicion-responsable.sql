-- Migración: disposición para ser responsable de club en preferencias_usuario.
-- Idempotente.
BEGIN;

ALTER TABLE preferencias_usuario
  ADD COLUMN IF NOT EXISTS disposicion_responsable VARCHAR(20);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_pref_disposicion'
  ) THEN
    ALTER TABLE preferencias_usuario
      ADD CONSTRAINT chk_pref_disposicion
      CHECK (disposicion_responsable IS NULL OR disposicion_responsable IN ('responsable', 'miembro', 'indeciso'));
  END IF;
END $$;

COMMIT;