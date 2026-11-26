-- Auditoría de solo lectura previa a reconciliar el ledger de develop.
-- No muestra respuestas, identidades, correos ni valores de negocio.
-- Ejecutar solo en clubsunid-develop. No crea el ledger ni aplica migraciones.
WITH tablas_respuesta AS (
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'tabla', t.tablename,
      'filas', (
        (xpath('/table/row/n/text()', query_to_xml(
          format('SELECT count(*) AS n FROM %I.%I', t.schemaname, t.tablename),
          true, false, ''
        )))[1]::text::bigint
      )
    ) ORDER BY t.tablename
  ), '[]'::jsonb) AS conteos
  FROM pg_tables t
  WHERE t.schemaname = 'public'
    AND t.tablename ~* '(encuest|respuest|formulario)'
), migraciones AS (
  SELECT jsonb_build_object(
    '01_encuestas_privacidad', jsonb_build_object(
      'tipo_privacidad', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='encuestas' AND column_name='tipo_privacidad'),
      'id_usuario_respuesta', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='respuestas_encuesta' AND column_name='id_usuario'),
      'indice_unico_respuesta_usuario', to_regclass('public.uq_respuesta_encuesta_usuario') IS NOT NULL
    ),
    '02_integridad_correos_postulaciones', jsonb_build_object(
      'indice_correo', to_regclass('public.uq_usuarios_correo_normalizado') IS NOT NULL,
      'indice_postulacion', to_regclass('public.uq_formulario_alumno_club_ciclo') IS NOT NULL
    ),
    '03_catalogo_estatus', jsonb_build_object(
      'fk_status', EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.formularios') AND conname='fk_formulario_estatus'),
      'check_duplicado_presente', EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.formularios') AND conname='chk_status')
    ),
    '04_bitacoras_preservadas', jsonb_build_object(
      'fk_admin_set_null', EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.historial_admin') AND conname='fk_historial_admin' AND confdeltype='n'),
      'fk_postulacion_restrict', EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.historial_postulacion') AND conname='fk_historial_formulario' AND confdeltype='r')
    ),
    '05_periodos_sin_traslape', jsonb_build_object(
      'check_fechas', EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.periodos_actividad') AND conname='chk_periodos_fechas'),
      'exclusion_traslape', EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.periodos_actividad') AND conname='ex_periodos_actividad_sin_traslape')
    ),
    '06_catalogo_tipo_datos', jsonb_build_object(
      'check_presente', EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.clubes') AND conname='chk_catalogo_datos_club'),
      'regla_completa', EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.clubes') AND conname='chk_catalogo_datos_club' AND pg_get_constraintdef(oid) ILIKE '%cupo_maximo IS NULL%' AND pg_get_constraintdef(oid) ILIKE '%participacion IS NULL%')
    ),
    '07_ciclo_mismo_club', jsonb_build_object(
      'fk_club_ciclo', EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.clubes') AND conname='fk_club_ciclo_actual_mismo_club' AND pg_get_constraintdef(oid) ILIKE '%(id_convocatoria_inscripcion_actual, id_club)%'),
      'fk_formulario_ciclo', EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.formularios') AND conname='fk_formulario_ciclo_mismo_club' AND pg_get_constraintdef(oid) ILIKE '%(id_convocatoria_inscripcion, id_club)%')
    ),
    '08_respuestas_extra_normalizadas', jsonb_build_object(
      'tabla', to_regclass('public.formulario_respuestas_extra') IS NOT NULL,
      'rls', COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.formulario_respuestas_extra')), false),
      'fk_pregunta_club', EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.formulario_respuestas_extra') AND conname='fk_respuesta_extra_pregunta_club' AND pg_get_constraintdef(oid) ILIKE '%(id_pregunta, id_club)%'),
      'fk_formulario_club', EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.formulario_respuestas_extra') AND conname='fk_respuesta_extra_formulario_club' AND pg_get_constraintdef(oid) ILIKE '%(id_formulario, id_club)%')
    ),
    '09_snapshot_inmutable', EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass('public.formulario_respuestas_extra') AND tgname='trg_proteger_snapshot_respuesta_extra' AND NOT tgisinternal),
    '10_formulario_restrict', EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.formularios') AND conname='fk_formulario_club' AND confdeltype='r'),
    '11_detalle_misma_encuesta', jsonb_build_object(
      'columna_id_encuesta', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='detalle_respuestas' AND column_name='id_encuesta'),
      'fk_respuesta', EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.detalle_respuestas') AND conname='fk_detalle_respuesta' AND pg_get_constraintdef(oid) ILIKE '%(id_respuesta, id_encuesta)%'),
      'fk_pregunta', EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.detalle_respuestas') AND conname='fk_detalle_pregunta' AND pg_get_constraintdef(oid) ILIKE '%(id_pregunta, id_encuesta)%')
    ),
    '12_otro_reglas', jsonb_build_object(
      'columna_es_otro', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='opciones_pregunta' AND column_name='es_otro'),
      'columna_texto_otro', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='detalle_respuestas' AND column_name='texto_otro'),
      'indice_unico', to_regclass('public.uq_opcion_otro') IS NOT NULL
    ),
    '13_tipos_formularios_club', jsonb_build_object(
      'check_pregunta', EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.club_formulario_preguntas') AND conname='chk_club_formulario_tipo'),
      'check_snapshot', EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.formulario_respuestas_extra') AND conname='chk_formulario_respuesta_tipo_snapshot')
    ),
    '14_perfil', jsonb_build_object(
      'columna_biografia', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='usuarios' AND column_name='biografia'),
      'check_biografia', EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.usuarios') AND conname='chk_usuarios_biografia'),
      'check_telefono', EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.usuarios') AND conname='chk_usuarios_telefono_perfil')
    ),
    '15_sesiones_vigencia', CASE WHEN to_regprocedure('public.generar_sesiones_periodo_club(integer,integer)') IS NULL THEN false ELSE
      position('vigencia_inicio' IN pg_get_functiondef(to_regprocedure('public.generar_sesiones_periodo_club(integer,integer)'))) > 0
      AND position('vigencia_fin' IN pg_get_functiondef(to_regprocedure('public.generar_sesiones_periodo_club(integer,integer)'))) > 0 END,
    '16_comentarios_dominio', jsonb_build_object(
      'tablas_con_comentario', (SELECT count(*) FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind IN ('r','v') AND c.relname=ANY(ARRAY['clubes','convocatorias','solicitudes_convocatoria','convocatorias_inscripcion','formularios','club_formulario_preguntas','formulario_respuestas_extra','encuestas','preguntas','respuestas_encuesta','detalle_respuestas','noticias']) AND obj_description(c.oid) IS NOT NULL),
      'columnas_con_comentario', (SELECT count(*) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid WHERE c.relnamespace='public'::regnamespace AND ((c.relname='clubes' AND a.attname='tipo') OR (c.relname='encuestas' AND a.attname='tipo_privacidad') OR (c.relname='respuestas_encuesta' AND a.attname='id_usuario')) AND NOT a.attisdropped AND col_description(c.oid,a.attnum) IS NOT NULL)
    ),
    '17_privacidad_encuestas', jsonb_build_object(
      'trigger_respuesta', EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass('public.respuestas_encuesta') AND tgname='trg_validar_privacidad_respuesta_encuesta' AND NOT tgisinternal),
      'trigger_encuesta', EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass('public.encuestas') AND tgname='trg_bloquear_cambio_privacidad_encuesta' AND NOT tgisinternal)
    ),
    '18_indice_formularios', to_regclass('public.idx_formularios_club_fecha') IS NOT NULL,
    '19_indices_consultas', jsonb_build_object(
      'vicepresidente', to_regclass('public.idx_clubes_vicepresidente') IS NOT NULL,
      'estatus_club', to_regclass('public.idx_clubes_estatus_publicacion') IS NOT NULL,
      'chat_notificaciones', to_regclass('public.idx_chat_notificaciones_mensaje_destinatario') IS NOT NULL
    ),
    '20_indice_presencia_retirado', to_regclass('public.idx_club_chat_presencia_actividad') IS NULL,
    '21_noticias_jsonb', jsonb_build_object(
      'tipo_jsonb', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='noticias' AND column_name='contenido' AND data_type='jsonb'),
      'check_documento', EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.noticias') AND conname='chk_noticia_contenido_documento')
    ),
    '22_reconocimientos', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='expediente_reconocimientos' AND column_name='oculta'),
    '23_respuestas_encuesta_restrict', jsonb_build_object(
      'cantidad_fk', (SELECT count(*) FROM pg_constraint c WHERE c.conrelid=to_regclass('public.respuestas_encuesta') AND c.confrelid=to_regclass('public.encuestas') AND c.contype='f' AND c.conkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid=to_regclass('public.respuestas_encuesta') AND attname='id_encuesta' AND NOT attisdropped)]::smallint[] AND c.confkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid=to_regclass('public.encuestas') AND attname='id_encuesta' AND NOT attisdropped)]::smallint[]),
      'restrictiva_validada', EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conrelid=to_regclass('public.respuestas_encuesta') AND c.confrelid=to_regclass('public.encuestas') AND c.contype='f' AND c.conkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid=to_regclass('public.respuestas_encuesta') AND attname='id_encuesta' AND NOT attisdropped)]::smallint[] AND c.confkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid=to_regclass('public.encuestas') AND attname='id_encuesta' AND NOT attisdropped)]::smallint[] AND c.confdeltype='r' AND c.confupdtype='a' AND c.convalidated AND NOT c.condeferrable)
    ),
    '24_configuracion_ciclo_unica', jsonb_build_object(
      'columnas_legadas_retiradas', NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name IN ('fecha_apertura_programada','fecha_limite_cierre','max_postulaciones','postulaciones_actuales','cerrada_manualmente')),
      'cierre_manual_en_ciclo', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='convocatorias_inscripcion' AND column_name='cerrada_manualmente'),
      'vista_estado', to_regclass('public.clubes_con_estado') IS NOT NULL,
      'vista_operativa', to_regclass('public.clubes_operativos') IS NOT NULL
    ),
    '25_catalogo_sin_defaults', jsonb_build_object(
      'cupo_sin_default', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name='cupo_maximo' AND column_default IS NULL),
      'participacion_sin_default', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name='participacion' AND column_default IS NULL)
    ),
    '26_estatus_solo_clubes', EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid=to_regclass('public.clubes') AND conname='chk_catalogo_datos_club'
        AND pg_get_constraintdef(oid) ILIKE '%id_estatus_club IS NULL%'
    ),
    '27_estatus_sin_default', EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='clubes'
        AND column_name='id_estatus_club' AND column_default IS NULL
    ),
    '28_otro_validado', EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid=to_regclass('public.detalle_respuestas')
        AND conname='chk_detalle_texto_otro' AND convalidated
    ),
    '29_indice_formularios_convocatoria', to_regclass('public.idx_formularios_convocatoria') IS NOT NULL,
    '30_formulario_convocatoria_mismo_club', jsonb_build_object(
      'indice_compuesto', to_regclass('public.uq_convocatoria_id_club') IS NOT NULL,
      'fk_validada', EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid=to_regclass('public.formularios')
          AND conname='fk_formulario_convocatoria_club'
          AND convalidated
          AND pg_get_constraintdef(oid) ILIKE '%FOREIGN KEY (id_convocatoria, id_club)%'
          AND pg_get_constraintdef(oid) ILIKE '%ON DELETE SET NULL (id_convocatoria)%'
      )
    )
  ) AS estado
), precondiciones AS (
  SELECT jsonb_build_object(
    'correos_duplicados_normalizados', CASE WHEN to_regclass('public.usuarios') IS NOT NULL THEN
      (xpath('/table/row/n/text()', query_to_xml($q$SELECT count(*) AS n FROM (SELECT 1 FROM usuarios GROUP BY lower(btrim(correo_institucional)) HAVING count(*)>1) d$q$, true, false, '')))[1]::text::bigint ELSE NULL END,
    'estados_postulacion_sin_catalogo', CASE WHEN to_regclass('public.formularios') IS NOT NULL AND to_regclass('public.cat_estatus_postulacion') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='formularios' AND column_name='status') THEN
      (xpath('/table/row/n/text()', query_to_xml($q$SELECT count(*) AS n FROM formularios f LEFT JOIN cat_estatus_postulacion c ON c.nombre=f.status WHERE c.id_estatus IS NULL$q$, true, false, '')))[1]::text::bigint ELSE NULL END,
    'postulaciones_duplicadas', CASE WHEN to_regclass('public.formularios') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='formularios' AND column_name='id_convocatoria_inscripcion') THEN
      (xpath('/table/row/n/text()', query_to_xml($q$SELECT count(*) AS n FROM (SELECT 1 FROM formularios WHERE id_convocatoria_inscripcion IS NOT NULL GROUP BY id_alumno,id_club,id_convocatoria_inscripcion HAVING count(*)>1) d$q$, true, false, '')))[1]::text::bigint ELSE NULL END,
    'clubes_tipo_datos_invalidos', CASE WHEN to_regclass('public.clubes') IS NOT NULL AND (SELECT count(*)=3 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name IN ('tipo','cupo_maximo','participacion')) THEN
      (xpath('/table/row/n/text()', query_to_xml($q$SELECT count(*) AS n FROM clubes WHERE ((tipo='club' AND cupo_maximo IS NOT NULL AND cupo_maximo IN (10,15,20,25,30,40,50) AND participacion IS NOT NULL) OR (tipo='actividad' AND cupo_maximo IS NULL AND participacion IS NULL)) IS NOT TRUE$q$, true, false, '')))[1]::text::bigint ELSE NULL END,
    'bitacoras_admin_huerfanas', CASE WHEN to_regclass('public.historial_admin') IS NOT NULL AND to_regclass('public.usuarios') IS NOT NULL THEN
      (xpath('/table/row/n/text()', query_to_xml($q$SELECT count(*) AS n FROM historial_admin h LEFT JOIN usuarios u ON u.id_usuario=h.id_admin WHERE h.id_admin IS NOT NULL AND u.id_usuario IS NULL$q$, true, false, '')))[1]::text::bigint ELSE NULL END,
    'bitacoras_postulacion_huerfanas', CASE WHEN to_regclass('public.historial_postulacion') IS NOT NULL AND to_regclass('public.formularios') IS NOT NULL THEN
      (xpath('/table/row/n/text()', query_to_xml($q$SELECT count(*) AS n FROM historial_postulacion h LEFT JOIN formularios f ON f.id_formulario=h.id_formulario WHERE f.id_formulario IS NULL$q$, true, false, '')))[1]::text::bigint ELSE NULL END,
    'periodos_invalidos_o_traslapados', CASE WHEN to_regclass('public.periodos_actividad') IS NOT NULL THEN
      (xpath('/table/row/n/text()', query_to_xml($q$SELECT (SELECT count(*) FROM periodos_actividad WHERE fecha_fin<fecha_inicio)+(SELECT count(*) FROM periodos_actividad a JOIN periodos_actividad b ON a.id_periodo<b.id_periodo AND daterange(a.fecha_inicio,a.fecha_fin,'[]') && daterange(b.fecha_inicio,b.fecha_fin,'[]')) AS n$q$, true, false, '')))[1]::text::bigint ELSE NULL END,
    'ciclos_club_formulario_inconsistentes', CASE WHEN to_regclass('public.convocatorias_inscripcion') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='formularios' AND column_name='id_convocatoria_inscripcion') THEN
      (xpath('/table/row/n/text()', query_to_xml($q$SELECT count(*) AS n FROM formularios f LEFT JOIN convocatorias_inscripcion c ON c.id_convocatoria_inscripcion=f.id_convocatoria_inscripcion AND c.id_club=f.id_club WHERE f.id_convocatoria_inscripcion IS NOT NULL AND c.id_convocatoria_inscripcion IS NULL$q$, true, false, '')))[1]::text::bigint ELSE NULL END,
    'ciclo_actual_club_inconsistente', CASE WHEN to_regclass('public.convocatorias_inscripcion') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name='id_convocatoria_inscripcion_actual') THEN
      (xpath('/table/row/n/text()', query_to_xml($q$SELECT count(*) AS n FROM clubes cl LEFT JOIN convocatorias_inscripcion ci ON ci.id_convocatoria_inscripcion=cl.id_convocatoria_inscripcion_actual AND ci.id_club=cl.id_club WHERE cl.id_convocatoria_inscripcion_actual IS NOT NULL AND ci.id_convocatoria_inscripcion IS NULL$q$, true, false, '')))[1]::text::bigint ELSE NULL END,
    'configuraciones_ciclo_distintas', CASE WHEN to_regclass('public.convocatorias_inscripcion') IS NOT NULL AND (SELECT count(*)=3 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name IN ('fecha_apertura_programada','fecha_limite_cierre','max_postulaciones')) AND (SELECT count(*)=3 FROM information_schema.columns WHERE table_schema='public' AND table_name='convocatorias_inscripcion' AND column_name IN ('fecha_apertura_programada','fecha_limite_cierre','max_postulaciones')) AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name='id_convocatoria_inscripcion_actual') THEN
      (xpath('/table/row/n/text()', query_to_xml($q$SELECT count(*) AS n FROM clubes cl JOIN convocatorias_inscripcion ci ON ci.id_convocatoria_inscripcion=cl.id_convocatoria_inscripcion_actual AND ci.id_club=cl.id_club WHERE cl.fecha_apertura_programada IS DISTINCT FROM ci.fecha_apertura_programada OR cl.fecha_limite_cierre IS DISTINCT FROM ci.fecha_limite_cierre OR cl.max_postulaciones IS DISTINCT FROM ci.max_postulaciones$q$, true, false, '')))[1]::text::bigint ELSE NULL END,
    'configuracion_ciclo_parcial', CASE WHEN (SELECT count(*) BETWEEN 1 AND 2 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name IN ('fecha_apertura_programada','fecha_limite_cierre','max_postulaciones')) THEN 1 ELSE 0 END,
    'clubes_configurados_sin_ciclo', CASE WHEN (SELECT count(*)=3 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name IN ('fecha_apertura_programada','fecha_limite_cierre','max_postulaciones')) AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name='id_convocatoria_inscripcion_actual') THEN
      (xpath('/table/row/n/text()', query_to_xml($q$SELECT count(*) AS n FROM clubes WHERE id_convocatoria_inscripcion_actual IS NULL AND (fecha_apertura_programada IS NOT NULL OR fecha_limite_cierre IS NOT NULL OR max_postulaciones IS NOT NULL)$q$, true, false, '')))[1]::text::bigint ELSE NULL END,
    'cierres_manuales_distintos', CASE WHEN (SELECT count(*)=1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name='cerrada_manualmente') AND (SELECT count(*)=1 FROM information_schema.columns WHERE table_schema='public' AND table_name='convocatorias_inscripcion' AND column_name='cerrada_manualmente') THEN
      (xpath('/table/row/n/text()', query_to_xml($q$SELECT count(*) AS n FROM clubes cl JOIN convocatorias_inscripcion ci ON ci.id_convocatoria_inscripcion=cl.id_convocatoria_inscripcion_actual AND ci.id_club=cl.id_club WHERE cl.cerrada_manualmente IS DISTINCT FROM ci.cerrada_manualmente$q$, true, false, '')))[1]::text::bigint ELSE NULL END,
    'cierre_manual_sin_ciclo', CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name='cerrada_manualmente') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name='id_convocatoria_inscripcion_actual') THEN
      (xpath('/table/row/n/text()', query_to_xml($q$SELECT count(*) AS n FROM clubes WHERE id_convocatoria_inscripcion_actual IS NULL AND cerrada_manualmente IS TRUE$q$, true, false, '')))[1]::text::bigint ELSE NULL END,
    'contador_postulaciones_distinto', CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name='postulaciones_actuales') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='formularios' AND column_name='id_convocatoria_inscripcion') THEN
      (xpath('/table/row/n/text()', query_to_xml($q$SELECT count(*) AS n FROM (SELECT cl.id_club FROM clubes cl LEFT JOIN convocatorias_inscripcion ci ON ci.id_convocatoria_inscripcion=cl.id_convocatoria_inscripcion_actual AND ci.id_club=cl.id_club LEFT JOIN formularios f ON f.id_convocatoria_inscripcion=ci.id_convocatoria_inscripcion AND f.id_club=cl.id_club GROUP BY cl.id_club,cl.postulaciones_actuales HAVING cl.postulaciones_actuales IS DISTINCT FROM count(f.id_formulario)::int) d$q$, true, false, '')))[1]::text::bigint ELSE NULL END,
    'formularios_sin_ciclo', CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='formularios' AND column_name='id_convocatoria_inscripcion') THEN
      (xpath('/table/row/n/text()', query_to_xml($q$SELECT count(*) AS n FROM formularios WHERE id_convocatoria_inscripcion IS NULL$q$, true, false, '')))[1]::text::bigint ELSE NULL END,
    'solicitudes_convocatoria_pendientes', CASE WHEN to_regclass('public.solicitudes_convocatoria') IS NOT NULL THEN
      (xpath('/table/row/n/text()', query_to_xml($q$SELECT count(*) AS n FROM solicitudes_convocatoria WHERE estado='pendiente'$q$, true, false, '')))[1]::text::bigint ELSE NULL END,
    'tipos_pregunta_configurable_invalidos', CASE WHEN to_regclass('public.club_formulario_preguntas') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='club_formulario_preguntas' AND column_name='tipo') THEN
      (xpath('/table/row/n/text()', query_to_xml($q$SELECT count(*) AS n FROM club_formulario_preguntas WHERE tipo IS NULL OR tipo NOT IN ('texto','textarea','numero','seleccion','fecha')$q$, true, false, '')))[1]::text::bigint ELSE NULL END,
    'tipos_snapshot_configurable_invalidos', CASE WHEN to_regclass('public.formulario_respuestas_extra') IS NOT NULL THEN
      (xpath('/table/row/n/text()', query_to_xml($q$SELECT count(*) AS n FROM formulario_respuestas_extra WHERE tipo_snapshot IS NULL OR tipo_snapshot NOT IN ('texto','textarea','numero','seleccion','fecha')$q$, true, false, '')))[1]::text::bigint ELSE 0 END,
    'perfiles_invalidos_para_restricciones', CASE WHEN to_regclass('public.usuarios') IS NOT NULL THEN
      (xpath('/table/row/n/text()', query_to_xml($q$
        SELECT count(*) AS n
        FROM (SELECT to_jsonb(u) AS j FROM usuarios u) perfil
        WHERE (j ? 'biografia' AND char_length(j->>'biografia') > 500)
           OR (j ? 'telefono_celular' AND j->>'telefono_celular' IS NOT NULL AND (
                 char_length(j->>'telefono_celular') > 20
                 OR (j->>'telefono_celular') !~ '^[+]?[0-9[:space:]().-]+$'
                 OR char_length(regexp_replace(j->>'telefono_celular', '[^0-9]', '', 'g')) NOT BETWEEN 7 AND 15
              ))
           OR ((j->>'fecha_nacimiento_publica') = 'true' AND nullif(j->>'fecha_nacimiento', '') IS NULL)
           OR ((j->>'telefono_publico') = 'true' AND nullif(j->>'telefono_celular', '') IS NULL)
           OR (j->>'facebook_url' IS NOT NULL AND lower(j->>'facebook_url') !~ '^https?://[^[:space:]]+$')
           OR (j->>'x_url' IS NOT NULL AND lower(j->>'x_url') !~ '^https?://[^[:space:]]+$')
           OR (j->>'instagram_url' IS NOT NULL AND lower(j->>'instagram_url') !~ '^https?://[^[:space:]]+$')
           OR (j->>'sitio_web_url' IS NOT NULL AND lower(j->>'sitio_web_url') !~ '^https?://[^[:space:]]+$')
      $q$, true, false, '')))[1]::text::bigint ELSE NULL END,
    'respuestas_encuesta', CASE WHEN to_regclass('public.respuestas_encuesta') IS NOT NULL THEN
      (xpath('/table/row/n/text()', query_to_xml('SELECT count(*) AS n FROM public.respuestas_encuesta', true, false, '')))[1]::text::bigint ELSE NULL END,
    'detalles_encuesta_huerfanos_o_cruzados', CASE
      WHEN to_regclass('public.detalle_respuestas') IS NULL THEN NULL
      WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='detalle_respuestas' AND column_name='id_encuesta') THEN
        (xpath('/table/row/n/text()', query_to_xml($q$SELECT count(*) AS n FROM detalle_respuestas d LEFT JOIN respuestas_encuesta r ON r.id_respuesta=d.id_respuesta LEFT JOIN preguntas p ON p.id_pregunta=d.id_pregunta WHERE r.id_respuesta IS NULL OR p.id_pregunta IS NULL OR r.id_encuesta<>p.id_encuesta OR (d.id_encuesta IS NOT NULL AND d.id_encuesta<>r.id_encuesta) OR p.tipo='licenciatura'$q$, true, false, '')))[1]::text::bigint
      ELSE
        (xpath('/table/row/n/text()', query_to_xml($q$SELECT count(*) AS n FROM detalle_respuestas d LEFT JOIN respuestas_encuesta r ON r.id_respuesta=d.id_respuesta LEFT JOIN preguntas p ON p.id_pregunta=d.id_pregunta WHERE r.id_respuesta IS NULL OR p.id_pregunta IS NULL OR r.id_encuesta<>p.id_encuesta OR p.tipo='licenciatura'$q$, true, false, '')))[1]::text::bigint
      END,
    'privacidad_respuestas_inconsistente', CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='encuestas' AND column_name='tipo_privacidad') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='respuestas_encuesta' AND column_name='id_usuario') THEN
      (xpath('/table/row/n/text()', query_to_xml($q$SELECT count(*) AS n FROM respuestas_encuesta r JOIN encuestas e USING(id_encuesta) WHERE (e.tipo_privacidad='publico_anonimo' AND r.id_usuario IS NOT NULL) OR (e.tipo_privacidad='institucional' AND r.id_usuario IS NULL)$q$, true, false, '')))[1]::text::bigint ELSE 0 END,
    'respuestas_encuesta_sin_encuesta', CASE WHEN to_regclass('public.respuestas_encuesta') IS NOT NULL AND to_regclass('public.encuestas') IS NOT NULL THEN
      (xpath('/table/row/n/text()', query_to_xml($q$SELECT count(*) AS n FROM respuestas_encuesta r LEFT JOIN encuestas e USING(id_encuesta) WHERE e.id_encuesta IS NULL$q$, true, false, '')))[1]::text::bigint ELSE NULL END,
    'opciones_otro_duplicadas', CASE WHEN to_regclass('public.opciones_pregunta') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='opciones_pregunta' AND column_name='es_otro') THEN
      (xpath('/table/row/n/text()', query_to_xml($q$SELECT count(*) AS n FROM (SELECT 1 FROM opciones_pregunta WHERE es_otro GROUP BY id_pregunta HAVING count(*)>1) d$q$, true, false, '')))[1]::text::bigint ELSE NULL END,
    'actividades_con_estatus_inesperado', CASE WHEN to_regclass('public.clubes') IS NOT NULL AND to_regclass('public.cat_estatus_clubes') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clubes' AND column_name='tipo') THEN
      (xpath('/table/row/n/text()', query_to_xml($q$SELECT count(*) AS n FROM clubes c LEFT JOIN cat_estatus_clubes e USING(id_estatus_club) WHERE c.tipo='actividad' AND c.id_estatus_club IS NOT NULL AND e.nombre_estatus IS DISTINCT FROM 'proximamente'$q$, true, false, '')))[1]::text::bigint ELSE NULL END,
    'respuestas_otro_mayores_70', CASE WHEN to_regclass('public.detalle_respuestas') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='detalle_respuestas' AND column_name='texto_otro') THEN
      (xpath('/table/row/n/text()', query_to_xml($q$SELECT count(*) AS n FROM detalle_respuestas WHERE texto_otro IS NOT NULL AND char_length(texto_otro)>70$q$, true, false, '')))[1]::text::bigint ELSE NULL END,
    'formularios_bloque_huerfano_o_de_otro_club', CASE WHEN to_regclass('public.formularios') IS NOT NULL AND to_regclass('public.convocatorias') IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='formularios' AND column_name='id_convocatoria') THEN
      (xpath('/table/row/n/text()', query_to_xml($q$SELECT count(*) AS n FROM formularios f LEFT JOIN convocatorias c ON c.id_convocatoria=f.id_convocatoria WHERE f.id_convocatoria IS NOT NULL AND (c.id_convocatoria IS NULL OR c.id_club IS DISTINCT FROM f.id_club)$q$, true, false, '')))[1]::text::bigint ELSE NULL END
  ) AS conteos
)
SELECT jsonb_build_object(
  'base', current_database(),
  'rol', current_user,
  'postgresql', current_setting('server_version'),
  'ledger_public', to_regclass('public.schema_migrations') IS NOT NULL,
  'ledger_supabase', to_regclass('supabase_migrations.schema_migrations') IS NOT NULL,
  'conteos_tablas_respuesta_formulario_encuesta', (SELECT conteos FROM tablas_respuesta),
  'estado_migraciones_managed', (SELECT estado FROM migraciones),
  'precondiciones_migracion_conteos', (SELECT conteos FROM precondiciones)
) AS auditoria;
