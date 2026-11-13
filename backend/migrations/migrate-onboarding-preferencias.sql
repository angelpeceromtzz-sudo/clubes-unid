-- ============================================================
-- MIGRACIÓN — ONBOARDING DE PREFERENCIAS DE ALUMNOS
-- ============================================================
-- Idempotente: se puede ejecutar varias veces sin efectos secundarios.
-- NO se ejecuta al arrancar el backend (index.js no lee schema.sql).
-- Aplicar a mano, en la base objetivo, y solo con autorización explícita:
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -f backend/migrations/migrate-onboarding-preferencias.sql
--
-- Toca solo tablas nuevas. No modifica usuarios, clubes, notificaciones,
-- OTP ni ninguna tabla existente. Los alumnos sin fila en
-- preferencias_usuario se interpretan como estado 'pendiente' (sin backfill).
-- Los catálogos se siembran sin sobrescribir cambios administrativos previos
-- (ON CONFLICT DO NOTHING): volver a ejecutar la migración no revierte ediciones.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Catálogos
-- ------------------------------------------------------------

-- Categorías visibles del onboarding. categoria_club enlaza con el texto
-- libre de clubes.categoria (sin FK, a propósito: clubes no cambia).
CREATE TABLE IF NOT EXISTS cat_categorias_interes (
    id_categoria_interes SERIAL PRIMARY KEY,
    nombre               VARCHAR(40) NOT NULL UNIQUE,
    categoria_club       VARCHAR(50) UNIQUE,
    orden                INT NOT NULL DEFAULT 0,
    activo               BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO cat_categorias_interes (nombre, categoria_club, orden) VALUES
    ('Deportivos', 'Deportes',   1),
    ('Culturales', 'Cultura',    2),
    ('Sociales',   'Sociales',   3),
    ('Tecnología', 'Tecnología', 4)
ON CONFLICT (nombre) DO NOTHING;

CREATE TABLE IF NOT EXISTS cat_actividades_interes (
    id_actividad         SERIAL PRIMARY KEY,
    id_categoria_interes INT NOT NULL REFERENCES cat_categorias_interes(id_categoria_interes) ON DELETE RESTRICT,
    nombre               VARCHAR(80) NOT NULL,
    orden                INT NOT NULL DEFAULT 0,
    activo               BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_actividad_categoria_nombre UNIQUE (id_categoria_interes, nombre)
);

-- El índice único (id_categoria_interes, nombre) ya cubre el filtro por categoría.
INSERT INTO cat_actividades_interes (id_categoria_interes, nombre, orden)
SELECT c.id_categoria_interes, v.nombre, v.orden
FROM (VALUES
    ('Deportivos', 'Fútbol', 1),
    ('Deportivos', 'Básquetbol', 2),
    ('Deportivos', 'Voleibol', 3),
    ('Deportivos', 'Ajedrez', 4),
    ('Deportivos', 'Atletismo', 5),
    ('Deportivos', 'Entrenamiento físico', 6),
    ('Culturales', 'Danza', 1),
    ('Culturales', 'Música', 2),
    ('Culturales', 'Teatro', 3),
    ('Culturales', 'Pintura', 4),
    ('Culturales', 'Fotografía', 5),
    ('Culturales', 'Lectura', 6),
    ('Sociales', 'Voluntariado', 1),
    ('Sociales', 'Meditación', 2),
    ('Sociales', 'Bienestar emocional', 3),
    ('Sociales', 'Actividades espirituales', 4),
    ('Sociales', 'Servicio comunitario', 5),
    ('Sociales', 'Liderazgo', 6),
    ('Tecnología', 'Programación', 1),
    ('Tecnología', 'Robótica', 2),
    ('Tecnología', 'Desarrollo web', 3),
    ('Tecnología', 'Videojuegos', 4)
) AS v(categoria, nombre, orden)
JOIN cat_categorias_interes c ON c.nombre = v.categoria
ON CONFLICT (id_categoria_interes, nombre) DO NOTHING;

CREATE TABLE IF NOT EXISTS cat_motivaciones (
    id_motivacion SERIAL PRIMARY KEY,
    codigo        VARCHAR(40) NOT NULL UNIQUE,
    nombre        VARCHAR(80) NOT NULL,
    orden         INT NOT NULL DEFAULT 0,
    activo        BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO cat_motivaciones (codigo, nombre, orden) VALUES
    ('amistades',        'Hacer nuevos amigos',         1),
    ('aprender',         'Aprender algo nuevo',         2),
    ('condicion_fisica', 'Mejorar mi condición física', 3),
    ('talentos',         'Desarrollar mis talentos',    4),
    ('comunidad',        'Ayudar a mi comunidad',       5),
    ('bienestar',        'Cuidar mi bienestar',         6)
ON CONFLICT (codigo) DO NOTHING;

-- ------------------------------------------------------------
-- Preferencias del alumno (1:1 con usuarios)
-- ------------------------------------------------------------

-- Una fila por alumno que interactuó con el onboarding. Sin fila = 'pendiente'.
-- Los cinco booleanos de correo se guardan aunque correo_activo sea FALSE:
-- así se conserva la selección al reactivar las preferencias.
CREATE TABLE IF NOT EXISTS preferencias_usuario (
    id_usuario                  INT PRIMARY KEY REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    estado_onboarding           VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    genero                      VARCHAR(30),
    correo_activo               BOOLEAN NOT NULL DEFAULT FALSE,
    correo_frecuencia           VARCHAR(20) NOT NULL DEFAULT 'inmediata',
    correo_clubes_convocatorias BOOLEAN NOT NULL DEFAULT FALSE,
    correo_mis_clubes           BOOLEAN NOT NULL DEFAULT FALSE,
    correo_eventos              BOOLEAN NOT NULL DEFAULT FALSE,
    correo_noticias             BOOLEAN NOT NULL DEFAULT FALSE,
    correo_recordatorios        BOOLEAN NOT NULL DEFAULT FALSE,
    onboarding_completado_en    TIMESTAMPTZ,
    onboarding_omitido_en       TIMESTAMPTZ,
    actualizado_en              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_pref_estado CHECK (estado_onboarding IN ('pendiente', 'completado', 'omitido')),
    CONSTRAINT chk_pref_genero CHECK (genero IS NULL OR genero IN ('mujer', 'hombre', 'otra_identidad', 'prefiero_no_responder')),
    CONSTRAINT chk_pref_frecuencia CHECK (correo_frecuencia IN ('inmediata', 'diaria', 'semanal'))
);

-- ------------------------------------------------------------
-- Selecciones N:M
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS usuario_categorias_interes (
    id_usuario           INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_categoria_interes INT NOT NULL REFERENCES cat_categorias_interes(id_categoria_interes) ON DELETE RESTRICT,
    PRIMARY KEY (id_usuario, id_categoria_interes)
);

CREATE INDEX IF NOT EXISTS idx_usuario_categorias_interes_categoria
    ON usuario_categorias_interes(id_categoria_interes);

CREATE TABLE IF NOT EXISTS usuario_actividades_interes (
    id_usuario   INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_actividad INT NOT NULL REFERENCES cat_actividades_interes(id_actividad) ON DELETE RESTRICT,
    PRIMARY KEY (id_usuario, id_actividad)
);

CREATE INDEX IF NOT EXISTS idx_usuario_actividades_interes_actividad
    ON usuario_actividades_interes(id_actividad);

CREATE TABLE IF NOT EXISTS usuario_motivaciones (
    id_usuario    INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_motivacion INT NOT NULL REFERENCES cat_motivaciones(id_motivacion) ON DELETE RESTRICT,
    PRIMARY KEY (id_usuario, id_motivacion)
);

CREATE INDEX IF NOT EXISTS idx_usuario_motivaciones_motivacion
    ON usuario_motivaciones(id_motivacion);

-- ------------------------------------------------------------
-- Propuestas de actividades (texto libre, revisión administrativa futura)
-- ------------------------------------------------------------

-- No crea actividades ni clubes. El índice único evita que un mismo alumno
-- repita la misma propuesta tras normalizarla (minúsculas, sin acentos).
CREATE TABLE IF NOT EXISTS actividades_propuestas (
    id_propuesta      SERIAL PRIMARY KEY,
    id_usuario        INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    texto             VARCHAR(80) NOT NULL,
    texto_normalizado VARCHAR(80) NOT NULL,
    estado            VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    creada_en         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revisada_en       TIMESTAMPTZ,
    id_revisor        INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    CONSTRAINT chk_propuesta_estado CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
    CONSTRAINT uq_propuesta_usuario_texto UNIQUE (id_usuario, texto_normalizado)
);

-- Cola de revisión (estado + antigüedad) y detección de propuestas repetidas entre alumnos.
CREATE INDEX IF NOT EXISTS idx_propuestas_estado_fecha
    ON actividades_propuestas(estado, creada_en);
CREATE INDEX IF NOT EXISTS idx_propuestas_texto_normalizado
    ON actividades_propuestas(texto_normalizado);

-- ------------------------------------------------------------
-- Historial de consentimiento para correos OPCIONALES
-- ------------------------------------------------------------

-- Solo registra cambios del consentimiento opcional. OTP, seguridad y avisos
-- operativos no pasan por aquí. Append-only: la aplicación solo inserta.
-- version_aviso es NULL mientras no exista una versión publicada del aviso.
-- ON DELETE CASCADE es provisional, pendiente de la política institucional de
-- conservación (ver documento de diseño).
CREATE TABLE IF NOT EXISTS historial_consentimiento_correo (
    id_consentimiento BIGSERIAL PRIMARY KEY,
    id_usuario        INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    tipo              VARCHAR(30) NOT NULL,
    accion            VARCHAR(20) NOT NULL,
    frecuencia        VARCHAR(20),
    origen            VARCHAR(20) NOT NULL,
    version_aviso     VARCHAR(40),
    creado_en         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_consentimiento_tipo CHECK (tipo IN ('general', 'clubes_convocatorias', 'mis_clubes', 'eventos', 'noticias', 'recordatorios')),
    CONSTRAINT chk_consentimiento_accion CHECK (accion IN ('otorgado', 'retirado')),
    CONSTRAINT chk_consentimiento_origen CHECK (origen IN ('onboarding', 'perfil')),
    CONSTRAINT chk_consentimiento_frecuencia CHECK (frecuencia IS NULL OR frecuencia IN ('inmediata', 'diaria', 'semanal'))
);

-- Cubre el historial de un alumno y el último estado por tipo (leading: id_usuario, tipo).
CREATE INDEX IF NOT EXISTS idx_consentimiento_usuario_tipo_fecha
    ON historial_consentimiento_correo(id_usuario, tipo, creado_en DESC);

COMMIT;
