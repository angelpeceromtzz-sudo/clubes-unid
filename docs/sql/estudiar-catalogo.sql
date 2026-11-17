-- Consultas de estudio del catalogo de clubes y actividades.
-- Requieren una base de pruebas con backend/schema.sql ya aplicado.
-- Ejecutar el archivo completo; respeta el esquema seleccionado en la conexion.
-- No crea ejemplos, no aplica migraciones y no modifica datos.

BEGIN TRANSACTION READ ONLY;

-- 1. Confirmar el esquema de consulta y el modo de solo lectura.
SELECT current_schema() AS esquema,
       current_setting('transaction_read_only') AS solo_lectura;

-- 2. Reconocer tablas fisicas y vistas. Los respaldos anteriores son opcionales.
SELECT c.relname AS objeto,
       CASE c.relkind
         WHEN 'r' THEN 'tabla'
         WHEN 'p' THEN 'tabla particionada'
         WHEN 'v' THEN 'vista'
         ELSE c.relkind::text
       END AS clase
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = current_schema()
  AND c.relname IN (
    'clubes', 'catalogo_recursos', 'clubes_operativos', 'clubes_con_estado',
    'actividades', 'actividades_catalogo_anterior', 'actividades_ediciones',
    'actividad_clubes', 'reacciones_catalogo', 'migraciones_catalogo',
    'actividades_registros', 'actividades_aportes_catalogo',
    'actividades_aportaciones', 'actividades_reacciones',
    'actividades_historial', 'actividades_legado_clubes',
    'catalogo_equivalencias_actividades', 'publicaciones_oferta',
    'publicaciones_imagenes', 'actividades_fotos', 'clubes_reacciones'
  )
ORDER BY clase, objeto;

-- 3. Ver la clasificacion y publicacion del catalogo compartido.
SELECT id_club, nombre_club, tipo, plantilla, estado_publicacion,
       estado_propuesta, mostrar_en_oferta, slug
FROM clubes
ORDER BY tipo, id_club
LIMIT 50;

-- 4. Comprobar que la vista adapta nombres y conserva los mismos IDs.
SELECT id_club, id_actividad, nombre, tipo, estado
FROM catalogo_recursos
ORDER BY id_club
LIMIT 50;

-- 5. Seguir la relacion de cada actividad con sus ediciones y sus tres periodos.
-- LEFT JOIN tambien muestra las actividades que todavia no tienen ediciones.
SELECT c.id_club, c.nombre_club AS actividad,
       e.id_edicion, e.nombre AS edicion, e.estado,
       e.fecha_inicio, e.fecha_fin,
       e.inscripcion_desde, e.inscripcion_hasta, e.inscripciones_habilitadas,
       e.destacable, e.destacada_desde, e.destacada_hasta
FROM clubes AS c
LEFT JOIN actividades_ediciones AS e ON e.id_actividad = c.id_club
WHERE c.tipo = 'actividad'
ORDER BY c.id_club, e.id_edicion
LIMIT 50;

-- 6. Leer las preguntas configuradas dentro del arreglo JSONB.
SELECT e.id_edicion, e.nombre AS edicion,
       campo ->> 'clave' AS clave,
       campo ->> 'etiqueta' AS pregunta,
       campo ->> 'tipo' AS tipo_respuesta,
       campo ->> 'obligatorio' AS obligatorio,
       campo -> 'opciones' AS opciones
FROM actividades_ediciones AS e
CROSS JOIN LATERAL jsonb_array_elements(e.campos_registro) AS preguntas(campo)
ORDER BY e.id_edicion, campo ->> 'clave'
LIMIT 50;

-- 7. Contar registros sin confundirlos con membresias o asistencias fisicas.
SELECT e.id_edicion, e.nombre,
       COUNT(r.id_registro) FILTER (WHERE r.estado = 'confirmado') AS confirmados,
       COUNT(r.id_registro) FILTER (WHERE r.estado = 'cancelado') AS cancelados,
       COUNT(r.id_registro) FILTER (WHERE r.estado = 'pendiente_completar') AS pendientes
FROM actividades_ediciones AS e
LEFT JOIN actividades_registros AS r ON r.id_edicion = e.id_edicion
GROUP BY e.id_edicion, e.nombre
ORDER BY e.id_edicion
LIMIT 50;

-- 8. Comparar el formulario actual con la copia conservada en un registro.
SELECT r.id_registro, r.id_usuario, r.estado,
       r.respuestas, r.formulario_snapshot,
       e.campos_registro AS formulario_actual
FROM actividades_registros AS r
JOIN actividades_ediciones AS e ON e.id_edicion = r.id_edicion
ORDER BY r.id_registro
LIMIT 20;

-- 9. Distinguir el minimo del compromiso y el minimo actual del catalogo.
-- Pueden diferir cuando el catalogo se actualizo despues del registro.
SELECT a.id_aportacion, a.id_registro, r.id_edicion,
       a.nombre AS nombre_comprometido,
       a.unidad AS unidad_comprometida, a.cantidad,
       a.cantidad_minima AS minimo_del_compromiso,
       o.cantidad_minima AS minimo_del_catalogo,
       a.estado, a.recibida_en
FROM actividades_aportaciones AS a
JOIN actividades_registros AS r ON r.id_registro = a.id_registro
JOIN actividades_aportes_catalogo AS o ON o.id_opcion = a.id_opcion
ORDER BY a.id_aportacion
LIMIT 50;

