-- Ubicación opcional para nuevas ediciones y ediciones existentes.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE actividades_ediciones ADD COLUMN IF NOT EXISTS ubicacion_maps VARCHAR(2048) NOT NULL DEFAULT '';
COMMIT;
