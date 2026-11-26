-- Mantiene en PostgreSQL el mismo catálogo de tipos que acepta la API.
-- Si quedaron tipos desconocidos, se detiene sin corregir filas automáticamente.
DO $$
DECLARE
    v_id_pregunta INTEGER;
    v_tipo TEXT;
    v_id_formulario INTEGER;
BEGIN
    SELECT id_pregunta, tipo INTO v_id_pregunta, v_tipo
    FROM club_formulario_preguntas
    WHERE tipo IS NULL OR tipo NOT IN ('texto', 'textarea', 'numero', 'seleccion', 'fecha')
    ORDER BY id_pregunta
    LIMIT 1;
    IF v_id_pregunta IS NOT NULL THEN
        RAISE EXCEPTION
          'Migración detenida: la pregunta configurable % usa el tipo desconocido "%"; revísalo antes de cambiar el catálogo',
          v_id_pregunta, v_tipo;
    END IF;

    SELECT id_pregunta, tipo_snapshot, id_formulario
      INTO v_id_pregunta, v_tipo, v_id_formulario
    FROM formulario_respuestas_extra
    WHERE tipo_snapshot IS NULL
       OR tipo_snapshot NOT IN ('texto', 'textarea', 'numero', 'seleccion', 'fecha')
    ORDER BY id_formulario, id_pregunta
    LIMIT 1;
    IF v_id_pregunta IS NOT NULL THEN
        RAISE EXCEPTION
          'Migración detenida: la respuesta configurable del formulario % conserva el tipo desconocido "%"; no se modificaron respuestas',
          v_id_formulario, v_tipo;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_club_formulario_tipo'
          AND conrelid = 'club_formulario_preguntas'::regclass
    ) THEN
        ALTER TABLE club_formulario_preguntas
            ADD CONSTRAINT chk_club_formulario_tipo
            CHECK (tipo IN ('texto', 'textarea', 'numero', 'seleccion', 'fecha'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_formulario_respuesta_tipo_snapshot'
          AND conrelid = 'formulario_respuestas_extra'::regclass
    ) THEN
        ALTER TABLE formulario_respuestas_extra
            ADD CONSTRAINT chk_formulario_respuesta_tipo_snapshot
            CHECK (tipo_snapshot IN ('texto', 'textarea', 'numero', 'seleccion', 'fecha'));
    END IF;
END $$;
