-- Galería general: conserva las fotos, sus descripciones y su revisión.
-- Aplicar después de migrate-actividades.sql si se instaló la versión inicial.
BEGIN;
ALTER TABLE actividades_fotos DROP COLUMN IF EXISTS etapa;
COMMIT;
