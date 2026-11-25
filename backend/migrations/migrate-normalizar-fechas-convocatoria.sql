-- Migración de prueba/normalización: asigna fechas a convocatorias de inscripción
-- con fecha_apertura_programada o fecha_limite_cierre nulas.
-- No ejecutar en producción sin revisión.

BEGIN;

UPDATE convocatorias_inscripcion
SET fecha_apertura_programada = COALESCE(fecha_apertura_programada, CURRENT_TIMESTAMP),
    fecha_limite_cierre = COALESCE(fecha_limite_cierre, CURRENT_TIMESTAMP + INTERVAL '7 days')
WHERE fecha_apertura_programada IS NULL OR fecha_limite_cierre IS NULL;

UPDATE clubes_operativos
SET fecha_apertura_programada = COALESCE(fecha_apertura_programada, CURRENT_TIMESTAMP),
    fecha_limite_cierre = COALESCE(fecha_limite_cierre, CURRENT_TIMESTAMP + INTERVAL '7 days')
WHERE fecha_apertura_programada IS NULL OR fecha_limite_cierre IS NULL;

COMMIT;