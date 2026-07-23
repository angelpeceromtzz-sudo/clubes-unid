-- ============================================================
-- PASO 2/2: Recrear VIEW con regla de cerrada_manualmente
-- Ejecutar psql -U postgres -d clubs_bd -f migrate-update-view-cerrada-manualmente.sql
-- DESPUÉS de ejecutar migrate-add-cerrada-manualmente.sql
-- ============================================================

-- Verificar que la columna existe antes de continuar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clubes' AND column_name = 'cerrada_manualmente'
  ) THEN
    RAISE EXCEPTION 'ERROR: la columna cerrada_manualmente no existe. Ejecuta primero migrate-add-cerrada-manualmente.sql';
  END IF;
END;
$$;

DROP VIEW IF EXISTS clubes_con_estado;

CREATE OR REPLACE VIEW clubes_con_estado AS
SELECT
  cl.*,
  COUNT(f.id_formulario) AS formularios_recibidos,
  CASE
    WHEN cl.cerrada_manualmente = TRUE                              THEN 'cerrado'
    WHEN cl.fecha_apertura_programada IS NOT NULL
     AND NOW() < cl.fecha_apertura_programada                       THEN 'proximo'
    WHEN cl.max_postulaciones IS NOT NULL
     AND COUNT(f.id_formulario) >= cl.max_postulaciones              THEN 'lleno'
    WHEN cl.fecha_limite_cierre IS NOT NULL
     AND NOW() > cl.fecha_limite_cierre                              THEN 'cerrado'
    WHEN cl.fecha_apertura_programada IS NULL                        THEN 'cerrado'
    ELSE 'abierto'
  END AS estado_calculado
FROM clubes cl
LEFT JOIN formularios f ON f.id_club = cl.id_club
GROUP BY cl.id_club;

-- Verificar que la vista se creó correctamente
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'clubes_con_estado') THEN
    RAISE EXCEPTION 'ERROR: la vista clubes_con_estado no se creó correctamente';
  END IF;
END;
$$;
