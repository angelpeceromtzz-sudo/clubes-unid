-- ============================================================
-- PASO 1/2: Agregar columna cerrada_manualmente
-- Ejecutar: psql -U postgres -d clubs_bd -f migrate-add-cerrada-manualmente.sql
-- ============================================================

ALTER TABLE clubes ADD COLUMN IF NOT EXISTS cerrada_manualmente BOOLEAN DEFAULT FALSE;

-- Verificar que la columna se agregó
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clubes' AND column_name = 'cerrada_manualmente'
  ) THEN
    RAISE EXCEPTION 'ERROR: columna cerrada_manualmente no se creó correctamente en clubes';
  END IF;
END;
$$;
