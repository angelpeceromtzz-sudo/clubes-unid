-- ============================================================
-- SCHEMA COMPLETO — CLUBS UNID
-- ============================================================
-- Archivo consolidado generado a partir de los 22 scripts
-- de migración. Representa el estado final de la base de datos.
--
-- Uso:
--   psql -U postgres -d clubs_bd -f schema.sql
--   psql -U postgres -d clubs_bd -f seed.sql  (datos de prueba)
-- ============================================================

-- ============================================================
-- CATÁLOGOS
-- ============================================================

CREATE TABLE IF NOT EXISTS cat_roles (
    id_rol SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(20) UNIQUE NOT NULL
);

INSERT INTO cat_roles (id_rol, nombre_rol) VALUES
    (1, 'alumno'),
    (2, 'presidente'),
    (3, 'admin'),
    (4, 'rectoria'),
    (5, 'vicepresidente')
ON CONFLICT (id_rol) DO UPDATE SET nombre_rol = EXCLUDED.nombre_rol;

CREATE TABLE IF NOT EXISTS cat_estatus_clubes (
    id_estatus_club SERIAL PRIMARY KEY,
    nombre_estatus VARCHAR(20) UNIQUE NOT NULL
);

INSERT INTO cat_estatus_clubes (nombre_estatus) VALUES
    ('activo'), ('proximamente'), ('inactivo')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS cat_estatus_inscripciones (
    id_estatus_inscripcion SERIAL PRIMARY KEY,
    nombre_estatus VARCHAR(20) UNIQUE NOT NULL
);

INSERT INTO cat_estatus_inscripciones (nombre_estatus) VALUES
    ('activo'), ('baja')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS cat_estatus_postulacion (
    id_estatus SERIAL PRIMARY KEY,
    nombre VARCHAR(20) UNIQUE NOT NULL,
    orden INT NOT NULL DEFAULT 0,
    es_final BOOLEAN DEFAULT FALSE
);

INSERT INTO cat_estatus_postulacion (nombre, orden, es_final) VALUES
    ('En revisión',      1, FALSE),
    ('Preseleccionado',  2, FALSE),
    ('Convocado',        3, FALSE),
    ('Oferta enviada',   4, FALSE),
    ('Miembro oficial',  5, TRUE),
    ('Rechazado',        6, TRUE)
ON CONFLICT (nombre) DO NOTHING;

CREATE TABLE IF NOT EXISTS cat_niveles (
    id_nivel SERIAL PRIMARY KEY,
    nombre_nivel VARCHAR(20) UNIQUE NOT NULL
);

INSERT INTO cat_niveles (id_nivel, nombre_nivel) VALUES
    (1, 'principiante'),
    (2, 'intermedio'),
    (3, 'avanzado')
ON CONFLICT (id_nivel) DO UPDATE SET nombre_nivel = EXCLUDED.nombre_nivel;

