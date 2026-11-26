-- La entrevista asignada a una postulación debe pertenecer al mismo club.
-- Conserva el comportamiento previo: al borrar el bloque, solo se limpia
-- formularios.id_convocatoria y se mantiene la postulación.
LOCK TABLE formularios, convocatorias IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM formularios f
        LEFT JOIN convocatorias c ON c.id_convocatoria = f.id_convocatoria
        WHERE f.id_convocatoria IS NOT NULL
          AND (c.id_convocatoria IS NULL OR c.id_club IS DISTINCT FROM f.id_club)
    ) THEN
        RAISE EXCEPTION
          'Migración detenida: hay postulaciones vinculadas a un bloque inexistente o de otro club; no se modificaron datos';
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_convocatoria_id_club
    ON convocatorias (id_convocatoria, id_club);

ALTER TABLE formularios
    DROP CONSTRAINT IF EXISTS fk_formulario_convocatoria;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'formularios'::regclass
          AND conname = 'fk_formulario_convocatoria_club'
    ) THEN
        ALTER TABLE formularios
            ADD CONSTRAINT fk_formulario_convocatoria_club
            FOREIGN KEY (id_convocatoria, id_club)
            REFERENCES convocatorias (id_convocatoria, id_club)
            ON DELETE SET NULL (id_convocatoria);
    END IF;
END $$;
