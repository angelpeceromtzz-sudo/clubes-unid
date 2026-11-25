-- Refuerza la relación entre un club y sus ciclos sin modificar ni eliminar
-- postulaciones. Se detiene antes de alterar constraints si encuentra cruces.
DO $$
DECLARE
    v_id_formulario INTEGER;
    v_id_club INTEGER;
    v_id_ciclo INTEGER;
BEGIN
    SELECT f.id_formulario, f.id_club, f.id_convocatoria_inscripcion
      INTO v_id_formulario, v_id_club, v_id_ciclo
    FROM formularios f
    LEFT JOIN convocatorias_inscripcion ci
      ON ci.id_convocatoria_inscripcion = f.id_convocatoria_inscripcion
     AND ci.id_club = f.id_club
    WHERE f.id_convocatoria_inscripcion IS NOT NULL
      AND ci.id_convocatoria_inscripcion IS NULL
    ORDER BY f.id_formulario
    LIMIT 1;

    IF v_id_formulario IS NOT NULL THEN
        RAISE EXCEPTION
          'Migración detenida: formulario % vincula el club % con el ciclo % de otro club o inexistente; no se modificaron datos',
          v_id_formulario, v_id_club, v_id_ciclo;
    END IF;

    SELECT cl.id_club, cl.id_convocatoria_inscripcion_actual
      INTO v_id_club, v_id_ciclo
    FROM clubes cl
    LEFT JOIN convocatorias_inscripcion ci
      ON ci.id_convocatoria_inscripcion = cl.id_convocatoria_inscripcion_actual
     AND ci.id_club = cl.id_club
    WHERE cl.id_convocatoria_inscripcion_actual IS NOT NULL
      AND ci.id_convocatoria_inscripcion IS NULL
    ORDER BY cl.id_club
    LIMIT 1;

    IF v_id_club IS NOT NULL THEN
        RAISE EXCEPTION
          'Migración detenida: el club % apunta al ciclo % de otro club o inexistente; no se modificaron datos',
          v_id_club, v_id_ciclo;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_convocatoria_inscripcion_id_club
    ON convocatorias_inscripcion(id_convocatoria_inscripcion, id_club);

-- Sustituye las FKs simples: la relación compuesta valida club y ciclo juntos.
ALTER TABLE clubes DROP CONSTRAINT IF EXISTS fk_club_convocatoria_inscripcion_actual;
ALTER TABLE formularios DROP CONSTRAINT IF EXISTS fk_formulario_convocatoria_inscripcion;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_club_ciclo_actual_mismo_club'
          AND conrelid = 'clubes'::regclass
    ) THEN
        ALTER TABLE clubes ADD CONSTRAINT fk_club_ciclo_actual_mismo_club
            FOREIGN KEY (id_convocatoria_inscripcion_actual, id_club)
            REFERENCES convocatorias_inscripcion(id_convocatoria_inscripcion, id_club)
            ON DELETE SET NULL (id_convocatoria_inscripcion_actual);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_formulario_ciclo_mismo_club'
          AND conrelid = 'formularios'::regclass
    ) THEN
        ALTER TABLE formularios ADD CONSTRAINT fk_formulario_ciclo_mismo_club
            FOREIGN KEY (id_convocatoria_inscripcion, id_club)
            REFERENCES convocatorias_inscripcion(id_convocatoria_inscripcion, id_club)
            ON DELETE RESTRICT;
    END IF;
END $$;