-- 10. Ver una descripcion por publicacion y el numero de imagenes que agrupa.
SELECT p.id_publicacion, c.tipo, c.nombre_club,
       p.id_edicion, p.contenido,
       COUNT(i.id_foto) AS fotos_totales,
       COUNT(i.id_foto) FILTER (WHERE i.estado = 'publicada') AS fotos_publicadas
FROM publicaciones_oferta AS p
JOIN clubes AS c ON c.id_club = p.id_club
LEFT JOIN publicaciones_imagenes AS i ON i.id_publicacion = p.id_publicacion
GROUP BY p.id_publicacion, c.tipo, c.nombre_club,
         p.id_edicion, p.contenido
ORDER BY p.id_publicacion
LIMIT 50;

-- 11. Comparar valores vigentes con una propuesta de cambios en el catalogo.
SELECT id_club, nombre_club AS nombre_vigente,
       propuesta ->> 'nombre' AS nombre_propuesto,
       descripcion AS descripcion_vigente,
       propuesta ->> 'descripcion' AS descripcion_propuesta,
       estado_publicacion, estado_propuesta, motivo_rechazo
FROM clubes
WHERE propuesta IS NOT NULL
ORDER BY id_club
LIMIT 20;

-- 12. Inspeccionar PK, FK, restricciones CHECK y restricciones UNIQUE.
-- Los indices unicos creados por separado se ven en la consulta siguiente.
SELECT t.relname AS tabla, k.conname AS restriccion,
       pg_get_constraintdef(k.oid) AS definicion
FROM pg_constraint AS k
JOIN pg_class AS t ON t.oid = k.conrelid
JOIN pg_namespace AS n ON n.oid = t.relnamespace
WHERE n.nspname = current_schema()
  AND t.relname IN (
    'clubes', 'actividades_ediciones', 'actividades_registros',
    'actividades_aportes_catalogo', 'actividades_aportaciones',
    'publicaciones_oferta', 'publicaciones_imagenes',
    'actividad_clubes', 'reacciones_catalogo', 'migraciones_catalogo'
  )
ORDER BY tabla, restriccion;

-- 13. Reconocer los indices parciales de responsables, reacciones y migraciones.
SELECT tablename AS tabla, indexname AS indice, indexdef AS definicion
FROM pg_indexes
WHERE schemaname = current_schema()
  AND tablename IN (
    'clubes', 'actividades_ediciones', 'actividades_registros',
    'actividades_aportes_catalogo', 'actividades_aportaciones',
    'publicaciones_oferta', 'publicaciones_imagenes',
    'actividad_clubes', 'reacciones_catalogo', 'migraciones_catalogo'
  )
ORDER BY tabla, indice;

-- 14. Ubicar los triggers de tipos, destinos y vistas compatibles de solo lectura.
SELECT t.relname AS tabla, g.tgname AS trigger,
       pg_get_triggerdef(g.oid) AS definicion
FROM pg_trigger AS g
JOIN pg_class AS t ON t.oid = g.tgrelid
JOIN pg_namespace AS n ON n.oid = t.relnamespace
WHERE n.nspname = current_schema()
  AND NOT g.tgisinternal
  AND (g.tgname LIKE 'trg_catalogo_%'
       OR g.tgname IN ('trg_publicacion_destino', 'trg_actividades_compat_lectura',
                       'trg_reaccion_destino', 'trg_migracion_catalogo_destino',
                       'trg_compat_catalogo_lectura'))
ORDER BY tabla, trigger;

-- 15. Distinguir equivalencias de IDs y traslados de participantes.
-- Cero filas es un resultado esperado en una instalacion nueva.
SELECT m.id_migracion, m.tipo, m.id_actividad_anterior,
       m.id_club_origen, m.id_club_destino, c.nombre_club AS destino,
       m.id_edicion_destino, m.datos_originales, m.resumen, m.migrado_en
FROM migraciones_catalogo AS m
JOIN clubes AS c ON c.id_club = m.id_club_destino
ORDER BY m.id_migracion;

-- 16. Reacciones comunes: club sin edicion; actividad con su edicion.
SELECT r.id_reaccion, c.tipo, c.nombre_club, r.id_edicion,
       e.nombre AS edicion, r.id_usuario, r.reaccion
FROM reacciones_catalogo AS r
JOIN clubes AS c ON c.id_club = r.id_club
LEFT JOIN actividades_ediciones AS e ON e.id_edicion = r.id_edicion
ORDER BY r.id_reaccion
LIMIT 50;

-- 17. Bitacora existente reutilizada para ambos tipos.
-- Un actor o destino historico puede estar vacio; LEFT JOIN conserva el evento.
SELECT a.id_evento, a.fecha_creacion, a.origen, a.tipo_evento,
       c.tipo AS tipo_recurso, c.nombre_club, a.id_edicion,
       e.nombre AS edicion, u.nombre_completo AS actor,
       a.descripcion, a.detalles, a.id_historial_actividad_anterior
FROM actividad_clubes AS a
LEFT JOIN clubes AS c ON c.id_club = a.id_club
LEFT JOIN actividades_ediciones AS e ON e.id_edicion = a.id_edicion
LEFT JOIN usuarios AS u ON u.id_usuario = a.id_actor
ORDER BY a.fecha_creacion DESC, a.id_evento DESC
LIMIT 50;

ROLLBACK;
