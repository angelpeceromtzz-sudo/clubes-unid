-- Migración idempotente: elimina bloques insuficientes (1-2 alumnos) y sus
-- inscripciones incompletas solo después de 4 días desde el cierre de la
-- convocatoria general. Protege Miembro oficial, Rechazado, Oferta enviada.
-- No ejecutar en producción sin revisión.

BEGIN;

DELETE FROM formularios
WHERE id_convocatoria IN (
  SELECT c.id_convocatoria
  FROM convocatorias c
  JOIN clubes_con_estado ce ON ce.id_club = c.id_club
  WHERE ce.fecha_limite_cierre IS NOT NULL
    AND ce.fecha_limite_cierre + INTERVAL '4 days' <= clock_timestamp()
    AND (
      SELECT COUNT(*) FROM formularios f
      WHERE f.id_convocatoria = c.id_convocatoria
        AND f.status IN ('Preseleccionado', 'Convocado')
    ) BETWEEN 1 AND 2
)
AND status IN ('Preseleccionado', 'Convocado');

DELETE FROM convocatorias
WHERE id_club IN (
  SELECT id_club FROM clubes_con_estado
  WHERE fecha_limite_cierre IS NOT NULL
    AND fecha_limite_cierre + INTERVAL '4 days' <= clock_timestamp()
)
AND id_convocatoria IN (
  SELECT c.id_convocatoria
  FROM convocatorias c
  JOIN clubes_con_estado ce ON ce.id_club = c.id_club
  WHERE ce.fecha_limite_cierre IS NOT NULL
    AND ce.fecha_limite_cierre + INTERVAL '4 days' <= clock_timestamp()
    AND (
      SELECT COUNT(*) FROM formularios f
      WHERE f.id_convocatoria = c.id_convocatoria
        AND f.status IN ('Preseleccionado', 'Convocado')
    ) BETWEEN 1 AND 2
)
AND NOT EXISTS (
  SELECT 1 FROM formularios f WHERE f.id_convocatoria = convocatorias.id_convocatoria
);

COMMIT;