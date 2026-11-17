-- Migración T-008: validación de requisitos para activar un club
-- Idempotente: se puede ejecutar varias veces sin efectos secundarios.

ALTER TABLE clubes ADD COLUMN IF NOT EXISTS lugar_actividades VARCHAR(255);

DO $$
BEGIN
  ALTER TABLE clubes DROP CONSTRAINT IF EXISTS chk_cupo_positivo;
  ALTER TABLE clubes ADD CONSTRAINT chk_cupo_positivo CHECK (cupo_maximo IN (10, 15, 20, 25, 30, 40, 50));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE clubes ALTER COLUMN id_estatus_club SET DEFAULT 2;
