-- Conserva el contexto de la pregunta tal como estaba al responder.
-- El valor de respuesta puede corregirse; la definición capturada no.
CREATE OR REPLACE FUNCTION fn_proteger_snapshot_respuesta_extra()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF ROW(
        NEW.id_formulario,
        NEW.id_pregunta,
        NEW.id_club,
        NEW.etiqueta_snapshot,
        NEW.tipo_snapshot,
        NEW.configuracion_snapshot,
        NEW.creado_en
    ) IS DISTINCT FROM ROW(
        OLD.id_formulario,
        OLD.id_pregunta,
        OLD.id_club,
        OLD.etiqueta_snapshot,
        OLD.tipo_snapshot,
        OLD.configuracion_snapshot,
        OLD.creado_en
    ) THEN
        RAISE EXCEPTION 'El contexto histórico de la respuesta configurable no se puede cambiar';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_snapshot_respuesta_extra ON formulario_respuestas_extra;
CREATE TRIGGER trg_proteger_snapshot_respuesta_extra
    BEFORE UPDATE OF id_formulario, id_pregunta, id_club, etiqueta_snapshot,
                     tipo_snapshot, configuracion_snapshot, creado_en
    ON formulario_respuestas_extra
    FOR EACH ROW EXECUTE FUNCTION fn_proteger_snapshot_respuesta_extra();
