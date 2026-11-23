-- Permite configurar por edición si la carta del Trineo es obligatoria.
-- Las ediciones existentes conservan el comportamiento anterior: obligatorio.
BEGIN;
ALTER TABLE actividades_ediciones
  ADD COLUMN IF NOT EXISTS carta_obligatoria BOOLEAN NOT NULL DEFAULT TRUE;
COMMIT;
