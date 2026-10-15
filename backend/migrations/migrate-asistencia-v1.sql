-- ============================================================
-- MÓDULO ASISTENCIA V1 — Migración (PBI-05)
-- ============================================================
-- Segura e idempotente: puede ejecutarse múltiples veces sin
-- producir errores ni duplicados. No contiene operaciones
-- destructivas sobre datos existentes.
--
-- Regla de negocio clave (PBI-05 §23, §24, §32):
--   Cada sesión conserva en `integrantes_snapshot` (JSONB) la
--   composición de su lista de integrantes. Las sesiones iniciadas,
--   completadas o canceladas son inmutables: bajas o cambios de
--   membresía posteriores NO alteran sesiones históricas. Las sesiones
--   aún 'pendiente' sí refrescan su snapshot con filtro de fechas
--   (§24: una incorporación no entra retroactivamente a la lista de un
--   día anterior, ni a la del día en que se incorporó).
-- ============================================================

-- 1. Periodos de actividad (cuatrimestres con fechas)
--    Las fechas institucionales exactas se configuran por la
--    institución (ver plantilla comentada en seed.sql).
CREATE TABLE IF NOT EXISTS periodos_actividad (
    id_periodo SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    activo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_periodos_fechas UNIQUE (fecha_inicio, fecha_fin)
);

CREATE INDEX IF NOT EXISTS idx_periodos_actividad_fechas
    ON periodos_actividad (fecha_inicio, fecha_fin);

-- 2. Sesiones: instancias concretas derivadas de horarios_club
--    ON DELETE RESTRICT preserva el historial (no se borran en cascada).
CREATE TABLE IF NOT EXISTS sesiones (
    id_sesion SERIAL PRIMARY KEY,
    id_club INT NOT NULL REFERENCES clubes (id_club) ON DELETE RESTRICT,
    id_periodo INT NOT NULL REFERENCES periodos_actividad (id_periodo) ON DELETE RESTRICT,
    id_horario INT NOT NULL REFERENCES horarios_club (id_horario) ON DELETE RESTRICT,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    lugar VARCHAR(255) NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'pendiente'
        CONSTRAINT chk_sesion_estado CHECK (estado IN (
            'pendiente', 'en_progreso', 'completada', 'cancelada'
        )),
    iniciada_en TIMESTAMPTZ,
    finalizada_en TIMESTAMPTZ,
    cancelada_en TIMESTAMPTZ,
    motivo_cancelacion VARCHAR(50),
    observacion_cancelacion TEXT,
    cancelada_por INT REFERENCES usuarios (id_usuario) ON DELETE SET NULL,
    integrantes_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_sesion_horario_fecha UNIQUE (id_horario, fecha)
);

CREATE INDEX IF NOT EXISTS idx_sesiones_club_fecha ON sesiones (id_club, fecha);
CREATE INDEX IF NOT EXISTS idx_sesiones_periodo ON sesiones (id_periodo);
CREATE INDEX IF NOT EXISTS idx_sesiones_estado ON sesiones (estado);
CREATE INDEX IF NOT EXISTS idx_sesiones_club_periodo ON sesiones (id_club, id_periodo);

-- Nota técnica sobre estados 'no_registrada' y 'no_completada' (PBI-05 §17–§19):
--   Se calculan EN TIEMPO DE LECTURA a partir de fecha vs fecha institucional
--   (pendiente + fecha pasada => no_registrada; en_progreso + fecha pasada =>
--   no_completada). No requieren proceso programado y no se almacenan.

-- 3. Registros de asistencia (integrante × sesión)
--    ON DELETE RESTRICT: el historial de asistencia nunca se elimina en cascada.
CREATE TABLE IF NOT EXISTS asistencias (
    id_asistencia SERIAL PRIMARY KEY,
    id_sesion INT NOT NULL REFERENCES sesiones (id_sesion) ON DELETE RESTRICT,
    id_usuario INT NOT NULL REFERENCES usuarios (id_usuario) ON DELETE RESTRICT,
    estado VARCHAR(20) NOT NULL
        CONSTRAINT chk_asistencia_estado CHECK (estado IN ('presente', 'ausente', 'justificado')),
    motivo_justificacion TEXT,
    registrada_en TIMESTAMPTZ DEFAULT NOW(),
    actualizada_en TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_asistencia_sesion_usuario UNIQUE (id_sesion, id_usuario)
);

