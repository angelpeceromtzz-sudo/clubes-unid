-- ============================================================
-- SEED — CLUBS UNID
-- ============================================================
-- Datos iniciales: catálogos, usuarios demo, clubes demo.
-- Asume que schema.sql ya fue ejecutado.
--
-- Contraseña de todos los usuarios demo: 123456
-- Hash generados con bcryptjs (cost 10).
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

-- ============================================================
-- 2. USUARIOS DE PRUEBA
-- ============================================================
-- Contraseña: 123456 (todos)
-- Hash: bcryptjs con cost 10

INSERT INTO usuarios (nombre_completo, correo_institucional, password_hash, id_rol) VALUES
  ('Luis Miguel Hernández Pérez',  'alumno.libre@unid.mx',    '$2a$10$CtbaqnLet396yUp7Kn2QAOh55dakt4v9WJzprP9GfyeWKfNZUuM6.', 1),
  ('María Fernanda López García',  'alumno.inscrito@unid.mx', '$2a$10$CtbaqnLet396yUp7Kn2QAOh55dakt4v9WJzprP9GfyeWKfNZUuM6.', 1),
  ('Carlos Alberto Méndez Rivas',  'presidente@unid.mx',      '$2a$10$CtbaqnLet396yUp7Kn2QAOh55dakt4v9WJzprP9GfyeWKfNZUuM6.', 2),
  ('Ana Sofía Ramírez Domínguez', 'admin@unid.mx',            '$2a$10$CtbaqnLet396yUp7Kn2QAOh55dakt4v9WJzprP9GfyeWKfNZUuM6.', 3),
  ('Roberto Carlos Mendoza Lopez', 'rectoria@unid.mx',        '$2a$10$CtbaqnLet396yUp7Kn2QAOh55dakt4v9WJzprP9GfyeWKfNZUuM6.', 4)
ON CONFLICT (correo_institucional) DO NOTHING;

-- ============================================================
-- 3. CLUBES DE PRUEBA (10 clubes)
-- ============================================================

