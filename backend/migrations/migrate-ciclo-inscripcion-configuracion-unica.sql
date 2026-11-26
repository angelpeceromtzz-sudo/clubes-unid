-- La configuración aprobada y el cierre manual pertenecen al ciclo vigente.
-- El conteo se calcula desde formularios y no se almacena en clubes.
-- Esta migración nunca cambia ni elimina filas de formularios o encuestas.

DO $$
DECLARE
    v_id_club integer;
    v_detalle text;
BEGIN
    IF to_regclass('clubes') IS NULL
       OR to_regclass('convocatorias_inscripcion') IS NULL
       OR to_regclass('formularios') IS NULL THEN
        RAISE EXCEPTION 'Migración detenida: faltan clubes, convocatorias_inscripcion o formularios';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'clubes'
          AND column_name = 'id_convocatoria_inscripcion_actual'
    ) THEN
        RAISE EXCEPTION 'Migración detenida: clubes no contiene id_convocatoria_inscripcion_actual';
    END IF;

    -- Evita que el backend cambie el ciclo o su configuración entre la
    -- comparación y el retiro de las columnas antiguas.
    LOCK TABLE clubes, convocatorias_inscripcion, formularios IN SHARE ROW EXCLUSIVE MODE;

    -- Una segunda ejecución ya no encontrará las columnas legadas. La primera
    -- exige que todo dato configurado tenga un ciclo actual inequívoco.
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'clubes'
          AND column_name IN ('fecha_apertura_programada','fecha_limite_cierre','max_postulaciones')
    ) THEN
        IF (
            SELECT count(*) FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'clubes'
              AND column_name IN ('fecha_apertura_programada','fecha_limite_cierre','max_postulaciones')
        ) <> 3 THEN
            RAISE EXCEPTION 'Migración detenida: clubes conserva una configuración de ciclo parcial; revise las columnas legadas antes de migrar.';
        END IF;

        SELECT cl.id_club,
               format('actual=%s; ciclo=%s',
                 jsonb_build_object('apertura', cl.fecha_apertura_programada,
                                    'cierre', cl.fecha_limite_cierre,
                                    'limite', cl.max_postulaciones),
                 jsonb_build_object('apertura', ci.fecha_apertura_programada,
                                    'cierre', ci.fecha_limite_cierre,
                                    'limite', ci.max_postulaciones))
          INTO v_id_club, v_detalle
        FROM clubes cl
        JOIN convocatorias_inscripcion ci
          ON ci.id_convocatoria_inscripcion = cl.id_convocatoria_inscripcion_actual
         AND ci.id_club = cl.id_club
        WHERE cl.fecha_apertura_programada IS DISTINCT FROM ci.fecha_apertura_programada
           OR cl.fecha_limite_cierre IS DISTINCT FROM ci.fecha_limite_cierre
           OR cl.max_postulaciones IS DISTINCT FROM ci.max_postulaciones
        ORDER BY cl.id_club
        LIMIT 1;

        IF v_id_club IS NOT NULL THEN
            RAISE EXCEPTION 'Migración detenida: configuración duplicada distinta para club % (%). Revise los valores antes de migrar.',
                v_id_club, v_detalle;
        END IF;

        SELECT cl.id_club
          INTO v_id_club
        FROM clubes cl
        WHERE cl.id_convocatoria_inscripcion_actual IS NULL
          AND (cl.fecha_apertura_programada IS NOT NULL
            OR cl.fecha_limite_cierre IS NOT NULL
            OR cl.max_postulaciones IS NOT NULL)
        ORDER BY cl.id_club
        LIMIT 1;

        IF v_id_club IS NOT NULL THEN
            RAISE EXCEPTION 'Migración detenida: club % conserva configuración sin un ciclo actual. Asigne el ciclo correcto antes de migrar.',
                v_id_club;
        END IF;

    END IF;

    -- También se comprueba si otra migración ya retiró las columnas legadas.
    SELECT cl.id_club
      INTO v_id_club
    FROM clubes cl
    LEFT JOIN convocatorias_inscripcion ci
      ON ci.id_convocatoria_inscripcion = cl.id_convocatoria_inscripcion_actual
     AND ci.id_club = cl.id_club
    WHERE cl.id_convocatoria_inscripcion_actual IS NOT NULL
      AND ci.id_convocatoria_inscripcion IS NULL
    ORDER BY cl.id_club
    LIMIT 1;

    IF v_id_club IS NOT NULL THEN
        RAISE EXCEPTION 'Migración detenida: el ciclo actual del club % no existe o pertenece a otro club.', v_id_club;
    END IF;

    -- Si ambas versiones del cierre ya existen, no se elige una por suposición.
    -- En esquemas antiguos la columna del ciclo todavía no existe y se copia la
    -- del club durante el backfill posterior.
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'clubes'
          AND column_name = 'cerrada_manualmente'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'convocatorias_inscripcion'
          AND column_name = 'cerrada_manualmente'
    ) THEN
        EXECUTE $sql$
            SELECT cl.id_club
            FROM clubes cl
            JOIN convocatorias_inscripcion ci
              ON ci.id_convocatoria_inscripcion = cl.id_convocatoria_inscripcion_actual
             AND ci.id_club = cl.id_club
            WHERE cl.cerrada_manualmente IS DISTINCT FROM ci.cerrada_manualmente
            ORDER BY cl.id_club
            LIMIT 1
        $sql$ INTO v_id_club;

        IF v_id_club IS NOT NULL THEN
            RAISE EXCEPTION 'Migración detenida: el cierre manual del club % no coincide con su ciclo actual. Revise los valores antes de migrar.', v_id_club;
        END IF;
    END IF;

    -- Elimina el contador solo cuando coincide con la fuente derivada que lo
    -- sustituye. Una diferencia puede revelar un desfase que debe revisarse.
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'clubes'
          AND column_name = 'postulaciones_actuales'
    ) THEN
        EXECUTE $sql$
            SELECT cl.id_club,
                   format('guardado=%s; calculado=%s', cl.postulaciones_actuales,
                          COUNT(f.id_formulario)::int)
            FROM clubes cl
            LEFT JOIN convocatorias_inscripcion ci
              ON ci.id_convocatoria_inscripcion = cl.id_convocatoria_inscripcion_actual
             AND ci.id_club = cl.id_club
            LEFT JOIN formularios f
              ON f.id_convocatoria_inscripcion = ci.id_convocatoria_inscripcion
             AND f.id_club = cl.id_club
            GROUP BY cl.id_club, cl.postulaciones_actuales
            HAVING cl.postulaciones_actuales IS DISTINCT FROM COUNT(f.id_formulario)::int
            ORDER BY cl.id_club
            LIMIT 1
        $sql$ INTO v_id_club, v_detalle;

        IF v_id_club IS NOT NULL THEN
            RAISE EXCEPTION 'Migración detenida: el contador del club % no coincide con sus formularios del ciclo actual (%). Revise el desfase antes de migrar.',
                v_id_club, v_detalle;
        END IF;
    END IF;

    -- Un cierre manual solo tiene sentido asociado a un ciclo vigente.
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'clubes'
          AND column_name = 'cerrada_manualmente'
    ) THEN
        EXECUTE $sql$
            SELECT id_club
            FROM clubes
            WHERE id_convocatoria_inscripcion_actual IS NULL
              AND cerrada_manualmente IS TRUE
            ORDER BY id_club
            LIMIT 1
        $sql$ INTO v_id_club;

        IF v_id_club IS NOT NULL THEN
            RAISE EXCEPTION 'Migración detenida: el club % está cerrado manualmente sin un ciclo actual. Revise el estado antes de migrar.', v_id_club;
        END IF;
    END IF;
