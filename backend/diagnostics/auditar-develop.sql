-- Diagnóstico estrictamente de lectura para el proyecto clubsunid-develop.
-- Devuelve metadatos del esquema, ledger y conteos agregados;
-- nunca muestra respuestas, identidades, correos ni credenciales.
WITH estado AS (
  SELECT
    to_regclass('public.schema_migrations') IS NOT NULL AS tiene_ledger,
    to_regclass('public.encuestas') IS NOT NULL AS tiene_encuestas,
    to_regclass('public.preguntas') IS NOT NULL AS tiene_preguntas,
    to_regclass('public.respuestas_encuesta') IS NOT NULL AS tiene_respuestas,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='encuestas' AND column_name='tipo_privacidad'
    ) AS tiene_privacidad,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='respuestas_encuesta' AND column_name='id_usuario'
    ) AS tiene_identidad,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='detalle_respuestas' AND column_name='id_encuesta'
    ) AS detalle_con_encuesta,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='expediente_reconocimientos' AND column_name='oculta'
    ) AS reconocimiento_con_visibilidad,
    EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='formulario_respuestas_extra' AND column_name='respuesta'
    ) AS respuestas_configurables_normalizadas,
    (SELECT data_type FROM information_schema.columns
      WHERE table_schema='public' AND table_name='noticias' AND column_name='contenido') AS tipo_contenido_noticia
)
SELECT jsonb_build_object(
    'base', current_database(),
    'rol', current_user,
    'postgresql', current_setting('server_version'),
    'tablas_public_count', (SELECT count(*) FROM pg_tables WHERE schemaname='public'),
    'tiene_ledger', tiene_ledger,
    'tiene_encuestas', tiene_encuestas,
    'tiene_respuestas', tiene_respuestas,
    'columna_privacidad', tiene_privacidad,
    'columna_id_usuario', tiene_identidad,
    'detalle_con_id_encuesta', detalle_con_encuesta,
    'respuestas_extra_normalizadas', respuestas_configurables_normalizadas,
    'respuestas_extra_con_rls', COALESCE((
      SELECT relrowsecurity FROM pg_class
      WHERE oid = to_regclass('public.formulario_respuestas_extra')
    ), false),
    'columna_visibilidad_reconocimiento', reconocimiento_con_visibilidad,
    'tipo_contenido_noticia', tipo_contenido_noticia,
    'noticias', (SELECT count(*) FROM public.noticias),
    'indice_formularios_club', to_regclass('public.idx_formularios_club_fecha') IS NOT NULL,
    'indice_vicepresidente', to_regclass('public.idx_clubes_vicepresidente') IS NOT NULL,
    'indice_estatus_club', to_regclass('public.idx_clubes_estatus_publicacion') IS NOT NULL,
    'indice_chat_notificaciones', to_regclass('public.idx_chat_notificaciones_mensaje_destinatario') IS NOT NULL,
    'indice_presencia_por_latido', to_regclass('public.idx_club_chat_presencia_actividad') IS NOT NULL,
    'modelo', jsonb_build_object(
      'check_privacidad_encuesta', EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = to_regclass('public.encuestas') AND conname = 'chk_encuesta_privacidad'
      ),
      'fk_detalle_respuesta_misma_encuesta', EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = to_regclass('public.detalle_respuestas')
          AND conname = 'fk_detalle_respuesta'
          AND pg_get_constraintdef(oid) ILIKE '%(id_respuesta, id_encuesta)%'
      ),
      'fk_detalle_pregunta_misma_encuesta', EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = to_regclass('public.detalle_respuestas')
          AND conname = 'fk_detalle_pregunta'
          AND pg_get_constraintdef(oid) ILIKE '%(id_pregunta, id_encuesta)%'
      ),
      'tabla_respuestas_formulario_normalizadas', to_regclass('public.formulario_respuestas_extra') IS NOT NULL,
      'trigger_privacidad_respuesta', EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgrelid = to_regclass('public.respuestas_encuesta')
          AND tgname = 'trg_validar_privacidad_respuesta_encuesta' AND NOT tgisinternal
      ),
      'trigger_bloqueo_cambio_privacidad', EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgrelid = to_regclass('public.encuestas')
          AND tgname = 'trg_bloquear_cambio_privacidad_encuesta' AND NOT tgisinternal
      ),
      'trigger_snapshot_formulario', EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgrelid = to_regclass('public.formulario_respuestas_extra')
          AND tgname = 'trg_proteger_snapshot_respuesta_extra' AND NOT tgisinternal
      )
    )
  ) AS estado,
  CASE WHEN tiene_ledger THEN
    query_to_xml(
      'SELECT count(*) AS total,
              count(DISTINCT to_jsonb(m)->>''checksum'') AS checksums_distintos,
              jsonb_agg(jsonb_build_object(
                ''nombre'', to_jsonb(m)->>''nombre'',
                ''orden'', to_jsonb(m)->>''orden''
              ) ORDER BY to_jsonb(m)->>''orden'', to_jsonb(m)->>''nombre'') AS migraciones
       FROM public.schema_migrations m',
      true, false, ''
    )
  END AS ledger,
  CASE WHEN tiene_encuestas AND tiene_respuestas AND tiene_privacidad AND tiene_identidad
    THEN query_to_xml(
      'SELECT e.tipo_privacidad,
              count(DISTINCT e.id_encuesta) AS encuestas,
              count(r.id_respuesta) AS respuestas,
              count(r.id_usuario) AS respuestas_con_identidad,
              count(*) FILTER (
                WHERE e.tipo_privacidad = ''publico_anonimo'' AND r.id_usuario IS NOT NULL
              ) AS anonimas_con_identidad
       FROM public.encuestas e
       LEFT JOIN public.respuestas_encuesta r USING (id_encuesta)
       GROUP BY e.tipo_privacidad
       ORDER BY e.tipo_privacidad',
      true, false, ''
    )
  END AS resumen_privacidad,
  CASE WHEN tiene_encuestas AND tiene_respuestas AND NOT (tiene_privacidad AND tiene_identidad)
    THEN query_to_xml(
      'SELECT count(DISTINCT e.id_encuesta) AS encuestas,
              count(r.id_respuesta) AS respuestas
       FROM public.encuestas e
       LEFT JOIN public.respuestas_encuesta r USING (id_encuesta)',
      true, false, ''
    )
  END AS resumen_encuestas_legacy,
  CASE WHEN to_regclass('public.formularios') IS NOT NULL AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='formularios' AND column_name='respuestas_extra'
    )
    THEN query_to_xml(
      'SELECT count(*) FILTER (WHERE respuestas_extra <> ''{}''::jsonb) AS formularios_con_respuesta_json,
              count(*) FILTER (WHERE jsonb_typeof(respuestas_extra) IS DISTINCT FROM ''object'') AS json_con_formato_no_objeto
       FROM public.formularios',
      true, false, ''
    )
  END AS resumen_formularios_configurables,
  CASE WHEN tiene_encuestas AND tiene_preguntas AND tiene_respuestas
         AND to_regclass('public.detalle_respuestas') IS NOT NULL
    THEN query_to_xml(
      'SELECT count(*) AS detalles,
              count(*) FILTER (WHERE r.id_respuesta IS NULL OR p.id_pregunta IS NULL
                                  OR r.id_encuesta <> p.id_encuesta) AS referencias_cruzadas_o_huerfanas
       FROM public.detalle_respuestas d
       LEFT JOIN public.respuestas_encuesta r ON r.id_respuesta = d.id_respuesta
       LEFT JOIN public.preguntas p ON p.id_pregunta = d.id_pregunta',
      true, false, ''
    )
  END AS resumen_integridad_detalles
FROM estado;
