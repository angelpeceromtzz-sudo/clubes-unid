-- ============================================================
-- SEED — CLUBS UNID
-- ============================================================
-- Datos iniciales: catálogos, usuarios demo, clubes demo.
-- Asume que schema.sql ya fue ejecutado.
--
-- Idempotente: se puede volver a ejecutar tantas veces como haga
-- falta; todo lo que ya exista se omite.
--
-- Ningún INSERT usa IDs fijos: clubes, usuarios, roles, estatus y
-- licenciaturas se resuelven por nombre/correo, porque en una base
-- local las secuencias no arrancan en 1 (borrar filas sin resetear
-- la secuencia deja los IDs corridos y cualquier ID literal falla).
--
-- Contraseña de todos los usuarios demo: 123456
-- Hash generado con bcryptjs (cost 10).
-- ============================================================

-- ============================================================
-- 1. CATÁLOGOS
-- ============================================================

INSERT INTO cat_roles (nombre_rol) VALUES
    ('alumno'),
    ('presidente'),
    ('admin'),
    ('rectoria')
ON CONFLICT DO NOTHING;

INSERT INTO cat_estatus_clubes (nombre_estatus) VALUES
    ('activo'),
    ('proximamente'),
    ('inactivo')
ON CONFLICT DO NOTHING;

INSERT INTO cat_estatus_inscripciones (nombre_estatus) VALUES
    ('activo'),
    ('baja')
ON CONFLICT DO NOTHING;

