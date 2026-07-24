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

INSERT INTO clubes (nombre_club, descripcion, categoria, cupo_maximo, imagen_portada, id_estatus_club) VALUES
  ('Equipo de Voleibol',                     'Entrenamientos tácticos, fundamentos de voleo, remate y preparación para torneos interuniversitarios.',                         'Deportes',   40, 'https://images.unsplash.com/photo-1553005746-9245ba190489?q=80&w=1170&auto=format&fit=crop', 1),
  ('Taller de Dibujo y Pintura Analítica',   'Desarrollo de técnicas artísticas básicas y avanzadas: uso de carboncillo, óleo, acuarela y composición visual.',             'Cultura',    20, 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=600&auto=format&fit=crop', 1),
  ('Brigada de Apoyo Comunitario',           'Voluntariado social dedicado al desarrollo de proyectos de impacto, colectas y servicio a sectores vulnerables.',               'Cultura',    40, 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?q=80&w=1170&auto=format&fit=crop', 1),
  ('Equipo de Basketball',                   'Prácticas de tiro, jugadas pizarrón, interescuadras semanales y desarrollo de salto vertical y físico.',                       'Deportes',   30, 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=600&auto=format&fit=crop', 1),
  ('Equipo de Esports y Gaming Competitivo', 'Torneo de videojuegos competitivos en modalidades de estrategia, acción y deportes.',                                          'Tecnología', 25, 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop', 2),
  ('Taller de Música y Ensamble Acústico',   'Clases prácticas de guitarra, canto e instrumentos rítmicos. Ideal para principiantes y músicos intermedios.',                 'Cultura',    20, 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=600&auto=format&fit=crop', 1),
  ('Equipo de Atletismo',                    'Entrenamientos de resistencia, velocidad y técnica de carrera. Participación en competencias locales y nacionales.',            'Deportes',   30, 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=600&auto=format&fit=crop', 1),
  ('Club de Boxeo',                          'Sesiones de entrenamiento de boxeo, técnicas de defensa personal, acondicionamiento físico y preparación para competencias.',   'Deportes',   20, 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?q=80&w=600&auto=format&fit=crop', 1),
  ('Club de Literatura y Escritura Creativa','Espacio para amantes de la literatura, donde se realizan lecturas, análisis de obras y talleres de escritura creativa.',       'Cultura',    20, 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=600&auto=format&fit=crop', 3),
  ('Equipo de Porristas',                    'Entrenamientos de coreografías, acrobacias y técnicas de animación para eventos deportivos y competencias de porristas.',       'Deportes',   50, 'https://images.unsplash.com/photo-1589748239338-afe695e833d7?q=80&w=1026&auto=format&fit=crop', 1)
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
