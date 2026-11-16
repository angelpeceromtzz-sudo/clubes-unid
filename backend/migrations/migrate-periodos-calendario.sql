-- ============================================================
-- MIGRACIÓN — GARANTÍAS DE CALENDARIO INSTITUCIONAL
-- ============================================================
-- Idempotente. No modifica fechas automáticamente.
-- Si existen periodos solapados, termina con error real.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

BEGIN;

-- 1. Fechas válidas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_periodo_fechas_validas'
      AND conrelid = 'periodos_actividad'::regclass
  ) THEN
    ALTER TABLE periodos_actividad
      ADD CONSTRAINT chk_periodo_fechas_validas CHECK (fecha_fin >= fecha_inicio);
  END IF;
END $$;

-- 2. Reporte y bloqueo por solapamientos existentes (no modifica datos)
DO $$
DECLARE
  conflictos INT;
BEGIN
  SELECT COUNT(*)::int INTO conflictos
  FROM periodos_actividad a
  JOIN periodos_actividad b
    ON a.id_periodo < b.id_periodo
   AND a.fecha_inicio <= b.fecha_fin
   AND b.fecha_inicio <= a.fecha_fin;
  IF conflictos > 0 THEN
    RAISE EXCEPTION 'CONFLICTOS DE SOLAPAMIENTO DETECTADOS: %', conflictos;
  END IF;
END $$;

-- 3. Restricción de no solapamiento (error real si no se puede aplicar)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'excl_periodos_sin_solapamiento'
      AND conrelid = 'periodos_actividad'::regclass
  ) THEN
    ALTER TABLE periodos_actividad
      ADD CONSTRAINT excl_periodos_sin_solapamiento
      EXCLUDE USING gist (daterange(fecha_inicio, fecha_fin, '[]') WITH &&);
  END IF;
END $$;

COMMIT;