-- ============================================================
-- SCRIPT COMPLETO DE INICIALIZACIÓN — CLUBS UNID
-- ============================================================
-- Crea tablas, catálogos, datos de prueba y usa bcrypt
-- para los password_hash.
--
-- Las contraseñas en texto plano son:
--   alumno.libre@unid.mx     / 123456
--   alumno.inscrito@unid.mx  / 123456
--   presidente@unid.mx       / 123456
--   admin@unid.mx            / 123456
-- ============================================================

-- ============================================================
-- TABLAS DE CATÁLOGO
-- ============================================================
CREATE TABLE IF NOT EXISTS cat_roles (
    id_rol SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(20) UNIQUE NOT NULL
);
INSERT INTO cat_roles (nombre_rol) VALUES ('alumno'), ('presidente'), ('admin')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS cat_estatus_clubes (
    id_estatus_club SERIAL PRIMARY KEY,
    nombre_estatus VARCHAR(20) UNIQUE NOT NULL
);
INSERT INTO cat_estatus_clubes (nombre_estatus) VALUES ('activo'), ('proximamente'), ('inactivo')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS cat_estatus_inscripciones (
    id_estatus_inscripcion SERIAL PRIMARY KEY,
    nombre_estatus VARCHAR(20) UNIQUE NOT NULL
);
INSERT INTO cat_estatus_inscripciones (nombre_estatus) VALUES ('activo'), ('baja')
ON CONFLICT DO NOTHING;