END $$;

ALTER TABLE convocatorias_inscripcion
    ADD COLUMN IF NOT EXISTS cerrada_manualmente BOOLEAN NOT NULL DEFAULT FALSE;

-- Conserva el cierre manual vigente. Los ciclos históricos no tenían este
-- dato por separado, por lo que no se inventa un historial que no existe.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'clubes'
          AND column_name = 'cerrada_manualmente'
    ) THEN
        EXECUTE $sql$
            UPDATE convocatorias_inscripcion ci
               SET cerrada_manualmente = COALESCE(cl.cerrada_manualmente, FALSE)
              FROM clubes cl
             WHERE ci.id_convocatoria_inscripcion = cl.id_convocatoria_inscripcion_actual
               AND ci.id_club = cl.id_club
        $sql$;
    END IF;
END $$;

-- Los nombres de respuesta usados por la aplicación siguen disponibles en la
-- vista; ahora son derivados del ciclo y del conteo real de formularios.
DROP VIEW IF EXISTS clubes_con_estado;
DROP VIEW IF EXISTS clubes_operativos;

ALTER TABLE clubes DROP COLUMN IF EXISTS postulaciones_actuales;
ALTER TABLE clubes DROP COLUMN IF EXISTS max_postulaciones;
ALTER TABLE clubes DROP COLUMN IF EXISTS cerrada_manualmente;
ALTER TABLE clubes DROP COLUMN IF EXISTS fecha_apertura_programada;
ALTER TABLE clubes DROP COLUMN IF EXISTS fecha_limite_cierre;

