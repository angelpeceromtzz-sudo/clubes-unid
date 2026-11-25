-- Sustituye el CHECK duplicado por una FK al catálogo de estados.
-- No cambia los estados existentes. Si alguno no está catalogado, cancela
-- para que el equipo decida su equivalencia antes de aplicar la restricción.
DO $$
DECLARE
    v_estados_sin_catalogo TEXT;
BEGIN
    SELECT string_agg(format('%L (%s filas)', estado, cantidad), ', ')
      INTO v_estados_sin_catalogo
    FROM (
        SELECT f.status AS estado, COUNT(*) AS cantidad
        FROM formularios f
        LEFT JOIN cat_estatus_postulacion c ON c.nombre = f.status
        WHERE c.id_estatus IS NULL
        GROUP BY f.status
        ORDER BY f.status
        LIMIT 10
    ) AS no_catalogados;

    IF v_estados_sin_catalogo IS NOT NULL THEN
        RAISE EXCEPTION 'Migración detenida: hay estados de postulación sin catálogo: %', v_estados_sin_catalogo;
    END IF;
END $$;

ALTER TABLE formularios DROP CONSTRAINT IF EXISTS chk_status;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_formulario_estatus'
          AND conrelid = 'formularios'::regclass
    ) THEN
        ALTER TABLE formularios
            ADD CONSTRAINT fk_formulario_estatus
            FOREIGN KEY (status) REFERENCES cat_estatus_postulacion(nombre)
            ON DELETE RESTRICT;
    END IF;
END $$;

