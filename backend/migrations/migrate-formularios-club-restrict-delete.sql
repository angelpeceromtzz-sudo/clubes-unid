-- Evita que borrar físicamente un club elimine postulaciones y respuestas
-- configurables históricas, incluido el JSON legado que se conserva intacto.
-- Los clubes se retiran mediante su estado; el historial permanece disponible.
ALTER TABLE formularios DROP CONSTRAINT IF EXISTS fk_formulario_club;
-- También contempla el nombre automático que PostgreSQL asigna cuando la
-- relación se creó sin nombre explícito.
ALTER TABLE formularios DROP CONSTRAINT IF EXISTS formularios_id_club_fkey;
ALTER TABLE formularios
    ADD CONSTRAINT fk_formulario_club
    FOREIGN KEY (id_club) REFERENCES clubes(id_club) ON DELETE RESTRICT;

DO $$
DECLARE
    v_total INTEGER;
    v_restrictivas INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER,
           COUNT(*) FILTER (WHERE confdeltype = 'r')::INTEGER
      INTO v_total, v_restrictivas
    FROM pg_constraint
    WHERE conrelid = 'formularios'::regclass
      AND confrelid = 'clubes'::regclass
      AND contype = 'f';

    IF v_total <> 1 OR v_restrictivas <> 1 THEN
        RAISE EXCEPTION
          'Migración detenida: formularios debe tener una sola FK restrictiva hacia clubes; revisa las relaciones existentes';
    END IF;
END $$;