-- ============================================================
-- TABLAS PRINCIPALES
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    correo_institucional VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    id_rol INT NOT NULL DEFAULT 1,
    fecha_registro TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) REFERENCES cat_roles(id_rol) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS clubes (
    id_club SERIAL PRIMARY KEY,
    nombre_club VARCHAR(100) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(50),
    cupo_maximo INT NOT NULL CONSTRAINT chk_cupo_positivo CHECK (cupo_maximo > 0),
    id_presidente INT,
    imagen_portada VARCHAR(255),
    id_estatus_club INT NOT NULL DEFAULT 1,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_club_presidente FOREIGN KEY (id_presidente) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    CONSTRAINT fk_club_estatus FOREIGN KEY (id_estatus_club) REFERENCES cat_estatus_clubes(id_estatus_club) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS inscripciones (
    id_inscripcion SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_club INT NOT NULL,
    id_estatus_inscripcion INT NOT NULL DEFAULT 1,
    fecha_inscripcion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    fecha_baja TIMESTAMPTZ,
    CONSTRAINT fk_inscripcion_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_inscripcion_club FOREIGN KEY (id_club) REFERENCES clubes(id_club) ON DELETE CASCADE,
    CONSTRAINT fk_inscripcion_estatus FOREIGN KEY (id_estatus_inscripcion) REFERENCES cat_estatus_inscripciones(id_estatus_inscripcion) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_un_club_activo_por_alumno
    ON inscripciones (id_usuario) WHERE id_estatus_inscripcion = 1;

CREATE TABLE IF NOT EXISTS avisos_clubes (
    id_aviso SERIAL PRIMARY KEY,
    id_club INT NOT NULL,
    id_autor INT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    contenido TEXT NOT NULL,
    fecha_publicacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_aviso_club FOREIGN KEY (id_club) REFERENCES clubes(id_club) ON DELETE CASCADE,
    CONSTRAINT fk_aviso_autor FOREIGN KEY (id_autor) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

-- ============================================================
-- USUARIOS DE PRUEBA (contraseña: 123456)
-- Los hash se generan con bcryptjs. Para desarrollo, ejecute:
--   node -e "console.log(require('bcryptjs').hashSync('123456', 10))"
-- ============================================================
INSERT INTO usuarios (nombre_completo, correo_institucional, password_hash, id_rol) VALUES
  ('Luis Miguel Hernández Pérez',  'alumno.libre@unid.mx',    '$2a$10$CtbaqnLet396yUp7Kn2QAOh55dakt4v9WJzprP9GfyeWKfNZUuM6.', 1),
  ('María Fernanda López García',  'alumno.inscrito@unid.mx', '$2a$10$CtbaqnLet396yUp7Kn2QAOh55dakt4v9WJzprP9GfyeWKfNZUuM6.', 1),
  ('Carlos Alberto Méndez Rivas',  'presidente@unid.mx',      '$2a$10$CtbaqnLet396yUp7Kn2QAOh55dakt4v9WJzprP9GfyeWKfNZUuM6.', 2),
  ('Ana Sofía Ramírez Domínguez', 'admin@unid.mx',            '$2a$10$CtbaqnLet396yUp7Kn2QAOh55dakt4v9WJzprP9GfyeWKfNZUuM6.', 3)
ON CONFLICT (correo_institucional) DO NOTHING;

-- ============================================================
-- CLUBES DE PRUEBA (10 clubes)
-- ============================================================
INSERT INTO clubes (nombre_club, descripcion, categoria, cupo_maximo, id_presidente, imagen_portada, id_estatus_club) VALUES
  ('Equipo de Voleibol',                     'Entrenamientos tácticos, fundamentos de voleo, remate y preparación para torneos interuniversitarios.',                         'Deportes',   40, NULL, 'https://images.unsplash.com/photo-1553005746-9245ba190489?q=80&w=1170&auto=format&fit=crop', 1),
  ('Taller de Dibujo y Pintura Analítica',   'Desarrollo de técnicas artísticas básicas y avanzadas: uso de carboncillo, óleo, acuarela y composición visual.',             'Cultura',    20, NULL, 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=600&auto=format&fit=crop', 1),
  ('Brigada de Apoyo Comunitario',           'Voluntariado social dedicado al desarrollo de proyectos de impacto, colectas y servicio a sectores vulnerables.',               'Cultura',    40, NULL, 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?q=80&w=1170&auto=format&fit=crop', 1),
  ('Equipo de Basketball',                   'Prácticas de tiro, jugadas pizarrón, interescuadras semanales y desarrollo de salto vertical y físico.',                       'Deportes',   30, NULL, 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=600&auto=format&fit=crop', 1),
  ('Equipo de Esports y Gaming Competitivo', 'Torneo de videojuegos competitivos en modalidades de estrategia, acción y deportes.',                                          'Tecnología', 25, NULL, 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop', 2),
  ('Taller de Música y Ensamble Acústico',   'Clases prácticas de guitarra, canto e instrumentos rítmicos. Ideal para principiantes y músicos intermedios.',                 'Cultura',    20, NULL, 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=600&auto=format&fit=crop', 1),
  ('Equipo de Atletismo',                    'Entrenamientos de resistencia, velocidad y técnica de carrera. Participación en competencias locales y nacionales.',            'Deportes',   30, NULL, 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=600&auto=format&fit=crop', 1),
  ('Club de Boxeo',                          'Sesiones de entrenamiento de boxeo, técnicas de defensa personal, acondicionamiento físico y preparación para competencias.',   'Deportes',   20, NULL, 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?q=80&w=600&auto=format&fit=crop', 1),
  ('Club de Literatura y Escritura Creativa','Espacio para amantes de la literatura, donde se realizan lecturas, análisis de obras y talleres de escritura creativa.',       'Cultura',    20, NULL, 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=600&auto=format&fit=crop', 3),
  ('Equipo de Porristas',                    'Entrenamientos de coreografías, acrobacias y técnicas de animación para eventos deportivos y competencias de porristas.',       'Deportes',   50, NULL, 'https://images.unsplash.com/photo-1589748239338-afe695e833d7?q=80&w=1026&auto=format&fit=crop', 1)
ON CONFLICT (id_club) DO NOTHING;

-- Asignar presidente al club de Basketball (usuario id=3)
UPDATE clubes SET id_presidente = 3 WHERE id_club = 4;

-- ============================================================
-- INSCRIPCIONES DE PRUEBA
-- ============================================================
INSERT INTO inscripciones (id_usuario, id_club, id_estatus_inscripcion) VALUES
  (2, 4, 1),  -- María Fernanda -> Basketball (activa)
  (3, 4, 1)   -- Carlos Alberto -> Basketball (activa)
ON CONFLICT DO NOTHING;

-- ============================================================
-- AVISOS DE PRUEBA
-- ============================================================
INSERT INTO avisos_clubes (id_club, id_autor, titulo, contenido) VALUES
  (4, 3, 'Horario especial esta semana',      'Recuerden que este sábado el entrenamiento será a las 10:00 AM por mantenimiento del gimnasio. ¡No falten!'),
  (4, 3, 'Confirmación para torneo',          'Necesito que todos confirmen su asistencia al torneo del próximo mes a más tardar el viernes. Pasen conmigo a firmar la hoja de inscripción.')
ON CONFLICT DO NOTHING;