CREATE INDEX IF NOT EXISTS idx_asistencias_sesion ON asistencias (id_sesion);
CREATE INDEX IF NOT EXISTS idx_asistencias_usuario ON asistencias (id_usuario);

CREATE OR REPLACE FUNCTION fn_actualizar_asistencia_ts()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizada_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_asistencia ON asistencias;
CREATE TRIGGER trg_actualizar_asistencia
    BEFORE UPDATE ON asistencias
    FOR EACH ROW
    EXECUTE FUNCTION fn_actualizar_asistencia_ts();

-- 4. Catálogo de motivos de cancelación
CREATE TABLE IF NOT EXISTS cat_motivos_cancelacion (
    codigo VARCHAR(50) PRIMARY KEY,
    descripcion VARCHAR(100) NOT NULL,
    orden INT DEFAULT 0
);

INSERT INTO cat_motivos_cancelacion (codigo, descripcion, orden) VALUES
    ('evento_institucional', 'Evento institucional', 1),
    ('clima', 'Condiciones climáticas', 2),
    ('instalaciones', 'Instalaciones no disponibles', 3),
    ('ausencia_responsable', 'Ausencia del responsable', 4),
    ('dia_inhabil', 'Día inhábil o suspensión institucional', 5),
    ('otro', 'Otro', 99)
ON CONFLICT (codigo) DO NOTHING;

-- 5. Función idempotente: genera las sesiones de un club para un periodo
--    a partir de los horarios oficiales (horarios_club), capturando el
--    SNAPSHOT de integrantes elegibles al momento de la generación.
--
--    Elegibles = inscripción activa + rol alumno + cuenta no borrada.
--    Cubre ambos caminos de incorporación: oferta aceptada (RF-08) e
--    inscripción directa (RF-03). Matrícula: formulario si existe, si no
--    institutional_id de usuarios.
CREATE OR REPLACE FUNCTION generar_sesiones_periodo_club(p_id_periodo INT, p_id_club INT)
RETURNS INT AS $$
DECLARE
    v_horario RECORD;
    v_fecha DATE;
    v_dia_semana INT;
    v_inicio DATE;
    v_fin DATE;
    v_snapshot JSONB;
    v_creadas INT := 0;