INSERT INTO cat_estatus_postulacion (nombre, orden, es_final) VALUES
    ('En revisión', 1, FALSE),
    ('Preseleccionado', 2, FALSE),
    ('Convocado', 3, FALSE),
    ('Oferta enviada', 4, FALSE),
    ('Miembro oficial', 5, TRUE),
    ('Rechazado', 6, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO cat_niveles (nombre_nivel) VALUES
    ('principiante'),
    ('intermedio'),
    ('avanzado')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. USUARIOS DE PRUEBA
-- ============================================================
-- Contraseña: 123456 (todos)
-- Hash: bcryptjs con cost 10

-- Los usuarios se guardan con WHERE NOT EXISTS y no con ON CONFLICT:
-- con ON CONFLICT el nextval se ejecuta igual aunque la fila se omita,
-- así que un re-run consume IDs y deja huecos en la secuencia.
INSERT INTO usuarios (nombre_completo, correo_institucional, password_hash, id_rol)
SELECT v.nombre_completo, v.correo, '$2a$10$MSw0tpLhjgT8ZXXAiI/b9OhZK/rpKHkO6Sdf/VlSA6PHE9Qt52zVi', r.id_rol
FROM (VALUES
  ('Luis Miguel Hernández Pérez',   'alumno.libre@unid.mx',    'alumno'),
  ('María Fernanda López García',   'alumno.inscrito@unid.mx', 'alumno'),
  ('Carlos Alberto Méndez Rivas',   'presidente@unid.mx',      'presidente'),
  ('Ana Sofía Ramírez Domínguez',   'admin@unid.mx',           'admin'),
  ('Roberto Carlos Mendoza Lopez',  'rectoria@unid.mx',        'rectoria')
) AS v(nombre_completo, correo, rol)
JOIN cat_roles r ON r.nombre_rol = v.rol
LEFT JOIN usuarios x ON x.correo_institucional = v.correo
WHERE x.id_usuario IS NULL;

-- ============================================================
-- 3. CLUBES DE PRUEBA (10 clubes)
-- ============================================================
-- El estatus se resuelve por nombre, no por ID.

INSERT INTO clubes (nombre_club, descripcion, categoria, cupo_maximo, imagen_portada, id_estatus_club, participacion)
SELECT v.nombre_club, v.descripcion, v.categoria, v.cupo_maximo, v.imagen_portada, e.id_estatus_club, v.participacion
FROM (VALUES
  ('Equipo de Voleibol',                     'Entrenamientos tácticos, fundamentos de voleo, remate y preparación para torneos interuniversitarios.',      'Deportes',   40, 'https://images.unsplash.com/photo-1553005746-9245ba190489?q=80&w=1170&auto=format&fit=crop', 'activo',     'mixta'),
  ('Taller de Dibujo y Pintura Analítica',   'Desarrollo de técnicas artísticas básicas y avanzadas: uso de carboncillo, óleo, acuarela y composición visual.', 'Cultura',    20, 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=600&auto=format&fit=crop', 'activo',     'mixta'),
  ('Brigada de Apoyo Comunitario',           'Voluntariado social dedicado al desarrollo de proyectos de impacto, colectas y servicio a sectores vulnerables.', 'Cultura',    40, 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?q=80&w=1170&auto=format&fit=crop', 'activo',     'mixta'),
  ('Equipo de Basketball',                   'Prácticas de tiro, jugadas pizarrón, interescuadras semanales y desarrollo de salto vertical y físico.',        'Deportes',   30, 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=600&auto=format&fit=crop', 'activo',     'masculina'),
  ('Equipo de Esports y Gaming Competitivo', 'Torneo de videojuegos competitivos en modalidades de estrategia, acción y deportes.',                           'Tecnología', 25, 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop', 'proximamente','mixta'),
  ('Taller de Música y Ensamble Acústico',   'Clases prácticas de guitarra, canto e instrumentos rítmicos. Ideal para principiantes y músicos intermedios.',    'Cultura',    20, 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=600&auto=format&fit=crop', 'activo',     'mixta'),
  ('Equipo de Atletismo',                    'Entrenamientos de resistencia, velocidad y técnica de carrera. Participación en competencias locales y nacionales.', 'Deportes', 30, 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=600&auto=format&fit=crop', 'activo',     'mixta'),
  ('Club de Boxeo',                          'Sesiones de entrenamiento de boxeo, técnicas de defensa personal, acondicionamiento físico y preparación para competencias.', 'Deportes', 20, 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?q=80&w=600&auto=format&fit=crop', 'activo', 'masculina'),
  ('Club de Literatura y Escritura Creativa','Espacio para amantes de la literatura, donde se realizan lecturas, análisis de obras y talleres de escritura creativa.', 'Cultura', 20, 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=600&auto=format&fit=crop', 'inactivo', 'mixta'),
  ('Equipo de Porristas',                    'Entrenamientos de coreografías, acrobacias y técnicas de animación para eventos deportivos y competencias de porristas.', 'Deportes', 50, 'https://images.unsplash.com/photo-1589748239338-afe695e833d7?q=80&w=1026&auto=format&fit=crop', 'activo', 'femenina')
) AS v(nombre_club, descripcion, categoria, cupo_maximo, imagen_portada, estatus, participacion)
JOIN cat_estatus_clubes e ON e.nombre_estatus = v.estatus
LEFT JOIN clubes c ON c.nombre_club = v.nombre_club
WHERE c.id_club IS NULL;

-- Niveles aceptados por club (club y nivel por nombre)
INSERT INTO clubes_niveles (id_club, id_nivel)
SELECT c.id_club, n.id_nivel
FROM (VALUES
  ('Equipo de Voleibol', 'principiante'), ('Equipo de Voleibol', 'intermedio'), ('Equipo de Voleibol', 'avanzado'),
  ('Taller de Dibujo y Pintura Analítica', 'principiante'), ('Taller de Dibujo y Pintura Analítica', 'intermedio'),
  ('Brigada de Apoyo Comunitario', 'principiante'), ('Brigada de Apoyo Comunitario', 'intermedio'), ('Brigada de Apoyo Comunitario', 'avanzado'),
  ('Equipo de Basketball', 'intermedio'), ('Equipo de Basketball', 'avanzado'),
  ('Equipo de Esports y Gaming Competitivo', 'principiante'), ('Equipo de Esports y Gaming Competitivo', 'intermedio'), ('Equipo de Esports y Gaming Competitivo', 'avanzado'),
  ('Taller de Música y Ensamble Acústico', 'principiante'), ('Taller de Música y Ensamble Acústico', 'intermedio'),
  ('Equipo de Atletismo', 'principiante'), ('Equipo de Atletismo', 'intermedio'), ('Equipo de Atletismo', 'avanzado'),
  ('Club de Boxeo', 'intermedio'), ('Club de Boxeo', 'avanzado'),
  ('Club de Literatura y Escritura Creativa', 'principiante'), ('Club de Literatura y Escritura Creativa', 'intermedio'), ('Club de Literatura y Escritura Creativa', 'avanzado'),
  ('Equipo de Porristas', 'principiante'), ('Equipo de Porristas', 'intermedio')
) AS v(club, nivel)
JOIN clubes c ON c.nombre_club = v.club
JOIN cat_niveles n ON n.nombre_nivel = v.nivel
ON CONFLICT DO NOTHING;

-- Asignar presidente al club de Basketball
UPDATE clubes cl
SET id_presidente = u.id_usuario
FROM usuarios u
WHERE cl.nombre_club = 'Equipo de Basketball'
  AND u.correo_institucional = 'presidente@unid.mx'
  AND cl.id_presidente IS NULL;

-- ============================================================
-- 4. INSCRIPCIONES DE PRUEBA
-- ============================================================

INSERT INTO inscripciones (id_usuario, id_club, id_estatus_inscripcion)
SELECT u.id_usuario, c.id_club, e.id_estatus_inscripcion
FROM (VALUES
  ('alumno.inscrito@unid.mx', 'Equipo de Basketball'),
  ('presidente@unid.mx',      'Equipo de Basketball')
) AS v(correo, club)
JOIN usuarios u ON u.correo_institucional = v.correo
JOIN clubes c ON c.nombre_club = v.club
JOIN cat_estatus_inscripciones e ON e.nombre_estatus = 'activo'
WHERE NOT EXISTS (
  SELECT 1 FROM inscripciones i
  WHERE i.id_usuario = u.id_usuario AND i.id_club = c.id_club
);

-- ============================================================
-- 5. AVISOS DE PRUEBA
-- ============================================================

INSERT INTO avisos_clubes (id_club, id_autor, titulo, contenido)
SELECT c.id_club, u.id_usuario, v.titulo, v.contenido
FROM (VALUES
  ('Horario especial esta semana',
   'Recuerden que este sábado el entrenamiento será a las 10:00 AM por mantenimiento del gimnasio. ¡No falten!'),
  ('Confirmación para torneo',
   'Necesito que todos confirmen su asistencia al torneo del próximo mes a más tardar el viernes. Pasen conmigo a firmar la hoja de inscripción.')
) AS v(titulo, contenido)
JOIN clubes c ON c.nombre_club = 'Equipo de Basketball'
JOIN usuarios u ON u.correo_institucional = 'presidente@unid.mx'
WHERE NOT EXISTS (
  SELECT 1 FROM avisos_clubes a
  WHERE a.id_club = c.id_club AND a.titulo = v.titulo
);

-- ============================================================
-- 6. FORMULARIOS DE PRUEBA PARA VOLEIBOL
-- ============================================================
-- Nota: El presidente de Voleibol se asigna desde la BD o panel admin.
-- 5 alumnos de prueba para Voleibol (contraseña: 123456)
INSERT INTO usuarios (nombre_completo, correo_institucional, password_hash, id_rol)
SELECT v.nombre_completo, v.correo, '$2a$10$MSw0tpLhjgT8ZXXAiI/b9OhZK/rpKHkO6Sdf/VlSA6PHE9Qt52zVi', r.id_rol
FROM (VALUES
  ('Sofía Martínez López',     'alumno.voleibol1@unid.mx'),
  ('Andrés García Hernández',  'alumno.voleibol2@unid.mx'),
  ('Valentina Rodríguez Cruz', 'alumno.voleibol3@unid.mx'),
  ('Emiliano Torres Medina',   'alumno.voleibol4@unid.mx'),
  ('Ximena Flores Castillo',   'alumno.voleibol5@unid.mx')
) AS v(nombre_completo, correo)
JOIN cat_roles r ON r.nombre_rol = 'alumno'
LEFT JOIN usuarios x ON x.correo_institucional = v.correo
WHERE x.id_usuario IS NULL;

-- Formularios de prueba para Voleibol (todos "En revisión")
-- 'carrera' ya no existe: formularios.id_licenciatura es FK a
-- cat_licenciaturas, así que las licenciaturas se listan con el nombre
-- exacto del catálogo. ('Ing. en Mecatrónica' no está en el catálogo;
-- se usa la ingeniería más cercana para el dato de prueba.)
INSERT INTO formularios
  (id_alumno, id_club, nombre_completo, matricula, id_licenciatura,
   cuatrimestre, telefono_contacto, motivo_ingreso, experiencia_previa, status)
SELECT u.id_usuario, cl.id_club, u.nombre_completo, m.matricula, l.id_licenciatura,
       m.cuatrimestre, m.telefono, m.motivo, m.experiencia, 'En revisión'
FROM (VALUES
  ('alumno.voleibol1@unid.mx', 'UNID-2026-001', 'Licenciatura en Administración Empresarial',                        3, '555-100-0001', 'Quiero desarrollar habilidades de trabajo en equipo y representar a la universidad en torneos.', 'Jugué voleibol en preparatoria durante 2 años'),
  ('alumno.voleibol2@unid.mx', 'UNID-2026-002', 'Licenciatura en Ingeniería de Software y Sistemas Computacionales',  2, '555-100-0002', 'Me apasiona el voleibol y quiero mantenerme activo mientras estudio.', 'Entrené por mi cuenta, nunca en equipo formal'),
  ('alumno.voleibol3@unid.mx', 'UNID-2026-003', 'Licenciatura en Contabilidad y Finanzas',                            4, '555-100-0003', 'Busco formar parte de un equipo competitivo y hacer amigos con intereses similares.', 'Formé parte del equipo de mi secundaria'),
  ('alumno.voleibol4@unid.mx', 'UNID-2026-004', 'Licenciatura en Ingeniería de Software y Sistemas Computacionales',  5, '555-100-0004', 'Quiero salir de la rutina académica y contribuir al equipo de voleibol de la UNID.', 'Ninguna experiencia previa, pero muchas ganas'),
  ('alumno.voleibol5@unid.mx', 'UNID-2026-005', 'Licenciatura en Diseño Gráfico Digital',                            3, '555-100-0005', 'Me gustaría representar a la universidad en competencias y crecer como jugadora.', 'Jugué en el equipo estatal juvenil durante 3 años')
) AS m(correo, matricula, licenciatura, cuatrimestre, telefono, motivo, experiencia)
JOIN usuarios u ON u.correo_institucional = m.correo
JOIN clubes cl ON cl.nombre_club = 'Equipo de Voleibol'
JOIN cat_licenciaturas l ON l.nombre = m.licenciatura
WHERE NOT EXISTS (
  SELECT 1 FROM formularios f WHERE f.id_alumno = u.id_usuario AND f.id_club = cl.id_club
);

-- Actualizar contador de postulaciones del club Voleibol
UPDATE clubes
SET postulaciones_actuales = (
  SELECT COUNT(*) FROM formularios f
  WHERE f.id_club = clubes.id_club
    AND f.status NOT IN ('Rechazado', 'Miembro oficial')
)
WHERE nombre_club = 'Equipo de Voleibol';

-- ============================================================
-- 7. ENCUESTAS (PBI-10)
-- ============================================================
-- Una encuesta publicada con los 5 tipos de la entrega 1, para probar el
-- formulario público sin tener que armar uno a mano. El slug es FIJO a
-- proposito: los datos de prueba necesitan un enlace estable y legible
-- ('demo-intereses-clubes'), y chk_encuesta_slug lo acepta (>= 16 chars).
--
-- Las respuestas NO se siembran a proposito: son anonimas, asi que un set de
-- respuestas de ejemplo no tendria a quien pertenecer y las graficas del panel
-- se verian igual de reales que las de verdad. Para ver resultados, responde
-- la encuesta desde el navegador unas cuantas veces.

INSERT INTO encuestas (slug, titulo, descripcion, mensaje_agradecimiento, estado, id_creador)
SELECT 'demo-intereses-clubes',
       'Intereses para clubes',
       'Ayudanos a saber que buscas en un club. Son 2 minutos y tus respuestas son anonimas: no se guardan tu nombre ni tu matricula. Solo tu licenciatura, para poder comparar resultados entre programas.',
       'Gracias por-tu tiempo.',
       'publicada',
       u.id_usuario
FROM usuarios u
WHERE u.correo_institucional = 'admin@unid.mx'
  AND NOT EXISTS (SELECT 1 FROM encuestas e WHERE e.slug = 'demo-intereses-clubes');

-- La encuesta se localiza por el slug y no por id, porque el id depende del
-- orden en que se creo la base. Las preguntas se llenan con el.
-- Las 4 preguntas. Los campos de escala (min, max y sus dos etiquetas) van en
-- el mismo INSERT y no en un UPDATE posterior: chk_pregunta_escala exige que
-- una fila tipo 'escala' ya tenga min y max, asi que insertarla sin ellos
-- aborta el seed entero.
--
-- Ninguna pide el nombre del alumno: la encuesta es anonima y preguntar el
-- nombre la contradiria. Antes esta pregunta existia oculta con es_visible=FALSE
-- y se elimino junto con esa columna.
WITH e AS (
  SELECT id_encuesta FROM encuestas WHERE slug = 'demo-intereses-clubes'
)
INSERT INTO preguntas (id_encuesta, texto, ayuda, tipo, es_obligatoria, orden,
                       escala_min, escala_max, escala_min_texto, escala_max_texto)
SELECT e.id_encuesta, v.texto, v.ayuda, v.tipo, v.obl, v.orden,
       v.emin, v.emax, v.emin_txt, v.emax_txt
FROM e
CROSS JOIN (VALUES
  ('Que areas te interesan mas',      'Marca todas las que apliquen.',           'opcion_multiple', TRUE,  1, NULL::int, NULL::int, NULL, NULL),
  ('Como prefieres participar',       NULL,                                       'opcion_unica',   TRUE,  2, NULL::int, NULL::int, NULL, NULL),
  ('Cuantas veces por semana',        'Una sesion de club se considera ~2 horas.', 'escala',        TRUE,  3, 0,          5,          'Nunca', 'Todos los dias'),
  ('Por que quieres entrar',         'Unas lineas bastan.',                      'texto_largo',    FALSE, 4, NULL::int, NULL::int, NULL, NULL)
) AS v(texto, ayuda, tipo, obl, orden, emin, emax, emin_txt, emax_txt)
WHERE NOT EXISTS (
  SELECT 1 FROM preguntas p WHERE p.id_encuesta = e.id_encuesta AND p.texto = v.texto
);

-- Opciones de las dos preguntas de opcion. Se localizan por el `orden` de la
-- pregunta, no por id, porque el id depende del orden en que se creo la base.
WITH o AS (
  SELECT p.id_pregunta, p.orden
  FROM preguntas p
  JOIN encuestas e ON e.id_encuesta = p.id_encuesta
  WHERE e.slug = 'demo-intereses-clubes'
    AND p.tipo IN ('opcion_unica', 'opcion_multiple')
)
INSERT INTO opciones_pregunta (id_pregunta, texto, orden)
SELECT o.id_pregunta, v.texto, v.pos
FROM o
CROSS JOIN (VALUES
  (1, 1, 'Deportes'),
  (1, 2, 'Tecnologia'),
  (1, 3, 'Arte y diseno'),
  (1, 4, 'Servicio social'),
  (1, 5, 'Emprendimiento'),
  (2, 1, 'Presencial en campus'),
  (2, 2, 'Virtual o hibrido'),
  (2, 3, 'No me importa')
) AS v(orden_pregunta, pos, texto)
WHERE o.orden = v.orden_pregunta
  AND NOT EXISTS (
    SELECT 1 FROM opciones_pregunta x WHERE x.id_pregunta = o.id_pregunta AND x.orden = v.pos
  );

-- ============================================================
-- 8. SINCRONIZAR SECUENCIAS
-- ============================================================
-- Dos motivos:
--   a) schema.sql carga los catálogos con IDs fijos (1..5), lo que no
--      avanza las secuencias: sin este paso, el próximo INSERT
--      intentaría reusar el ID 1 y fallaría por llave duplicada.
--   b) Si la base tuvo filas borradas sin resetear las secuencias, los
--      IDs siguen corridos (p. ej. los clubes del seed terminan en
--      11..20). Se reajustan al MAX para que los próximos registros
--      arranquen en el siguiente ID real.

SELECT setval(pg_get_serial_sequence('cat_roles', 'id_rol'),
              COALESCE((SELECT MAX(id_rol) FROM cat_roles), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('cat_estatus_clubes', 'id_estatus_club'),
              COALESCE((SELECT MAX(id_estatus_club) FROM cat_estatus_clubes), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('cat_estatus_inscripciones', 'id_estatus_inscripcion'),
              COALESCE((SELECT MAX(id_estatus_inscripcion) FROM cat_estatus_inscripciones), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('cat_estatus_postulacion', 'id_estatus'),
              COALESCE((SELECT MAX(id_estatus) FROM cat_estatus_postulacion), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('cat_niveles', 'id_nivel'),
              COALESCE((SELECT MAX(id_nivel) FROM cat_niveles), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('cat_licenciaturas', 'id_licenciatura'),
              COALESCE((SELECT MAX(id_licenciatura) FROM cat_licenciaturas), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('usuarios', 'id_usuario'),
              COALESCE((SELECT MAX(id_usuario) FROM usuarios), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('clubes', 'id_club'),
              COALESCE((SELECT MAX(id_club) FROM clubes), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('inscripciones', 'id_inscripcion'),
              COALESCE((SELECT MAX(id_inscripcion) FROM inscripciones), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('avisos_clubes', 'id_aviso'),
              COALESCE((SELECT MAX(id_aviso) FROM avisos_clubes), 0) + 1, false);
SELECT setval(pg_get_serial_sequence('formularios', 'id_formulario'),
              COALESCE((SELECT MAX(id_formulario) FROM formularios), 0) + 1, false);
