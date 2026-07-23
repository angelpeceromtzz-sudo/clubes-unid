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
    (4, 'rectoria')
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
    cupo_maximo INT NOT NULL CONSTRAINT chk_cupo_positivo CHECK (cupo_maximo > 0),
    id_presidente INT,
    imagen_portada VARCHAR(255),
    id_estatus_club INT NOT NULL DEFAULT 1,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    lugar VARCHAR(255) DEFAULT '',
    horario VARCHAR(100) DEFAULT '',
    max_postulaciones INTEGER DEFAULT NULL,
    postulaciones_actuales INTEGER DEFAULT 0,
    cerrada_manualmente BOOLEAN DEFAULT FALSE,
    fecha_apertura_programada TIMESTAMPTZ DEFAULT NULL,
    fecha_limite_cierre TIMESTAMPTZ DEFAULT NULL,
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
    turno VARCHAR(20) NOT NULL,
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
    alineacion VARCHAR(10) NOT NULL DEFAULT 'izquierda',
    orden INT NOT NULL DEFAULT 0,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_alineacion CHECK (alineacion IN ('izquierda', 'centro', 'derecha'))
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
    id_horario SERIAL PRIMARY KEY,
    id_club INT NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    lugar VARCHAR(255) NOT NULL,
    ubicacion_maps VARCHAR(500) DEFAULT '',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_horario_club FOREIGN KEY (id_club) REFERENCES clubes(id_club) ON DELETE CASCADE
);

-- ============================================================
-- VISTAS
-- ============================================================

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

-- Trigger: auto-actualizar fecha_actualizacion en diapositivas
CREATE OR REPLACE FUNCTION fn_actualizar_fecha_diapositiva()
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
    EXECUTE FUNCTION fn_actualizar_fecha_diapositiva();

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
