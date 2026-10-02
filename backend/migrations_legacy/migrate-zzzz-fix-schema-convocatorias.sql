-- ============================================================
-- MIGRACION: Fix schema - mover fechas a clubes, VIEW corregida
-- Corrige el error de diseno anterior que puso las fechas de
-- reclutamiento en convocatorias (bloques de evaluacion) en
-- vez de clubes (donde vive el periodo de reclutamiento).
--
-- Tambien elimina la VIEW rota y la reemplaza por
-- clubes_con_estado que cuenta por id_club.
-- Incluye la regla de cerrada_manualmente como maxima prioridad.
--
-- ORDEN IMPORTANTE:
-- 1. DROP VIEW primero (depende de las columnas a borrar)
-- 2. DROP COLUMNs
-- 3. CREATE OR REPLACE VIEW
-- ============================================================

-- 1. Eliminar VIEW que depende de las columnas a borrar
DROP VIEW IF EXISTS convocatorias_con_estado;
DROP VIEW IF EXISTS clubes_con_estado;

-- 2. Agregar fechas programadas a la tabla correcta: clubes
ALTER TABLE clubes
  ADD COLUMN IF NOT EXISTS fecha_apertura_programada TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fecha_limite_cierre TIMESTAMPTZ DEFAULT NULL;

-- 3. Eliminar columnas obsoletas de convocatorias
DROP INDEX IF EXISTS idx_convocatorias_fechas_programadas;
ALTER TABLE convocatorias DROP COLUMN IF EXISTS fecha_apertura_programada;
ALTER TABLE convocatorias DROP COLUMN IF EXISTS fecha_limite_cierre;

-- 4. Eliminar columna obsoleta de clubes (ya no se lee ni escribe)
ALTER TABLE clubes DROP COLUMN IF EXISTS estado_convocatoria;

-- 5. Crear VIEW corregida: una fila por club, estado calculado dinamicamente
-- IMPORTANTE: Esta logica debe coincidir EXACTAMENTE con la funcion
-- calcularEstadoClub() en backend/lib/estadoClub.js. Si cambias una regla
-- ahi, cambiala tambien alla, y viceversa.
CREATE OR REPLACE VIEW clubes_con_estado AS
SELECT
  cl.*,
  COUNT(f.id_formulario) AS formularios_recibidos,
  CASE
    WHEN cl.cerrada_manualmente = TRUE                           THEN 'cerrado'
    WHEN cl.fecha_apertura_programada IS NOT NULL
     AND NOW() < cl.fecha_apertura_programada                    THEN 'proximo'
    WHEN cl.max_postulaciones IS NOT NULL
     AND COUNT(f.id_formulario) >= cl.max_postulaciones           THEN 'lleno'
    WHEN cl.fecha_limite_cierre IS NOT NULL
     AND NOW() > cl.fecha_limite_cierre                           THEN 'cerrado'
    WHEN cl.fecha_apertura_programada IS NULL                     THEN 'cerrado'
    ELSE 'abierto'
  END AS estado_calculado
FROM clubes cl
LEFT JOIN formularios f ON f.id_club = cl.id_club
GROUP BY cl.id_club;
