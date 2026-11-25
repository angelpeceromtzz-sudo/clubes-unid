-- Corrige conteos acumulados y respeta la vigencia de cada horario. No modifica filas. 
-- Copia la implementación vigente de schema.sql para bases existentes. 
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
    v_insertadas INT := 0;
    v_limite_fin DATE;
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
        v_limite_fin := LEAST(v_fin, COALESCE(v_horario.vigencia_fin, v_fin));

        -- Primera ocurrencia del día dentro del periodo
        -- EXTRACT(DOW): 0=Domingo … 6=Sábado (misma convención que dia_semana)
        v_fecha := GREATEST(v_inicio, COALESCE(v_horario.vigencia_inicio, v_inicio));
        WHILE EXTRACT(DOW FROM v_fecha)::INT != v_dia_semana LOOP
            v_fecha := v_fecha + INTERVAL '1 day';
        END LOOP;

        WHILE v_limite_fin >= v_fecha LOOP
            INSERT INTO sesiones (
                id_club, id_periodo, id_horario, fecha,
                hora_inicio, hora_fin, lugar, integrantes_snapshot
            )
            VALUES (
                p_id_club, p_id_periodo, v_horario.id_horario, v_fecha,
                v_horario.hora_inicio, v_horario.hora_fin, v_horario.lugar, v_snapshot
            )
            ON CONFLICT (id_horario, fecha) DO NOTHING;
            GET DIAGNOSTICS v_insertadas = ROW_COUNT;
            v_creadas := v_creadas + v_insertadas;

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