INSERT INTO clubes (nombre_club, descripcion, categoria, cupo_maximo, imagen_portada, id_estatus_club, participacion) VALUES
  ('Equipo de Voleibol',                     'Entrenamientos tácticos, fundamentos de voleo, remate y preparación para torneos interuniversitarios.',                         'Deportes',   40, 'https://images.unsplash.com/photo-1553005746-9245ba190489?q=80&w=1170&auto=format&fit=crop', 1, 'mixta'),
  ('Taller de Dibujo y Pintura Analítica',   'Desarrollo de técnicas artísticas básicas y avanzadas: uso de carboncillo, óleo, acuarela y composición visual.',             'Cultura',    20, 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=600&auto=format&fit=crop', 1, 'mixta'),
  ('Brigada de Apoyo Comunitario',           'Voluntariado social dedicado al desarrollo de proyectos de impacto, colectas y servicio a sectores vulnerables.',               'Cultura',    40, 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?q=80&w=1170&auto=format&fit=crop', 1, 'mixta'),
  ('Equipo de Basketball',                   'Prácticas de tiro, jugadas pizarrón, interescuadras semanales y desarrollo de salto vertical y físico.',                       'Deportes',   30, 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=600&auto=format&fit=crop', 1, 'masculina'),
  ('Equipo de Esports y Gaming Competitivo', 'Torneo de videojuegos competitivos en modalidades de estrategia, acción y deportes.',                                          'Tecnología', 25, 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop', 2, 'mixta'),
  ('Taller de Música y Ensamble Acústico',   'Clases prácticas de guitarra, canto e instrumentos rítmicos. Ideal para principiantes y músicos intermedios.',                 'Cultura',    20, 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=600&auto=format&fit=crop', 1, 'mixta'),
  ('Equipo de Atletismo',                    'Entrenamientos de resistencia, velocidad y técnica de carrera. Participación en competencias locales y nacionales.',            'Deportes',   30, 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=600&auto=format&fit=crop', 1, 'mixta'),
  ('Club de Boxeo',                          'Sesiones de entrenamiento de boxeo, técnicas de defensa personal, acondicionamiento físico y preparación para competencias.',   'Deportes',   20, 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?q=80&w=600&auto=format&fit=crop', 1, 'masculina'),
  ('Club de Literatura y Escritura Creativa','Espacio para amantes de la literatura, donde se realizan lecturas, análisis de obras y talleres de escritura creativa.',       'Cultura',    20, 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=600&auto=format&fit=crop', 3, 'mixta'),
  ('Equipo de Porristas',                    'Entrenamientos de coreografías, acrobacias y técnicas de animación para eventos deportivos y competencias de porristas.',       'Deportes',   50, 'https://images.unsplash.com/photo-1589748239338-afe695e833d7?q=80&w=1026&auto=format&fit=crop', 1, 'femenina')
ON CONFLICT DO NOTHING;

-- Niveles aceptados por club
INSERT INTO clubes_niveles (id_club, id_nivel) VALUES
  (1, 1), (1, 2), (1, 3),
  (2, 1), (2, 2),
  (3, 1), (3, 2), (3, 3),
  (4, 2), (4, 3),
  (5, 1), (5, 2), (5, 3),
  (6, 1), (6, 2),
  (7, 1), (7, 2), (7, 3),
  (8, 2), (8, 3),
  (9, 1), (9, 2), (9, 3),
  (10, 1), (10, 2)
ON CONFLICT DO NOTHING;

-- Asignar presidente al club de Basketball (id_club = 4)
UPDATE clubes SET id_presidente = (
    SELECT id_usuario FROM usuarios WHERE correo_institucional = 'presidente@unid.mx'
) WHERE id_club = 4 AND id_presidente IS NULL;

-- ============================================================
-- 4. INSCRIPCIONES DE PRUEBA
-- ============================================================

INSERT INTO inscripciones (id_usuario, id_club, id_estatus_inscripcion) VALUES
  ((SELECT id_usuario FROM usuarios WHERE correo_institucional = 'alumno.inscrito@unid.mx'), 4, 1),
  ((SELECT id_usuario FROM usuarios WHERE correo_institucional = 'presidente@unid.mx'),      4, 1)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. AVISOS DE PRUEBA
-- ============================================================

INSERT INTO avisos_clubes (id_club, id_autor, titulo, contenido) VALUES
  (4,
   (SELECT id_usuario FROM usuarios WHERE correo_institucional = 'presidente@unid.mx'),
   'Horario especial esta semana',
   'Recuerden que este sábado el entrenamiento será a las 10:00 AM por mantenimiento del gimnasio. ¡No falten!'),
  (4,
   (SELECT id_usuario FROM usuarios WHERE correo_institucional = 'presidente@unid.mx'),
   'Confirmación para torneo',
    'Necesito que todos confirmen su asistencia al torneo del próximo mes a más tardar el viernes. Pasen conmigo a firmar la hoja de inscripción.')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. FORMULARIOS DE PRUEBA PARA VOLEIBOL
-- ============================================================
-- Nota: El presidente de Voleibol se asigna desde la BD o panel admin.
-- 5 alumnos de prueba para Voleibol (contraseña: 123456)
INSERT INTO usuarios (nombre_completo, correo_institucional, password_hash, id_rol) VALUES
  ('Sofía Martínez López',        'alumno.voleibol1@unid.mx', '$2a$10$CtbaqnLet396yUp7Kn2QAOh55dakt4v9WJzprP9GfyeWKfNZUuM6.', 1),
  ('Andrés García Hernández',     'alumno.voleibol2@unid.mx', '$2a$10$CtbaqnLet396yUp7Kn2QAOh55dakt4v9WJzprP9GfyeWKfNZUuM6.', 1),
  ('Valentina Rodríguez Cruz',    'alumno.voleibol3@unid.mx', '$2a$10$CtbaqnLet396yUp7Kn2QAOh55dakt4v9WJzprP9GfyeWKfNZUuM6.', 1),
  ('Emiliano Torres Medina',      'alumno.voleibol4@unid.mx', '$2a$10$CtbaqnLet396yUp7Kn2QAOh55dakt4v9WJzprP9GfyeWKfNZUuM6.', 1),
  ('Ximena Flores Castillo',      'alumno.voleibol5@unid.mx', '$2a$10$CtbaqnLet396yUp7Kn2QAOh55dakt4v9WJzprP9GfyeWKfNZUuM6.', 1)
ON CONFLICT (correo_institucional) DO NOTHING;

-- Formularios de prueba para Voleibol (todos "En revisión")
INSERT INTO formularios (id_alumno, id_club, nombre_completo, matricula, carrera, cuatrimestre, telefono_contacto, motivo_ingreso, experiencia_previa, status)
SELECT u.id_usuario, 1, u.nombre_completo, m.matricula, m.carrera, m.cuatrimestre, m.telefono, m.motivo, m.experiencia, 'En revisión'
FROM (
  VALUES
    ('alumno.voleibol1@unid.mx', 'UNID-2026-001', 'Lic. en Administración de Empresas', 3, '555-100-0001', 'Quiero desarrollar habilidades de trabajo en equipo y representar a la universidad en torneos.', 'Jugué voleibol en preparatoria durante 2 años'),
    ('alumno.voleibol2@unid.mx', 'UNID-2026-002', 'Ing. en Sistemas Computacionales',   2, '555-100-0002', 'Me apasiona el voleibol y quiero mantenerme activo mientras estudio.', 'Entrené por mi cuenta, nunca en equipo formal'),
    ('alumno.voleibol3@unid.mx', 'UNID-2026-003', 'Lic. en Contaduría Pública',          4, '555-100-0003', 'Busco formar parte de un equipo competitivo y hacer amigos con intereses similares.', 'Formé parte del equipo de mi secundaria'),
    ('alumno.voleibol4@unid.mx', 'UNID-2026-004', 'Ing. en Mecatrónica',                  5, '555-100-0004', 'Quiero salir de la rutina académica y contribuir al equipo de voleibol de la UNID.', 'Ninguna experiencia previa, pero muchas ganas'),
    ('alumno.voleibol5@unid.mx', 'UNID-2026-005', 'Lic. en Diseño Gráfico',               3, '555-100-0005', 'Me gustaría representar a la universidad en competencias y crecer como jugadora.', 'Jugué en el equipo estatal juvenil durante 3 años')
) AS m(correo, matricula, carrera, cuatrimestre, telefono, motivo, experiencia)
JOIN usuarios u ON u.correo_institucional = m.correo
WHERE NOT EXISTS (
  SELECT 1 FROM formularios f WHERE f.id_alumno = u.id_usuario AND f.id_club = 1
);

-- Actualizar contador de postulaciones del club Voleibol
UPDATE clubes SET postulaciones_actuales = (
  SELECT COUNT(*) FROM formularios WHERE id_club = 1 AND status NOT IN ('Rechazado', 'Miembro oficial')
) WHERE id_club = 1;