-- ============================================================
-- TABLAS PRINCIPALES
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    correo_institucional VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    id_rol INT NOT NULL DEFAULT 1,
    fecha_registro TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    microsoft_id VARCHAR(255) UNIQUE,
    institutional_id VARCHAR(50) UNIQUE,
    deleted_at TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) REFERENCES cat_roles(id_rol) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_usuarios_institutional_id ON usuarios(institutional_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_deleted_at ON usuarios(deleted_at);

CREATE TABLE IF NOT EXISTS clubes (
    id_club SERIAL PRIMARY KEY,
    nombre_club VARCHAR(100) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(50),
    participacion VARCHAR(20) NOT NULL DEFAULT 'mixta' CONSTRAINT chk_club_participacion CHECK (participacion IN ('masculina', 'femenina', 'mixta')),
    cupo_maximo INT NOT NULL CONSTRAINT chk_cupo_positivo CHECK (cupo_maximo > 0),
    id_presidente INT,
    id_vicepresidente INT,
    imagen_portada VARCHAR(255),
    id_estatus_club INT NOT NULL DEFAULT 1,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    horario VARCHAR(100) DEFAULT '',
    max_postulaciones INTEGER DEFAULT NULL,
    postulaciones_actuales INTEGER DEFAULT 0,
    cerrada_manualmente BOOLEAN DEFAULT FALSE,
    fecha_apertura_programada TIMESTAMPTZ DEFAULT NULL,
    fecha_limite_cierre TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT fk_club_presidente FOREIGN KEY (id_presidente) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    CONSTRAINT fk_club_vicepresidente FOREIGN KEY (id_vicepresidente) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
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

CREATE TABLE IF NOT EXISTS formularios (
    id_formulario SERIAL PRIMARY KEY,
    id_alumno INT NOT NULL,
    id_club INT NOT NULL,
    id_convocatoria INT,
    fecha_envio TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    bloque_asignado CHAR(1) NOT NULL DEFAULT 'E',
    nombre_completo VARCHAR(150) NOT NULL,
    matricula VARCHAR(30) NOT NULL,
    carrera VARCHAR(100) NOT NULL,
    cuatrimestre INT NOT NULL,

    telefono_contacto VARCHAR(20) NOT NULL,
    motivo_ingreso TEXT NOT NULL,
    experiencia_previa TEXT DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'En revisión',
    fecha_oferta TIMESTAMPTZ,
    fecha_expiracion TIMESTAMPTZ,
    fecha_respuesta TIMESTAMPTZ,
    motivo_rechazo VARCHAR(100),
    CONSTRAINT fk_formulario_alumno FOREIGN KEY (id_alumno) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_formulario_club FOREIGN KEY (id_club) REFERENCES clubes(id_club) ON DELETE CASCADE,
    CONSTRAINT fk_formulario_convocatoria FOREIGN KEY (id_convocatoria) REFERENCES convocatorias(id_convocatoria) ON DELETE SET NULL,
    CONSTRAINT chk_bloque CHECK (bloque_asignado IN ('A', 'B', 'E')),
    CONSTRAINT chk_cuatrimestre CHECK (cuatrimestre > 0),
    CONSTRAINT chk_status CHECK (status IN (
        'En revisión', 'Preseleccionado', 'Convocado',
        'Oferta enviada', 'Miembro oficial', 'Rechazado'
    ))
);

CREATE TABLE IF NOT EXISTS convocatorias (
    id_convocatoria SERIAL PRIMARY KEY,
    id_club INTEGER NOT NULL REFERENCES clubes(id_club) ON DELETE CASCADE,
    id_presidente INT,
    bloque CHAR(1) NOT NULL,
    periodo VARCHAR(50) NOT NULL,
    fecha DATE,
    hora TIME,
    lugar VARCHAR(200),
    enviada BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_club ON convocatorias(id_club);

CREATE TABLE IF NOT EXISTS notificaciones (
    id_notificacion SERIAL PRIMARY KEY,
    id_emisor INT NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    audiencia VARCHAR(20) NOT NULL,
    id_club INT,
    id_destinatario INT,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_emisor FOREIGN KEY (id_emisor) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_notif_club FOREIGN KEY (id_club) REFERENCES clubes(id_club) ON DELETE CASCADE,
    CONSTRAINT fk_notif_destinatario FOREIGN KEY (id_destinatario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT chk_audiencia CHECK (audiencia IN ('global', 'presidentes', 'alumnos', 'club'))
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_audiencia ON notificaciones(audiencia);
CREATE INDEX IF NOT EXISTS idx_notificaciones_club ON notificaciones(id_club);
CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha ON notificaciones(fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_notif_destinatario ON notificaciones(id_destinatario);

CREATE TABLE IF NOT EXISTS notificaciones_leidas (
    id_notificacion INT NOT NULL,
    id_usuario INT NOT NULL,
    fecha_lectura TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_notificacion, id_usuario),
    CONSTRAINT fk_leida_notif FOREIGN KEY (id_notificacion) REFERENCES notificaciones(id_notificacion) ON DELETE CASCADE,
    CONSTRAINT fk_leida_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_leidas_usuario ON notificaciones_leidas(id_usuario);

CREATE TABLE IF NOT EXISTS notificaciones_eliminadas (
    id_notificacion INT NOT NULL,
    id_usuario INT NOT NULL,
    fecha_eliminacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_notificacion, id_usuario),
    CONSTRAINT fk_eliminada_notif FOREIGN KEY (id_notificacion) REFERENCES notificaciones(id_notificacion) ON DELETE CASCADE,
    CONSTRAINT fk_eliminada_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_eliminadas_usuario ON notificaciones_eliminadas(id_usuario);

CREATE TABLE IF NOT EXISTS historial_admin (
    id_historial SERIAL PRIMARY KEY,
    id_admin INT NOT NULL,
    admin_nombre VARCHAR(150) NOT NULL,
    accion VARCHAR(50) NOT NULL,
    descripcion TEXT NOT NULL,
    entidad_tipo VARCHAR(50),
    entidad_id INT,
    detalles JSONB,
    fecha TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_historial_admin FOREIGN KEY (id_admin) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_historial_admin_fecha ON historial_admin(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_historial_admin_admin ON historial_admin(id_admin);

CREATE TABLE IF NOT EXISTS actividad_clubes (
    id_evento SERIAL PRIMARY KEY,
    tipo_evento VARCHAR(40) NOT NULL,
    id_club INT REFERENCES clubes(id_club),
    id_actor INT REFERENCES usuarios(id_usuario),
    descripcion TEXT NOT NULL,
    detalles JSONB,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_actividad_clubes_fecha ON actividad_clubes(fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_actividad_clubes_club ON actividad_clubes(id_club);

CREATE TABLE IF NOT EXISTS diapositivas_hero (
    id_diapositiva SERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    subtitulo VARCHAR(300),
    url_imagen VARCHAR(500) NOT NULL,
    orden INT NOT NULL DEFAULT 0,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS historial_postulacion (
    id_historial SERIAL PRIMARY KEY,
    id_formulario INT NOT NULL,
    status_anterior VARCHAR(20),
    status_nuevo VARCHAR(20) NOT NULL,
    fecha_cambio TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_historial_formulario FOREIGN KEY (id_formulario) REFERENCES formularios(id_formulario) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_historial_postulacion_formulario ON historial_postulacion(id_formulario);
CREATE INDEX IF NOT EXISTS idx_historial_postulacion_fecha ON historial_postulacion(fecha_cambio DESC);

CREATE TABLE IF NOT EXISTS horarios_club (
    id_horario    SERIAL PRIMARY KEY,
    id_club       INT NOT NULL,
    dia_semana    SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    hora_inicio   TIME NOT NULL,
    hora_fin      TIME NOT NULL,
    lugar         VARCHAR(255) NOT NULL,
    ubicacion_maps VARCHAR(500) DEFAULT '',
    descripcion   TEXT DEFAULT '',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_horario_club FOREIGN KEY (id_club) REFERENCES clubes(id_club) ON DELETE CASCADE,
    CONSTRAINT chk_hora_valida CHECK (hora_fin > hora_inicio)
);

CREATE INDEX IF NOT EXISTS idx_horarios_club_id ON horarios_club(id_club);

-- Migración: convertir horarios_club de eventos puntuales a horario semanal recurrente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'horarios_club' AND column_name = 'fecha'
  ) THEN
    TRUNCATE TABLE horarios_club;
    ALTER TABLE horarios_club DROP CONSTRAINT IF EXISTS fk_horario_club;
    ALTER TABLE horarios_club DROP COLUMN IF EXISTS fecha;
    ALTER TABLE horarios_club DROP COLUMN IF EXISTS hora;
    ALTER TABLE horarios_club ADD COLUMN dia_semana   SMALLINT NOT NULL DEFAULT 1 CHECK (dia_semana BETWEEN 0 AND 6);
    ALTER TABLE horarios_club ADD COLUMN hora_inicio  TIME NOT NULL DEFAULT '09:00';
    ALTER TABLE horarios_club ADD COLUMN hora_fin     TIME NOT NULL DEFAULT '11:00';
    ALTER TABLE horarios_club ADD COLUMN descripcion  TEXT DEFAULT '';
    ALTER TABLE horarios_club ADD CONSTRAINT fk_horario_club FOREIGN KEY (id_club) REFERENCES clubes(id_club) ON DELETE CASCADE;
    ALTER TABLE horarios_club ADD CONSTRAINT chk_hora_valida CHECK (hora_fin > hora_inicio);
    RAISE NOTICE 'Migración horarios_club completada: convertido a horario semanal recurrente';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS clubes_niveles (
    id_club INT NOT NULL,
    id_nivel INT NOT NULL,
    PRIMARY KEY (id_club, id_nivel),
    CONSTRAINT fk_club_nivel_club  FOREIGN KEY (id_club)  REFERENCES clubes(id_club)  ON DELETE CASCADE,
    CONSTRAINT fk_club_nivel_nivel FOREIGN KEY (id_nivel) REFERENCES cat_niveles(id_nivel) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_clubes_niveles_nivel ON clubes_niveles(id_nivel);

-- ============================================================
-- VISTAS
-- ============================================================

DROP VIEW IF EXISTS clubes_con_estado;

CREATE OR REPLACE VIEW clubes_con_estado AS
SELECT
  cl.*,
  COUNT(f.id_formulario) AS formularios_recibidos,
  CASE
    WHEN cl.cerrada_manualmente = TRUE                           THEN 'cerrado'
    WHEN cl.fecha_apertura_programada IS NOT NULL
     AND NOW() < cl.fecha_apertura_programada                    THEN 'proximo'
    WHEN cl.max_postulaciones IS NOT NULL
     AND COUNT(f.id_formulario) >= cl.max_postulaciones           THEN 'lleno'
    WHEN cl.fecha_limite_cierre IS NOT NULL
     AND NOW() > cl.fecha_limite_cierre                           THEN 'cerrado'
    WHEN cl.fecha_apertura_programada IS NULL                     THEN 'cerrado'
    ELSE 'abierto'
  END AS estado_calculado
FROM clubes cl
LEFT JOIN formularios f ON f.id_club = cl.id_club
GROUP BY cl.id_club;

-- ============================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================

-- Trigger: historial automático de postulación
CREATE OR REPLACE FUNCTION fn_historial_postulacion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO historial_postulacion (id_formulario, status_anterior, status_nuevo)
        VALUES (NEW.id_formulario, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_historial_postulacion ON formularios;
CREATE TRIGGER trg_historial_postulacion
    AFTER UPDATE OF status ON formularios
    FOR EACH ROW
    EXECUTE FUNCTION fn_historial_postulacion();

-- Trigger: auto-actualizar fecha_actualizacion (genérica, reusada por encuestas)
CREATE OR REPLACE FUNCTION fn_actualizar_fecha()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_fecha_diapositiva ON diapositivas_hero;
CREATE TRIGGER trg_actualizar_fecha_diapositiva
    BEFORE UPDATE ON diapositivas_hero
    FOR EACH ROW
    EXECUTE FUNCTION fn_actualizar_fecha();

DROP FUNCTION IF EXISTS fn_actualizar_fecha_diapositiva();

-- Trigger: impedir desactivar la última diapositiva activa
CREATE OR REPLACE FUNCTION fn_proteger_ultima_diapositiva_activa()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.activa = TRUE AND NEW.activa = FALSE)
       OR (TG_OP = 'DELETE' AND OLD.activa = TRUE) THEN
        IF NOT EXISTS (
            SELECT 1 FROM diapositivas_hero
            WHERE activa = TRUE
              AND id_diapositiva != CASE WHEN TG_OP = 'DELETE'
                                          THEN OLD.id_diapositiva
                                          ELSE NEW.id_diapositiva END
        ) THEN
            RAISE EXCEPTION 'Debe existir al menos una diapositiva activa';
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proteger_ultima_diapositiva ON diapositivas_hero;
CREATE TRIGGER trg_proteger_ultima_diapositiva
    BEFORE UPDATE OR DELETE ON diapositivas_hero
    FOR EACH ROW
    EXECUTE FUNCTION fn_proteger_ultima_diapositiva_activa();

-- ============================================================
-- MÓDULO DE ENCUESTAS (PBI-10)
-- ============================================================
-- Encuestas independientes para diagnosticar intereses de alumnos.
-- Acceso público solo por enlace directo /encuesta/:slug (sin login).
-- La URL usa 'slug' (aleatorio, no adivinable), nunca 'id_encuesta'.
--Reversión manual en migrations/migrate-encuestas-down.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS encuestas (
    id_encuesta            SERIAL PRIMARY KEY,
    slug                   VARCHAR(64) NOT NULL UNIQUE,
    titulo                 VARCHAR(200) NOT NULL,
    descripcion            TEXT,
    mensaje_agradecimiento VARCHAR(300),
    estado                 VARCHAR(12) NOT NULL DEFAULT 'borrador',
    fecha_inicio           TIMESTAMPTZ,
    fecha_fin              TIMESTAMPTZ,
    -- Las encuestas son anónimas por defecto; sólo se pide matrícula si el
    -- Coordinación lo activa. Valida el backend que exista si pide_matricula.
    pide_matricula         BOOLEAN NOT NULL DEFAULT FALSE,
    id_creador             INT NOT NULL,
    fecha_creacion         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Longitud mínima de 16: impide slugs adivinables tipo 'encuesta-1'
    CONSTRAINT chk_encuesta_slug      CHECK (slug ~ '^[a-z0-9-]{16,64}$'),
    CONSTRAINT chk_encuesta_estado    CHECK (estado IN ('borrador', 'publicada', 'cerrada')),
    -- Vigencia opcional; si se define ambos extremos, el fin va después del inicio
    CONSTRAINT chk_encuesta_vigencia  CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin > fecha_inicio),
    CONSTRAINT fk_encuesta_creador    FOREIGN KEY (id_creador) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS preguntas (
    id_pregunta    SERIAL PRIMARY KEY,
    id_encuesta    INT NOT NULL,
    texto          VARCHAR(500) NOT NULL,
    ayuda          TEXT,
    tipo           VARCHAR(20) NOT NULL,
    es_obligatoria BOOLEAN NOT NULL DEFAULT FALSE,
    orden          INT NOT NULL,
    -- Sólo la escala numérica usa min/max; el resto debe dejarlos en NULL
    escala_min     INT,
    escala_max     INT,
    CONSTRAINT chk_pregunta_tipo   CHECK (tipo IN ('opcion_unica', 'opcion_multiple', 'texto_corto', 'texto_largo', 'escala')),
    CONSTRAINT chk_pregunta_orden  CHECK (orden >= 1),
    CONSTRAINT chk_pregunta_escala CHECK (
        (tipo =  'escala' AND escala_min IS NOT NULL AND escala_max IS NOT NULL
                 AND escala_min >= 0 AND escala_max <= 10 AND escala_max > escala_min)
        OR
        (tipo <> 'escala' AND escala_min IS NULL AND escala_max IS NULL)
    ),
    -- Deferrable para permitir reordenar preguntas dentro de una transacción
    CONSTRAINT uq_pregunta_orden     UNIQUE (id_encuesta, orden) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_pregunta_encuesta  FOREIGN KEY (id_encuesta) REFERENCES encuestas(id_encuesta) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS opciones_pregunta (
    id_opcion   SERIAL PRIMARY KEY,
    id_pregunta INT NOT NULL,
    texto       VARCHAR(300) NOT NULL,
    orden       INT NOT NULL,
    -- Vínculo opcional con un club, para recomendar clubes tras la encuesta.
    -- Si el club se elimina, el vínculo queda en NULL sin perder la respuesta.
    id_club     INT,
    CONSTRAINT chk_opcion_orden      CHECK (orden >= 1),
    CONSTRAINT uq_opcion_orden       UNIQUE (id_pregunta, orden) DEFERRABLE INITIALLY DEFERRED,
    -- Destino de la FK compuesta de detalle_respuestas: garantiza que la
    -- opción registrada pertenezca a la pregunta registrada.
    CONSTRAINT uq_opcion_pregunta    UNIQUE (id_opcion, id_pregunta),
    CONSTRAINT fk_opcion_pregunta    FOREIGN KEY (id_pregunta) REFERENCES preguntas(id_pregunta) ON DELETE CASCADE,
    CONSTRAINT fk_opcion_club        FOREIGN KEY (id_club) REFERENCES clubes(id_club) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS respuestas_encuesta (
    id_respuesta SERIAL PRIMARY KEY,
    id_encuesta  INT NOT NULL,
    -- Datos del alumno: opcionales siempre. En encuestas anónimas se guardan
    -- sólo si el alumno los envía voluntariamente.
    nombre       VARCHAR(150),
    matricula    VARCHAR(30),
    carrera      VARCHAR(100),
    fecha_envio  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- NULL está permitido (respuesta anónima); cadena vacía no
    CONSTRAINT chk_respuesta_matricula CHECK (matricula IS NULL OR char_length(btrim(matricula)) > 0),
    -- En PostgreSQL los NULL no colisionan en un UNIQUE, así que las respuestas
    -- anónimas coexisten sin restricción mientras la matrícula sí es única.
    CONSTRAINT uq_respuesta_matricula  UNIQUE (id_encuesta, matricula),
    -- RESTRICT: no se puede borrar una encuesta que ya tenga respuestas
    CONSTRAINT fk_respuesta_encuesta   FOREIGN KEY (id_encuesta) REFERENCES encuestas(id_encuesta) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS detalle_respuestas (
    id_detalle   SERIAL PRIMARY KEY,
    id_respuesta INT NOT NULL,
    id_pregunta  INT NOT NULL,
    -- Exactamente uno de estos tres por fila. Opción múltiple genera una fila
    -- por opción marcada; texto y escala generan una sola.
    id_opcion    INT,
    texto        TEXT,
    numero       INT,
    CONSTRAINT chk_detalle_valor CHECK (num_nonnulls(id_opcion, texto, numero) = 1),
    CONSTRAINT chk_detalle_texto CHECK (char_length(texto) <= 2000),
    CONSTRAINT fk_detalle_respuesta FOREIGN KEY (id_respuesta) REFERENCES respuestas_encuesta(id_respuesta) ON DELETE CASCADE,
    -- Integridad histórica: con respuestas registradas, ni la pregunta ni la
    -- opción se pueden borrar (RESTRICT, no CASCADE).
    CONSTRAINT fk_detalle_pregunta  FOREIGN KEY (id_pregunta) REFERENCES preguntas(id_pregunta) ON DELETE RESTRICT,
    CONSTRAINT fk_detalle_opcion    FOREIGN KEY (id_opcion, id_pregunta) REFERENCES opciones_pregunta(id_opcion, id_pregunta) ON DELETE RESTRICT
);

-- Índices para las consultas de resultados
CREATE INDEX IF NOT EXISTS idx_preguntas_encuesta        ON preguntas(id_encuesta);
CREATE INDEX IF NOT EXISTS idx_opciones_pregunta        ON opciones_pregunta(id_pregunta);
CREATE INDEX IF NOT EXISTS idx_opciones_club            ON opciones_pregunta(id_club) WHERE id_club IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_encuestas_estado         ON encuestas(estado);
CREATE INDEX IF NOT EXISTS idx_respuestas_encuesta_fecha ON respuestas_encuesta(id_encuesta, fecha_envio);
CREATE INDEX IF NOT EXISTS idx_detalle_respuesta        ON detalle_respuestas(id_respuesta);
CREATE INDEX IF NOT EXISTS idx_detalle_pregunta         ON detalle_respuestas(id_pregunta);
CREATE INDEX IF NOT EXISTS idx_detalle_opcion           ON detalle_respuestas(id_opcion) WHERE id_opcion IS NOT NULL;

-- Una misma opción no se marca dos veces en una respuesta
CREATE UNIQUE INDEX IF NOT EXISTS uq_detalle_opcion ON detalle_respuestas(id_respuesta, id_pregunta, id_opcion) WHERE id_opcion IS NOT NULL;
-- Un texto o una escala no se repite para la misma pregunta
CREATE UNIQUE INDEX IF NOT EXISTS uq_detalle_texto_numero ON detalle_respuestas(id_respuesta, id_pregunta) WHERE id_opcion IS NULL;

-- Trigger: reutiliza la función genérica de fecha_actualizacion
DROP TRIGGER IF EXISTS trg_actualizar_fecha_encuesta ON encuestas;
CREATE TRIGGER trg_actualizar_fecha_encuesta
    BEFORE UPDATE ON encuestas
    FOR EACH ROW
    EXECUTE FUNCTION fn_actualizar_fecha();

-- ============================================================
-- ROW LEVEL SECURITY — MÓDULO DE ENCUESTAS
-- ============================================================
-- Sin políticas a propósito: todo el acceso pasa por Express con credenciales
-- de servidor. db.js conecta como propietario de las tablas, y los propietarios
-- y superusuarios saltan RLS salvo con FORCE ROW LEVEL SECURITY, que no se usa
-- (lo rompería). Esto bloquea los roles 'anon'/'authenticated' de Supabase.
ALTER TABLE encuestas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE preguntas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE opciones_pregunta   ENABLE ROW LEVEL SECURITY;
ALTER TABLE respuestas_encuesta ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_respuestas  ENABLE ROW LEVEL SECURITY;
