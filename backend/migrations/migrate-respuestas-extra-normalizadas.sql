-- Normaliza respuestas configurables sin borrar el JSON legado ni respuestas
-- cuyo ID de pregunta ya no existe. Las FKs compuestas validan pertenencia.
-- Crear primero las claves referenciadas: PostgreSQL exige que existan al
-- momento de declarar las FKs compuestas de la tabla nueva.
CREATE UNIQUE INDEX IF NOT EXISTS uq_formularios_formulario_club
    ON formularios(id_formulario, id_club);
CREATE UNIQUE INDEX IF NOT EXISTS uq_club_preguntas_pregunta_club
    ON club_formulario_preguntas(id_pregunta, id_club);

CREATE TABLE IF NOT EXISTS formulario_respuestas_extra (
    id_formulario INT NOT NULL,
    id_pregunta INT NOT NULL,
    id_club INT NOT NULL,
    etiqueta_snapshot VARCHAR(200) NOT NULL,
    tipo_snapshot VARCHAR(30) NOT NULL,
    configuracion_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    respuesta JSONB NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_formulario, id_pregunta),
    CONSTRAINT fk_respuesta_extra_formulario_club
        FOREIGN KEY (id_formulario, id_club)
        REFERENCES formularios(id_formulario, id_club) ON DELETE RESTRICT,
    CONSTRAINT fk_respuesta_extra_pregunta_club
        FOREIGN KEY (id_pregunta, id_club)
        REFERENCES club_formulario_preguntas(id_pregunta, id_club) ON DELETE RESTRICT
);

-- Estas respuestas pueden contener información de salud. Se consultan solo
-- desde el backend; no se habilita acceso directo desde anon/authenticated.
ALTER TABLE formulario_respuestas_extra ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION fn_bloquear_reasignacion_con_respuestas_extra()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.id_club IS DISTINCT FROM OLD.id_club THEN
        IF TG_TABLE_NAME = 'formularios' THEN
            IF OLD.respuestas_extra <> '{}'::jsonb THEN
                RAISE EXCEPTION 'No se puede mover de club un formulario que ya tiene respuestas configurables';
            END IF;
        ELSIF TG_TABLE_NAME = 'club_formulario_preguntas' THEN
            IF EXISTS (
                   SELECT 1 FROM formularios f
                   WHERE f.id_club = OLD.id_club AND f.respuestas_extra ? OLD.id_pregunta::text
               ) THEN
                RAISE EXCEPTION 'No se puede mover de club una pregunta que ya tiene respuestas';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_validar_json_respuestas_extra()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.respuestas_extra IS NOT DISTINCT FROM OLD.respuestas_extra THEN
        RETURN NEW;
    END IF;
    IF jsonb_typeof(NEW.respuestas_extra) <> 'object' THEN
        RAISE EXCEPTION 'respuestas_extra debe ser un objeto JSON';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM jsonb_object_keys(NEW.respuestas_extra) AS dato(clave)
        LEFT JOIN club_formulario_preguntas p
          ON p.id_pregunta::text = dato.clave
         AND p.id_club = NEW.id_club
        WHERE dato.clave !~ '^[0-9]+$' OR p.id_pregunta IS NULL
    ) THEN
        RAISE EXCEPTION 'Cada clave de respuestas_extra debe identificar una pregunta del club del formulario';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_formulario_club_respuestas_extra ON formularios;
CREATE TRIGGER trg_formulario_club_respuestas_extra
    BEFORE UPDATE OF id_club ON formularios
    FOR EACH ROW EXECUTE FUNCTION fn_bloquear_reasignacion_con_respuestas_extra();
DROP TRIGGER IF EXISTS trg_pregunta_club_respuestas_extra ON club_formulario_preguntas;
CREATE TRIGGER trg_pregunta_club_respuestas_extra
    BEFORE UPDATE OF id_club ON club_formulario_preguntas
    FOR EACH ROW EXECUTE FUNCTION fn_bloquear_reasignacion_con_respuestas_extra();
DROP TRIGGER IF EXISTS trg_validar_json_respuestas_extra ON formularios;
CREATE TRIGGER trg_validar_json_respuestas_extra
    BEFORE INSERT OR UPDATE OF respuestas_extra ON formularios
    FOR EACH ROW EXECUTE FUNCTION fn_validar_json_respuestas_extra();

CREATE INDEX IF NOT EXISTS idx_formulario_respuestas_extra_pregunta
    ON formulario_respuestas_extra(id_pregunta);

-- Migra solo claves que identifican preguntas vigentes del mismo club.
-- El JSON original permanece intacto para respuestas huérfanas o revisión.
INSERT INTO formulario_respuestas_extra
    (id_formulario, id_pregunta, id_club, etiqueta_snapshot, tipo_snapshot,
     configuracion_snapshot, respuesta)
SELECT f.id_formulario, p.id_pregunta, f.id_club, p.etiqueta, p.tipo,
       p.configuracion, dato.value
FROM formularios f
CROSS JOIN LATERAL jsonb_each(
    CASE WHEN jsonb_typeof(f.respuestas_extra) = 'object'
         THEN f.respuestas_extra ELSE '{}'::jsonb END
) AS dato(key, value)
JOIN club_formulario_preguntas p
  ON p.id_pregunta::text = dato.key
 AND p.id_club = f.id_club
WHERE dato.key ~ '^[0-9]+$'
ON CONFLICT (id_formulario, id_pregunta) DO NOTHING;