CREATE VIEW clubes_operativos AS
SELECT * FROM clubes WHERE tipo = 'club' WITH LOCAL CHECK OPTION;

CREATE VIEW clubes_con_estado AS
SELECT
    cl.id_club,
    cl.nombre_club,
    cl.descripcion,
    cl.categoria,
    cl.participacion,
    cl.cupo_maximo,
    cl.lugar_actividades,
    cl.id_responsable_club,
    cl.id_vicepresidente,
    cl.imagen_portada,
    cl.id_estatus_club,
    cl.fecha_creacion,
    cl.horario,
    ci.max_postulaciones,
    COUNT(f.id_formulario)::int AS postulaciones_actuales,
    COALESCE(ci.cerrada_manualmente, FALSE) AS cerrada_manualmente,
    ci.fecha_apertura_programada,
    ci.fecha_limite_cierre,
    cl.version_horario,
    cl.id_convocatoria_inscripcion_actual,
    cl.tipo,
    cl.slug,
    cl.plantilla,
    cl.estado_publicacion,
    cl.mostrar_en_oferta,
    cl.id_autor,
    cl.propuesta,
    cl.estado_propuesta,
    cl.motivo_rechazo,
    cl.actualizado_en,
    COUNT(f.id_formulario)::int AS formularios_recibidos,
    CASE
      WHEN COALESCE(ci.cerrada_manualmente, FALSE) THEN 'cerrado'
      WHEN ci.fecha_apertura_programada IS NOT NULL AND NOW() < ci.fecha_apertura_programada THEN 'proximo'
      WHEN ci.max_postulaciones IS NOT NULL AND COUNT(f.id_formulario) >= ci.max_postulaciones THEN 'lleno'
      WHEN ci.fecha_limite_cierre IS NOT NULL AND NOW() > ci.fecha_limite_cierre THEN 'cerrado'
      WHEN ci.fecha_apertura_programada IS NULL THEN 'cerrado'
      ELSE 'abierto' END AS estado_calculado
FROM clubes cl
LEFT JOIN convocatorias_inscripcion ci
  ON ci.id_convocatoria_inscripcion = cl.id_convocatoria_inscripcion_actual
 AND ci.id_club = cl.id_club
LEFT JOIN formularios f
  ON f.id_convocatoria_inscripcion = ci.id_convocatoria_inscripcion
 AND f.id_club = cl.id_club
WHERE cl.tipo = 'club'
GROUP BY cl.id_club, ci.id_convocatoria_inscripcion;
