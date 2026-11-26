-- Reconocimientos permanentes por asistencia confirmada a ediciones.
-- Aplicar una vez en la base existente después de tener el esquema de actividades.
--
-- PERMISOS SQL (no hay un rol runtime declarado en el repositorio):
-- backend/db.js usa un pool único; en producción su rol es el usuario de la
-- DATABASE_URL secreta y no puede asumirse que sea el propietario de la tabla.
-- Esta migración no crea GRANT/REVOKE ni habilita RLS. La función del trigger es
-- SECURITY INVOKER: el rol que escriba en actividades_asistencias necesita SELECT
-- en actividades_registros, actividades_ediciones y clubes; INSERT y DELETE en
-- expediente_reconocimientos; y USAGE en
-- expediente_reconocimientos_id_reconocimiento_seq. Los endpoints de lectura
-- necesitan SELECT. Verificar current_user, propietario y ACL en cada entorno
-- antes de ejecutarla con un rol no propietario. El filtro de "mis reconocimientos"
-- por id_usuario se aplica en Express, no mediante RLS.
BEGIN;

-- Compatibilidad con registros creados antes de la migración de Misiones v2.
ALTER TABLE actividades_registros
    ADD COLUMN IF NOT EXISTS tipo_participante VARCHAR(10) NOT NULL DEFAULT 'unid';

CREATE TABLE IF NOT EXISTS expediente_reconocimientos (
    id_reconocimiento BIGSERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
    id_edicion INT REFERENCES actividades_ediciones(id_edicion) ON DELETE SET NULL,
    tipo_actividad VARCHAR(20) NOT NULL,
    nombre_actividad VARCHAR(160) NOT NULL,
    nombre_edicion VARCHAR(160) NOT NULL,
    anio SMALLINT NOT NULL,
    insignia_key VARCHAR(120),
    otorgada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_expediente_reconocimiento_usuario_edicion
    ON expediente_reconocimientos (id_usuario, id_edicion)
    WHERE id_edicion IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expediente_reconocimientos_usuario
    ON expediente_reconocimientos (id_usuario, anio DESC, otorgada_en DESC);

CREATE OR REPLACE FUNCTION fn_sync_expediente_reconocimiento_actividad()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario INT;
    v_tipo_participante VARCHAR(10);
    v_matricula VARCHAR(50);
    v_id_edicion INT;
    v_actividad VARCHAR(160);
    v_plantilla VARCHAR(20);
    v_edicion VARCHAR(160);
    v_fecha DATE;
    v_anio SMALLINT;
    v_insignia_key VARCHAR(120);
BEGIN
    SELECT r.id_usuario, r.tipo_participante, r.matricula,
           e.id_edicion, c.nombre_club, c.plantilla, e.nombre,
           COALESCE(e.fecha_inicio, e.fecha_fin, (NEW.registrada_en AT TIME ZONE 'America/Merida')::date)
      INTO v_usuario, v_tipo_participante, v_matricula,
           v_id_edicion, v_actividad, v_plantilla, v_edicion, v_fecha
      FROM actividades_registros r
      JOIN actividades_ediciones e ON e.id_edicion = r.id_edicion
      JOIN clubes c ON c.id_club = e.id_actividad
     WHERE r.id_registro = NEW.id_registro;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    IF NEW.estado <> 'presente' THEN
        IF v_usuario IS NOT NULL AND v_id_edicion IS NOT NULL THEN
            DELETE FROM expediente_reconocimientos
             WHERE id_usuario = v_usuario AND id_edicion = v_id_edicion;
        END IF;
        RETURN NEW;
    END IF;

    IF v_usuario IS NULL OR v_tipo_participante <> 'unid' OR NULLIF(BTRIM(v_matricula), '') IS NULL THEN
        RETURN NEW;
    END IF;

    v_anio := EXTRACT(YEAR FROM v_fecha)::SMALLINT;
    v_insignia_key := CASE v_plantilla
        WHEN 'trineo' THEN 'trineo-de-los-suenos-' || v_anio::text
        WHEN 'misiones' THEN 'misiones-' || v_anio::text
        ELSE NULL
    END;

    INSERT INTO expediente_reconocimientos (
        id_usuario, id_edicion, tipo_actividad, nombre_actividad,
        nombre_edicion, anio, insignia_key, otorgada_en
    ) VALUES (
        v_usuario, v_id_edicion, v_plantilla, v_actividad,
        v_edicion, v_anio, v_insignia_key, NEW.registrada_en
    )
    ON CONFLICT (id_usuario, id_edicion) WHERE id_edicion IS NOT NULL DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_expediente_reconocimiento_actividad ON actividades_asistencias;
CREATE TRIGGER trg_sync_expediente_reconocimiento_actividad
    AFTER INSERT OR UPDATE OF estado ON actividades_asistencias
    FOR EACH ROW
    EXECUTE FUNCTION fn_sync_expediente_reconocimiento_actividad();

-- Conserva también las asistencias válidas que existían antes de esta migración.
WITH asistentes AS (
    SELECT r.id_usuario, e.id_edicion, r.tipo_participante, r.matricula,
           c.plantilla, c.nombre_club AS nombre_actividad, e.nombre AS nombre_edicion,
           a.registrada_en,
           EXTRACT(YEAR FROM COALESCE(
               e.fecha_inicio, e.fecha_fin,
               (a.registrada_en AT TIME ZONE 'America/Merida')::date
           ))::SMALLINT AS anio
      FROM actividades_asistencias a
      JOIN actividades_registros r ON r.id_registro = a.id_registro
      JOIN actividades_ediciones e ON e.id_edicion = r.id_edicion
      JOIN clubes c ON c.id_club = e.id_actividad
     WHERE a.estado = 'presente'
       AND r.id_usuario IS NOT NULL
       AND r.tipo_participante = 'unid'
       AND NULLIF(BTRIM(r.matricula), '') IS NOT NULL
)
INSERT INTO expediente_reconocimientos (
    id_usuario, id_edicion, tipo_actividad, nombre_actividad,
    nombre_edicion, anio, insignia_key, otorgada_en
)
SELECT id_usuario, id_edicion, plantilla, nombre_actividad, nombre_edicion,
       anio,
       CASE plantilla
           WHEN 'trineo' THEN 'trineo-de-los-suenos-' || anio::text
           WHEN 'misiones' THEN 'misiones-' || anio::text
           ELSE NULL
       END,
       registrada_en
  FROM asistentes
ON CONFLICT (id_usuario, id_edicion) WHERE id_edicion IS NOT NULL DO NOTHING;

COMMIT;
