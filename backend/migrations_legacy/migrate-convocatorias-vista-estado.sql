-- ============================================================
-- MIGRACIÓN: Vista calculada de estado de convocatorias
-- Centraliza el cálculo del estado en una sola fuente de verdad.
-- El estado se evalúa con NOW() en cada consulta, nunca se guarda.
-- ============================================================

CREATE OR REPLACE VIEW convocatorias_con_estado AS
SELECT
  c.*,
  cl.cupo_maximo,
  cl.max_postulaciones,
  COUNT(f.id_formulario) AS formularios_recibidos,
  CASE
    WHEN c.fecha_apertura_programada IS NOT NULL
     AND NOW() < c.fecha_apertura_programada                    THEN 'proximo'
    WHEN cl.max_postulaciones IS NOT NULL
     AND COUNT(f.id_formulario) >= cl.max_postulaciones          THEN 'lleno'
    WHEN c.fecha_limite_cierre IS NOT NULL
     AND NOW() > c.fecha_limite_cierre                           THEN 'cerrado'
    ELSE 'abierto'
  END AS estado_calculado
FROM convocatorias c
JOIN clubes cl ON cl.id_club = c.id_club
LEFT JOIN formularios f ON f.id_convocatoria = c.id_convocatoria
GROUP BY c.id_convocatoria, cl.id_club;

-- ============================================================
-- QUERIES DE PRUEBA (ejecutar manualmente en psql)
-- ============================================================

-- 1. Listar convocatorias abiertas
-- SELECT id_convocatoria, id_club, estado_calculado,
--        formularios_recibidos, max_postulaciones
-- FROM convocatorias_con_estado
-- WHERE estado_calculado = 'abierto';

-- 2. Contar convocatorias por estado
-- SELECT estado_calculado, COUNT(*) AS total
-- FROM convocatorias_con_estado
-- GROUP BY estado_calculado;

-- 3. Convocatorias llenas o cerradas (detalle)
-- SELECT id_convocatoria, id_club, estado_calculado,
--        formularios_recibidos, cupo_maximo, max_postulaciones
-- FROM convocatorias_con_estado
-- WHERE estado_calculado IN ('lleno', 'cerrado');