BEGIN
    SELECT fecha_inicio, fecha_fin
    INTO v_inicio, v_fin
    FROM periodos_actividad
    WHERE id_periodo = p_id_periodo;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Periodo no encontrado: %', p_id_periodo;
    END IF;

    -- Snapshot inicial de elegibles AHORA. Es solo el valor de entrada para
    -- las filas recién creadas: el refresco de abajo recalcula cualquier
    -- sesión 'pendiente' con el filtro de fechas de §24 en esta misma corrida.
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id_usuario', u.id_usuario,
                'nombre_completo', u.nombre_completo,
                'matricula', COALESCE(f.matricula, u.institutional_id, ''),
                'licenciatura', COALESCE(l.nombre, '')
            )
            ORDER BY u.nombre_completo
        ),
        '[]'::jsonb
    )
    INTO v_snapshot
    FROM inscripciones i
    JOIN usuarios u ON u.id_usuario = i.id_usuario
    LEFT JOIN LATERAL (
        SELECT fo.matricula, fo.id_licenciatura
        FROM formularios fo
        WHERE fo.id_alumno = u.id_usuario
          AND fo.id_club = i.id_club
          AND fo.status = 'Miembro oficial'
        ORDER BY fo.fecha_envio DESC
        LIMIT 1
    ) f ON TRUE
    LEFT JOIN cat_licenciaturas l ON l.id_licenciatura = f.id_licenciatura
    WHERE i.id_club = p_id_club
      AND i.id_estatus_inscripcion = 1
      AND u.id_rol = 1
      AND u.deleted_at IS NULL;

    FOR v_horario IN SELECT * FROM horarios_club WHERE id_club = p_id_club LOOP
        v_dia_semana := v_horario.dia_semana;

        -- Primera ocurrencia del día dentro del periodo
        -- EXTRACT(DOW): 0=Domingo … 6=Sábado (misma convención que dia_semana)
        v_fecha := v_inicio;
        WHILE EXTRACT(DOW FROM v_fecha)::INT != v_dia_semana LOOP
            v_fecha := v_fecha + INTERVAL '1 day';
        END LOOP;

        WHILE v_fin >= v_fecha LOOP
            INSERT INTO sesiones (
                id_club, id_periodo, id_horario, fecha,
                hora_inicio, hora_fin, lugar, integrantes_snapshot
            )
            VALUES (
                p_id_club, p_id_periodo, v_horario.id_horario, v_fecha,
                v_horario.hora_inicio, v_horario.hora_fin, v_horario.lugar, v_snapshot
            )
            ON CONFLICT (id_horario, fecha) DO NOTHING;
            GET DIAGNOSTICS v_creadas = ROW_COUNT;

            v_fecha := v_fecha + INTERVAL '7 days';
        END LOOP;
    END LOOP;

    -- Refresco de snapshots 'pendiente' (PBI-05 §23–§24).
    --   Una sesión solo se modifica mientras nadie haya iniciado la toma:
    --   'pendiente' = sin registros de asistencia que proteger. Al recomputar
    --   se aplican las reglas de fechas:
    --     * fecha_inscripcion::date < fecha de la sesión  → quien se incorpora
    --       un día con sesión NO entra retroactivamente a esa lista, sino a
    --       partir de la siguiente (§24);
    --     * fecha_baja aún no ocurrida respecto a la fecha de la sesión →
    --       las bajas conservan las listas anteriores a su baja (§23).
    --   Sesiones 'en_progreso', 'completada' o 'cancelada' jamás se tocan
    --   (§15: integridad histórica y estabilidad de la toma en curso).
    --   Solo se reescribe si el snapshot efectivamente cambió.
    --   CURRENT_DATE y los cast ::date se resuelven en la zona institucional
    --   porque el pool abre cada conexión con TimeZone=America/Merida.
    WITH candidatas AS (
        SELECT s.id_sesion,
               (
                   SELECT COALESCE(
                       jsonb_agg(
                           jsonb_build_object(
                               'id_usuario', u.id_usuario,
                               'nombre_completo', u.nombre_completo,
                               'matricula', COALESCE(f.matricula, u.institutional_id, ''),
                               'licenciatura', COALESCE(l.nombre, '')
                           )
                           ORDER BY u.nombre_completo
                       ),
                       '[]'::jsonb
                   )
                   FROM inscripciones i
                   JOIN usuarios u ON u.id_usuario = i.id_usuario
                   LEFT JOIN LATERAL (
                       SELECT fo.matricula, fo.id_licenciatura
                       FROM formularios fo
                       WHERE fo.id_alumno = u.id_usuario
                         AND fo.id_club = s.id_club
                         AND fo.status = 'Miembro oficial'
                       ORDER BY fo.fecha_envio DESC
                       LIMIT 1
                   ) f ON TRUE
                   LEFT JOIN cat_licenciaturas l ON l.id_licenciatura = f.id_licenciatura
                   WHERE i.id_club = s.id_club
                     AND u.id_rol = 1
                     AND u.deleted_at IS NULL
                     AND (i.id_estatus_inscripcion = 1 OR i.fecha_baja IS NOT NULL)
                     AND i.fecha_inscripcion::date < s.fecha
                     AND (i.fecha_baja IS NULL OR i.fecha_baja::date >= s.fecha)
               ) AS nuevo_snapshot
        FROM sesiones s
        WHERE s.id_club = p_id_club
          AND s.id_periodo = p_id_periodo
          AND s.estado = 'pendiente'
    )
    UPDATE sesiones s
    SET integrantes_snapshot = c.nuevo_snapshot
    FROM candidatas c
    WHERE s.id_sesion = c.id_sesion
      AND s.integrantes_snapshot IS DISTINCT FROM c.nuevo_snapshot;

    RETURN v_creadas;
END;
$$ LANGUAGE plpgsql;

-- 6. Vista auxiliar: sesiones con conteos derivados del snapshot
CREATE OR REPLACE VIEW v_sesiones_con_integrantes AS
SELECT s.*,
       jsonb_array_length(s.integrantes_snapshot) AS total_integrantes,
       (SELECT COUNT(*) FROM asistencias a WHERE a.id_sesion = s.id_sesion) AS registradas
FROM sesiones s;
