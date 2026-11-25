-- Evita que una FK heredada con ON DELETE CASCADE borre respuestas al
-- eliminar una encuesta. El flujo administrativo autorizado elimina primero
-- las respuestas explícitamente dentro de su transacción.
DO $$
DECLARE
    v_tabla_respuestas OID := to_regclass('respuestas_encuesta');
    v_tabla_encuestas OID := to_regclass('encuestas');
    v_col_respuesta SMALLINT;
    v_col_encuesta SMALLINT;
    v_fks RECORD;
    v_total INTEGER;
    v_restrictivas_validas INTEGER;
BEGIN
    IF v_tabla_respuestas IS NULL OR v_tabla_encuestas IS NULL THEN
        RAISE EXCEPTION 'Migración detenida: faltan encuestas o respuestas_encuesta';
    END IF;

    SELECT attnum INTO v_col_respuesta
    FROM pg_attribute
    WHERE attrelid = v_tabla_respuestas AND attname = 'id_encuesta' AND NOT attisdropped;

    SELECT attnum INTO v_col_encuesta
    FROM pg_attribute
    WHERE attrelid = v_tabla_encuestas AND attname = 'id_encuesta' AND NOT attisdropped;

    IF v_col_respuesta IS NULL OR v_col_encuesta IS NULL THEN
        RAISE EXCEPTION 'Migración detenida: faltan columnas id_encuesta';
    END IF;

    SELECT count(*)::INTEGER,
           count(*) FILTER (
               WHERE c.confdeltype = 'r' AND c.confupdtype = 'a'
                 AND c.convalidated AND NOT c.condeferrable
           )::INTEGER
      INTO v_total, v_restrictivas_validas
    FROM pg_constraint c
    WHERE c.conrelid = v_tabla_respuestas
      AND c.confrelid = v_tabla_encuestas
      AND c.contype = 'f'
      AND c.conkey = ARRAY[v_col_respuesta]::SMALLINT[]
      AND c.confkey = ARRAY[v_col_encuesta]::SMALLINT[];

    IF v_total = 1 AND v_restrictivas_validas = 1 THEN
        RETURN;
    END IF;

    IF v_total > 1 THEN
        RAISE EXCEPTION
          'Migración detenida: hay % FK entre respuestas_encuesta y encuestas para id_encuesta; revisa la relación antes de cambiarla',
          v_total;
    END IF;

    FOR v_fks IN
        SELECT c.conname, c.confupdtype, c.condeferrable
        FROM pg_constraint c
        WHERE c.conrelid = v_tabla_respuestas
          AND c.confrelid = v_tabla_encuestas
          AND c.contype = 'f'
          AND c.conkey = ARRAY[v_col_respuesta]::SMALLINT[]
          AND c.confkey = ARRAY[v_col_encuesta]::SMALLINT[]
    LOOP
        IF v_fks.confupdtype <> 'a' OR v_fks.condeferrable THEN
            RAISE EXCEPTION
              'Migración detenida: la FK % tiene reglas de actualización o aplazamiento no estándar',
              v_fks.conname;
        END IF;
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 'respuestas_encuesta', v_fks.conname);
    END LOOP;

    ALTER TABLE respuestas_encuesta
        ADD CONSTRAINT fk_respuesta_encuesta
        FOREIGN KEY (id_encuesta) REFERENCES encuestas(id_encuesta)
        ON DELETE RESTRICT;

    SELECT count(*)::INTEGER,
           count(*) FILTER (WHERE confdeltype = 'r' AND convalidated)::INTEGER
      INTO v_total, v_restrictivas_validas
    FROM pg_constraint
    WHERE conrelid = v_tabla_respuestas
      AND confrelid = v_tabla_encuestas
      AND contype = 'f'
      AND conkey = ARRAY[v_col_respuesta]::SMALLINT[]
      AND confkey = ARRAY[v_col_encuesta]::SMALLINT[];

    IF v_total <> 1 OR v_restrictivas_validas <> 1 THEN
        RAISE EXCEPTION 'Migración detenida: no se pudo establecer la FK restrictiva de respuestas';
    END IF;
END $$;
