-- Refuerza en PostgreSQL la privacidad que también valida la API.
-- No asigna identidades ni reescribe respuestas históricas.
DO $$
DECLARE
    v_id_encuesta INTEGER;
    v_id_respuesta INTEGER;
BEGIN
    SELECT e.id_encuesta, r.id_respuesta
      INTO v_id_encuesta, v_id_respuesta
    FROM encuestas e
    JOIN respuestas_encuesta r ON r.id_encuesta = e.id_encuesta
    WHERE e.tipo_privacidad = 'publico_anonimo'
      AND r.id_usuario IS NOT NULL
    ORDER BY e.id_encuesta, r.id_respuesta
    LIMIT 1;

    IF v_id_respuesta IS NOT NULL THEN
        RAISE EXCEPTION
          'Migración detenida: la respuesta % de la encuesta anónima % conserva identidad; revisa el caso sin cambiar respuestas',
          v_id_respuesta, v_id_encuesta;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION fn_validar_privacidad_respuesta_encuesta()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_privacidad VARCHAR(24);
BEGIN
    SELECT tipo_privacidad
      INTO v_privacidad
    FROM encuestas
    WHERE id_encuesta = NEW.id_encuesta
    FOR SHARE;

    -- Si no existe la encuesta, la FK informa el error correspondiente.
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.id_encuesta IS DISTINCT FROM OLD.id_encuesta THEN
        RAISE EXCEPTION 'La respuesta no puede cambiarse a otra encuesta'
          USING ERRCODE = '23514';
    END IF;

    IF v_privacidad = 'publico_anonimo' AND NEW.id_usuario IS NOT NULL THEN
        RAISE EXCEPTION 'Una respuesta anónima no puede guardar identidad'
          USING ERRCODE = '23514';
    END IF;

    IF TG_OP = 'INSERT'
       AND v_privacidad = 'institucional'
       AND NEW.id_usuario IS NULL THEN
        RAISE EXCEPTION 'Una respuesta institucional requiere identidad al enviarse'
          USING ERRCODE = '23514';
    END IF;

    IF TG_OP = 'UPDATE'
       AND v_privacidad = 'institucional'
       AND NEW.id_usuario IS DISTINCT FROM OLD.id_usuario THEN
        -- La FK anida su trigger para ON DELETE SET NULL; un UPDATE directo tiene profundidad 1.
        IF OLD.id_usuario IS NOT NULL
           AND NEW.id_usuario IS NULL
           AND pg_trigger_depth() > 1 THEN
            RETURN NEW;
        END IF;
        RAISE EXCEPTION 'La identidad institucional no puede cambiarse después del envío'
          USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_privacidad_respuesta_encuesta ON respuestas_encuesta;
CREATE TRIGGER trg_validar_privacidad_respuesta_encuesta
    BEFORE INSERT OR UPDATE OF id_encuesta, id_usuario ON respuestas_encuesta
    FOR EACH ROW EXECUTE FUNCTION fn_validar_privacidad_respuesta_encuesta();

CREATE OR REPLACE FUNCTION fn_bloquear_cambio_privacidad_encuesta()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.tipo_privacidad IS DISTINCT FROM OLD.tipo_privacidad
       AND EXISTS (
           SELECT 1 FROM respuestas_encuesta r
           WHERE r.id_encuesta = OLD.id_encuesta
       ) THEN
        RAISE EXCEPTION 'La privacidad no puede cambiar después de recibir respuestas'
          USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bloquear_cambio_privacidad_encuesta ON encuestas;
CREATE TRIGGER trg_bloquear_cambio_privacidad_encuesta
    BEFORE UPDATE OF tipo_privacidad ON encuestas
    FOR EACH ROW EXECUTE FUNCTION fn_bloquear_cambio_privacidad_encuesta();
