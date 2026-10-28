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
    (5, 'vicepresidente'),
    (6, 'responsable_mural')
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

-- Catálogo de licenciaturas de la UNID.
--
-- Fuente única de verdad para dos módulos muy distintos:
--   - formularios (inscripción a un club): el alumno elige de esta lista.
--   - respuestas_encuesta: se guarda la licenciatura para poder segmentar
--     los resultados por programa.
--
-- No lleva el número de matrícula de ningún alumno, sólo el nombre oficial
-- del programa. Ambas tablas lo referencian por FK, no como texto: cuando
-- 'carrera' era VARCHAR(100) los valores se fragmentaban ('Ing. en Sistemas',
-- 'Lic. en Contaduría', 'Lic. en Diseño Gráfico') y cualquier GROUP BY o
-- filtro por carrera daba resultados que no cuadraban con nada.
CREATE TABLE IF NOT EXISTS cat_licenciaturas (
    id_licenciatura SERIAL PRIMARY KEY,
    nombre         VARCHAR(120) NOT NULL UNIQUE,
    orden          INT NOT NULL DEFAULT 0
);

INSERT INTO cat_licenciaturas (nombre, orden) VALUES
    ('Licenciatura en Administración Empresarial', 1),
    ('Licenciatura en Administración de Empresas Turísticas', 2),
    ('Licenciatura en Arquitectura', 3),
    ('Licenciatura en Ciencias y Técnicas de la Comunicación', 4),
    ('Licenciatura en Contabilidad y Finanzas', 5),
    ('Licenciatura en Derecho y Ciencias Jurídicas', 6),
    ('Licenciatura en Diseño Gráfico Digital', 7),
    ('Licenciatura en Educación Física, Recreación y Deporte', 8),
    ('Licenciatura en Ingeniería de Software y Sistemas Computacionales', 9),
    ('Licenciatura en Mercadotecnia Estratégica', 10),
    -- Licenciaturas Ejecutivas: son programas distintos de los regulares, no
    -- nombres alternativos (cada uno tiene su propio RVOE: Contabilidad
    -- Financiera 20221767 vs. Contabilidad y Finanzas 20193846; Derecho
    -- 20193847 vs. Derecho y Ciencias Jurídicas 20193848). Se listan sin
    -- distinguir modalidad porque el catálogo no tiene ese campo.
    ('Licenciatura en Administración de Empresas', 11),
    ('Licenciatura en Contabilidad Financiera', 12),
    ('Licenciatura en Derecho', 13),
    ('Licenciatura en Educación y Tecnologías para el Aprendizaje', 14)
ON CONFLICT (nombre) DO UPDATE SET orden = EXCLUDED.orden;

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

-- ============================================================
-- ACCESO MEDIANTE CÓDIGO OTP (Fase 1.5)
-- ============================================================
-- La tabla otp_codigos NO se crea desde schema.sql. Su fuente de verdad es
-- migrations/migrate-otp-codigos.sql y se aplica de forma manual y controlada:
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -f backend/migrations/migrate-otp-codigos.sql
--
-- Así, desplegar el backend no crea ni modifica esta tabla en una base
-- compartida. migrate.js ya no se ejecuta al arrancar.

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
    -- Referencia al catálogo, no texto libre: ver cat_licenciaturas.
    id_licenciatura INT NOT NULL,
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
    CONSTRAINT fk_formulario_licenciatura FOREIGN KEY (id_licenciatura) REFERENCES cat_licenciaturas(id_licenciatura) ON DELETE RESTRICT,
    CONSTRAINT chk_bloque CHECK (bloque_asignado IN ('A', 'B', 'E')),
    CONSTRAINT chk_cuatrimestre CHECK (cuatrimestre > 0),
    CONSTRAINT chk_status CHECK (status IN (
        'En revisión', 'Preseleccionado', 'Convocado',
        'Oferta enviada', 'Miembro oficial', 'Rechazado'
    ))
);

-- Migración de 'carrera VARCHAR(100)' a 'id_licenciatura INT REFERENCES'.
--
-- Es DESTRUCTIVA sobre los datos viejos y no se puede automatizar: las filas
-- existentes guardan abreviaturas ('Lic. en Contaduría Pública', 'Ing. en
-- Sistemas Computacionales') que no corresponden a ningún nombre del catálogo,
-- y al menos una ('Ing. en Mecatrónica') no tiene programa en la lista de 10.
-- Mapearlas exigiría adivinar, y adivinar mal asignarle la carrera equivocada a
-- un alumno es peor que no tener el dato.
--
-- El NOT NULL va sólo en el CREATE TABLE de arriba. Si se declarara aquí, el
-- ALTER fallaría en cuanto la tabla tuviera filas, y como migrate.js manda todo
-- schema.sql en un solo pool.query(), ese fallo hace rollback del esquema
-- ENTERO y sólo queda un console.error que no dice qué lo causó.
--
-- En una base con filas viejas la columna queda nullable y hay que limpiarla a
-- mano una vez:  DELETE FROM formularios;  y volver a correr seed.sql.
ALTER TABLE formularios DROP COLUMN IF EXISTS carrera;
ALTER TABLE formularios ADD COLUMN IF NOT EXISTS id_licenciatura INT
    REFERENCES cat_licenciaturas(id_licenciatura) ON DELETE RESTRICT;

-- 'turno' desapareció del modelo (el bloque A/B/E lo sustituye) pero el CREATE
-- TABLE de arriba ya no lo declara, así que en una base creada antes el
-- NOT NULL se queda y el seed revienta al no mandar el valor. Se quita igual
-- que 'carrera': es lo que deja el INSERT de formularios.sql con la forma del
-- esquema actual.
ALTER TABLE formularios DROP COLUMN IF EXISTS turno;

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

-- El FK vive acá y no en el CREATE TABLE de formularios porque el orden del
-- archivo lo crea después: declarar la constraint inline exigiría que
-- 'convocatorias' ya existiera. Suele venir bien porque la base original se
-- armó con migrations_legacy/ en otro orden, pero schema.sql tiene que
-- ejecutarse de una sentada y en una base vacía (migrate() corre en cada
-- arranque, así que el bloque tiene que ser idempotente).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_formulario_convocatoria'
    ) THEN
        ALTER TABLE formularios
            ADD CONSTRAINT fk_formulario_convocatoria
            FOREIGN KEY (id_convocatoria) REFERENCES convocatorias(id_convocatoria)
            ON DELETE SET NULL;
    END IF;
END $$;

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
    url_imagen_movil VARCHAR(500),
    orden INT NOT NULL DEFAULT 0,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS noticias (
    id_noticia SERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    subtitulo VARCHAR(300),
    contenido TEXT NOT NULL,
    url_imagen VARCHAR(500),
    destacada BOOLEAN NOT NULL DEFAULT FALSE,
    publicada BOOLEAN NOT NULL DEFAULT TRUE,
    id_autor INT,
    categoria VARCHAR(20) NOT NULL DEFAULT 'informativo'
        CONSTRAINT chk_noticia_categoria CHECK (categoria IN ('promocion', 'evento', 'informativo')),
    fecha_evento DATE,
    fecha_fin_evento DATE,
    mostrar_en_mural BOOLEAN NOT NULL DEFAULT FALSE,
    solo_calendario BOOLEAN NOT NULL DEFAULT FALSE,
    hora_evento TIME,
    lugar_evento VARCHAR(200),
    categoria_evento VARCHAR(20) NOT NULL DEFAULT 'social'
        CONSTRAINT chk_noticia_categoria_evento CHECK (categoria_evento IN ('social', 'deportivo', 'cultural')),
    fecha_publicacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_noticia_autor FOREIGN KEY (id_autor) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

-- Migración idempotente: en bases ya existentes la columna no está.
ALTER TABLE noticias ADD COLUMN IF NOT EXISTS categoria VARCHAR(20) NOT NULL DEFAULT 'informativo';
ALTER TABLE noticias ADD COLUMN IF NOT EXISTS fecha_evento DATE;
ALTER TABLE noticias ADD COLUMN IF NOT EXISTS fecha_fin_evento DATE;
ALTER TABLE noticias ADD COLUMN IF NOT EXISTS mostrar_en_mural BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE noticias ADD COLUMN IF NOT EXISTS solo_calendario BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE noticias ADD COLUMN IF NOT EXISTS hora_evento TIME;
ALTER TABLE noticias ADD COLUMN IF NOT EXISTS lugar_evento VARCHAR(200);
ALTER TABLE noticias ADD COLUMN IF NOT EXISTS categoria_evento VARCHAR(20) NOT NULL DEFAULT 'social';
ALTER TABLE noticias ADD COLUMN IF NOT EXISTS subtitulo VARCHAR(300);
UPDATE noticias SET categoria_evento = 'social' WHERE categoria_evento NOT IN ('social', 'deportivo', 'cultural', 'examen', 'pago', 'vacaciones', 'academico', 'calificaciones', 'inhabil', 'tramite');
ALTER TABLE noticias ALTER COLUMN categoria_evento SET DEFAULT 'social';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_noticia_categoria') THEN
        ALTER TABLE noticias
            ADD CONSTRAINT chk_noticia_categoria CHECK (categoria IN ('promocion', 'evento', 'informativo'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_noticia_periodo_evento') THEN
        ALTER TABLE noticias ADD CONSTRAINT chk_noticia_periodo_evento
            CHECK (fecha_fin_evento IS NULL OR (fecha_evento IS NOT NULL AND fecha_fin_evento >= fecha_evento));
    END IF;
END $$;

-- Las fechas académicas son registros independientes de las noticias y eventos.
CREATE TABLE IF NOT EXISTS fechas_calendario (
    id_fecha SERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    tipo_fecha VARCHAR(20) NOT NULL CHECK (tipo_fecha IN ('examen', 'pago', 'vacaciones', 'academico', 'calificaciones', 'inhabil', 'tramite')),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    nota TEXT,
    url_imagen VARCHAR(500),
    publicada BOOLEAN NOT NULL DEFAULT TRUE,
    mostrar_en_mural BOOLEAN NOT NULL DEFAULT FALSE,
    id_autor INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    id_noticia_origen INT UNIQUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_fecha_calendario_periodo CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

ALTER TABLE fechas_calendario
    ADD COLUMN IF NOT EXISTS mostrar_en_mural BOOLEAN NOT NULL DEFAULT FALSE;

-- Copia y retirada del origen en una sola sentencia: si falla la copia, se
-- conservan los originales. La clave de origen evita duplicados al reejecutar.
WITH trasladadas AS (
    INSERT INTO fechas_calendario (titulo, tipo_fecha, fecha_inicio, fecha_fin, nota, url_imagen,
                                  publicada, id_autor, id_noticia_origen, fecha_creacion, fecha_actualizacion)
    SELECT titulo,
           CASE WHEN categoria_evento IN ('examen', 'pago', 'vacaciones', 'academico', 'calificaciones', 'inhabil', 'tramite')
                THEN categoria_evento ELSE 'academico' END,
           fecha_evento, fecha_fin_evento,
           NULLIF(CONCAT_WS(E'\n', CASE WHEN contenido <> titulo THEN contenido END,
                           CASE WHEN hora_evento IS NOT NULL THEN 'Hora: ' || TO_CHAR(hora_evento, 'HH24:MI') END,
                           CASE WHEN lugar_evento IS NOT NULL THEN 'Lugar: ' || lugar_evento END), ''),
           url_imagen, publicada, id_autor, id_noticia, fecha_publicacion, fecha_actualizacion
    FROM noticias
    WHERE fecha_evento IS NOT NULL AND
          (solo_calendario = TRUE OR (categoria = 'evento' AND categoria_evento IN ('examen', 'pago', 'vacaciones', 'academico', 'calificaciones', 'inhabil', 'tramite')))
    ON CONFLICT (id_noticia_origen) DO UPDATE SET titulo = EXCLUDED.titulo, tipo_fecha = EXCLUDED.tipo_fecha,
        fecha_inicio = EXCLUDED.fecha_inicio, fecha_fin = EXCLUDED.fecha_fin, nota = EXCLUDED.nota,
        url_imagen = EXCLUDED.url_imagen, publicada = EXCLUDED.publicada, id_autor = EXCLUDED.id_autor,
        fecha_actualizacion = EXCLUDED.fecha_actualizacion
    RETURNING id_noticia_origen
)
DELETE FROM noticias WHERE id_noticia IN (SELECT id_noticia_origen FROM trasladadas);

UPDATE noticias SET categoria_evento = 'social' WHERE categoria_evento NOT IN ('social', 'deportivo', 'cultural');
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_noticia_categoria_evento'
               AND (pg_get_constraintdef(oid) LIKE '%examen%' OR pg_get_constraintdef(oid) LIKE '%general%')) THEN
        ALTER TABLE noticias DROP CONSTRAINT chk_noticia_categoria_evento;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_noticia_categoria_evento') THEN
        ALTER TABLE noticias ADD CONSTRAINT chk_noticia_categoria_evento CHECK (categoria_evento IN ('social', 'deportivo', 'cultural'));
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_fechas_calendario_inicio ON fechas_calendario(fecha_inicio);

-- ============================================================
-- PBI-17 — Flujo de aprobación previa de publicaciones
-- ============================================================
-- `status` es la fuente de verdad del estado editorial:
--   draft     Borrador                  pendiente  Pendiente de aprobación
--   published Publicada                 rejected   Rechazada (con motivo)
--
-- `publicada` se conserva como columna ESPEJO (`publicada = status='published'`)
-- para no romper a los lectores actuales: dashboard, `/eventos`,
-- `intereses_eventos` y cualquier query que todavía compare esa bandera.
--
-- Idempotente y seguro de re-ejecutar: el backfill sólo corre la PRIMERA vez,
-- es decir, cuando la columna se acaba de crear. Reaplicar el script sobre una
-- base que ya guarda estados no los pisa.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'noticias'
          AND column_name = 'status'
    ) THEN
        ALTER TABLE noticias ADD COLUMN status VARCHAR(20);

        -- Lo que ya estaba publicado sigue publicado; todo lo demás queda como
        -- borrador y de ahí entra al flujo de revisión.
        UPDATE noticias SET status = CASE WHEN publicada THEN 'published' ELSE 'draft' END;

        ALTER TABLE noticias ALTER COLUMN status SET DEFAULT 'draft';
        ALTER TABLE noticias ALTER COLUMN status SET NOT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'noticias'
          AND column_name = 'motivo_rechazo'
    ) THEN
        ALTER TABLE noticias ADD COLUMN motivo_rechazo TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'noticias'
          AND column_name = 'fecha_revision'
    ) THEN
        ALTER TABLE noticias ADD COLUMN fecha_revision TIMESTAMPTZ;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_noticia_status') THEN
        ALTER TABLE noticias
            ADD CONSTRAINT chk_noticia_status
            CHECK (status IN ('draft', 'pending', 'published', 'rejected'));
    END IF;
END $$;

-- Alinea la bandera espejo con el estado que ya traía cada fila (sólo toca las
-- que difieren, así una re-ejecución no escribe de más).
UPDATE noticias
SET publicada = (status = 'published')
WHERE publicada IS DISTINCT FROM (status = 'published');

-- Invariante en la base: nadie puede dejar `publicada` desincronizada de
-- `status`, ni publicar sin pasar por `published`. Protege también contra un
-- backend desplegado con código viejo que sólo escriba la bandera.
CREATE OR REPLACE FUNCTION fn_noticias_espejo_publicada() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Alta con la bandera encendida y sin estado explícito: era el
        -- comportamiento de "publicar directo" anterior al flujo.
        IF NEW.publicada AND NEW.status = 'draft' THEN
            NEW.status := 'published';
        END IF;
    ELSIF NEW.status IS NOT DISTINCT FROM OLD.status
          AND NEW.publicada IS DISTINCT FROM OLD.publicada THEN
        -- Sólo movieron la bandera (cliente viejo): el estado la sigue.
        NEW.status := CASE WHEN NEW.publicada THEN 'published' ELSE 'draft' END;
        IF NEW.status <> 'rejected' THEN
            NEW.motivo_rechazo := NULL;
        END IF;
    END IF;

    NEW.publicada := (NEW.status = 'published');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_noticias_espejo_publicada ON noticias;
CREATE TRIGGER trg_noticias_espejo_publicada
    BEFORE INSERT OR UPDATE ON noticias
    FOR EACH ROW
    EXECUTE FUNCTION fn_noticias_espejo_publicada();

CREATE INDEX IF NOT EXISTS idx_noticias_status ON noticias(status);
-- Filtra el feed público por estado y fecha; parcial porque sólo le interesan
-- las publicadas.
CREATE INDEX IF NOT EXISTS idx_noticias_publicadas_fecha
    ON noticias(fecha_publicacion DESC)
    WHERE status = 'published';

CREATE TABLE IF NOT EXISTS intereses_eventos (
    id_noticia INT NOT NULL REFERENCES noticias(id_noticia) ON DELETE CASCADE,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_noticia, id_usuario)
);

CREATE INDEX IF NOT EXISTS idx_intereses_eventos_usuario ON intereses_eventos(id_usuario);

CREATE INDEX IF NOT EXISTS idx_noticias_publicada ON noticias(publicada);
CREATE INDEX IF NOT EXISTS idx_noticias_fecha ON noticias(fecha_publicacion DESC);

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

-- Migración legacy de horarios_club (eventos puntuales → horario semanal
-- recurrente): RETIRADA del arranque (auditoría H11). El bloque anterior
-- ejecutaba un TRUNCATE de horarios_club dentro de DO $$ y corría en CADA
-- arranque del backend: si una base legada aún tenía la columna 'fecha',
-- sus horarios se vaciaban sin aviso ni respaldo. Ahora el arranque solo
-- aplica este schema idempotente y no destructivo. Si alguna base persiste
-- con el esquema legado, convertirla a mano (con respaldo previo) usando:
--   backend/migrations/migrate-horarios-legado-semanal.sql
-- (psql -f; NO se ejecuta automáticamente; es no-op en bases ya migradas).

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

-- La vista clubes_con_estado se define al final del archivo (BUG-01) para
-- contar únicamente las postulaciones del ciclo de inscripción vigente.

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

    -- Trigger: auto-actualizar fecha_actualizacion en noticias
CREATE OR REPLACE FUNCTION fn_actualizar_fecha_noticia()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_fecha_noticia ON noticias;
CREATE TRIGGER trg_actualizar_fecha_noticia
    BEFORE UPDATE ON noticias
    FOR EACH ROW
    EXECUTE FUNCTION fn_actualizar_fecha_noticia();

-- ============================================================
-- MÓDULO DE ENCUESTAS (PBI-10)
-- ============================================================
-- Encuestas independientes para diagnosticar intereses de alumnos.
-- Acceso público solo por enlace directo /encuesta/:slug (sin login).
-- La URL usa 'slug' (aleatorio, no adivinable), nunca 'id_encuesta'.
-- Las respuestas NO guardan nombre ni matrícula: la tabla no tiene columnas
-- para eso. Ver el comentario de respuestas_encuesta.
-- Reversión manual en migrations/migrate-encuestas-down.sql
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
    -- No hay forma de esconder una pregunta sin borrarla: si está en la
    -- encuesta, el alumno la ve. Para quitarle al alumno se borra la pregunta.
    orden          INT NOT NULL,
    -- Sólo la escala numérica usa min/max; el resto debe dejarlos en NULL
    escala_min     INT,
    escala_max     INT,
    -- Etiquetas de los extremos de la escala ('1 = Nada', '5 = Todos los días').
    -- Opcionales: una escala puede no tenerlas. Sólo la escala las usa.
    escala_min_texto VARCHAR(80),
    escala_max_texto VARCHAR(80),
    -- 'licenciatura' es el único tipo cuya respuesta NO vive en
    -- detalle_respuestas: se guarda en respuestas_encuesta.id_licenciatura
    -- porque chk_detalle_valor no tiene dónde poner un id de catálogo.
    CONSTRAINT chk_pregunta_tipo   CHECK (tipo IN ('opcion_unica', 'opcion_multiple', 'texto_corto', 'texto_largo', 'escala', 'licenciatura')),
    CONSTRAINT chk_pregunta_orden  CHECK (orden >= 1),
    CONSTRAINT chk_pregunta_escala CHECK (
        (tipo =  'escala' AND escala_min IS NOT NULL AND escala_max IS NOT NULL
                 AND escala_min >= 0 AND escala_max <= 10 AND escala_max > escala_min)
        OR
        (tipo <> 'escala' AND escala_min IS NULL AND escala_max IS NULL
                      AND escala_min_texto IS NULL AND escala_max_texto IS NULL)
    ),
    -- Deferrable para permitir reordenar preguntas dentro de una transacción
    CONSTRAINT uq_pregunta_orden     UNIQUE (id_encuesta, orden) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_pregunta_encuesta  FOREIGN KEY (id_encuesta) REFERENCES encuestas(id_encuesta) ON DELETE CASCADE
);

-- Columnas agregadas después del commit inicial del módulo.
ALTER TABLE preguntas ADD COLUMN IF NOT EXISTS escala_min_texto VARCHAR(80);
ALTER TABLE preguntas ADD COLUMN IF NOT EXISTS escala_max_texto VARCHAR(80);

-- es_visible se quitó del módulo: no hay forma de esconder una pregunta sin
-- borrarla. DROP y no sólo sacarlo del CREATE TABLE, porque migrate() corre este
-- archivo entero en cada arranque y el CREATE TABLE es un no-op en bases que ya
-- existen: sin esta línea la columna se quedaría ahí para siempre.
ALTER TABLE preguntas DROP COLUMN IF EXISTS es_visible;

ALTER TABLE preguntas DROP CONSTRAINT IF EXISTS chk_pregunta_escala;
ALTER TABLE preguntas ADD CONSTRAINT chk_pregunta_escala CHECK (
    (tipo =  'escala' AND escala_min IS NOT NULL AND escala_max IS NOT NULL
             AND escala_min >= 0 AND escala_max <= 10 AND escala_max > escala_min)
    OR
    (tipo <> 'escala' AND escala_min IS NULL AND escala_max IS NULL
                  AND escala_min_texto IS NULL AND escala_max_texto IS NULL)
);

-- chk_pregunta_tipo se rehace por el mismo motivo que el de arriba: el CHECK del
-- CREATE TABLE sólo aplica a las bases nuevas, así que sin estas dos líneas el
-- tipo 'licenciatura' se rechazaría en toda base que ya tenga la tabla.
ALTER TABLE preguntas DROP CONSTRAINT IF EXISTS chk_pregunta_tipo;
ALTER TABLE preguntas ADD CONSTRAINT chk_pregunta_tipo CHECK (
    tipo IN ('opcion_unica', 'opcion_multiple', 'texto_corto', 'texto_largo', 'escala', 'licenciatura')
);

-- Una encuesta puede tener como mucho una pregunta de licenciatura. No se puede
-- expresar como CHECK (contaría filas, y un CHECK sólo ve su propia fila), así
-- que va como índice parcial: sobre las filas de tipo 'licenciatura' el
-- id_encuesta tiene que ser único. Las demás preguntas no entran y no se ven
-- afectadas. Es el que de verdad cierra la puerta; el 400 de
-- POST /admin/:id/preguntas es sólo el mensaje legible.
CREATE UNIQUE INDEX IF NOT EXISTS uq_pregunta_licenciatura
    ON preguntas (id_encuesta) WHERE tipo = 'licenciatura';

CREATE TABLE IF NOT EXISTS opciones_pregunta (
    id_opcion   SERIAL PRIMARY KEY,
    id_pregunta INT NOT NULL,
    texto       VARCHAR(300) NOT NULL,
    orden       INT NOT NULL,
    -- Vínculo opcional con un club, para recomendar clubes tras la encuesta.
    -- Si el club se elimina, el vínculo queda en NULL sin perder la respuesta.
    id_club     INT,
    -- Marca de la opción especial «Otro»: la última opción de respuesta, con
    -- un texto libre que escribe el alumno. La identifica esta propiedad y
    -- no su texto: una opción normal escrita a mano como «Otro» es otra cosa.
    es_otro     BOOLEAN NOT NULL DEFAULT false,
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
    -- Encuesta anónima POR DISEÑO, no por convención: no existe columna para
    -- nombre ni para matrícula, así que la identidad no se puede guardar ni
    -- por accidente desde la API. La versión anterior de esta tabla traía
    -- nombre/matricula/carrera opcionales; se quitaron porque una encuesta de
    -- intereses no necesita saber quién respondió, sólo qué le gusta, y pedir
    -- identidad bajaba la tasa de respuesta.
    --
    -- Lo único que se conserva del alumno es la licenciatura, para segmentar
    -- resultados. Va como FK y no como texto: así no se puede escribir nada que
    -- no sea un programa real del catálogo (ver cat_licenciaturas).
    id_licenciatura INT,
    fecha_envio  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- RESTRICT: no se puede borrar una encuesta que ya tenga respuestas
    CONSTRAINT fk_respuesta_encuesta     FOREIGN KEY (id_encuesta) REFERENCES encuestas(id_encuesta) ON DELETE RESTRICT,
    CONSTRAINT fk_respuesta_licenciatura FOREIGN KEY (id_licenciatura) REFERENCES cat_licenciaturas(id_licenciatura) ON DELETE RESTRICT
);

-- Misma razón que en formularios: estas columnas no se pueden migrar sin
-- adivinar (las filas viejas guardan abreviaturas, y una traía un programa que
-- ni siquiera está en el catálogo), así que se descartan en vez de migrarse.
-- Primero los constraints: dropear 'matricula' se lleva por delante cualquier
-- índice o CHECK que la use, y el orden explícito evita depender de eso.
ALTER TABLE respuestas_encuesta DROP CONSTRAINT IF EXISTS chk_respuesta_matricula;
ALTER TABLE respuestas_encuesta DROP CONSTRAINT IF EXISTS uq_respuesta_matricula;
ALTER TABLE respuestas_encuesta DROP COLUMN IF EXISTS nombre;
ALTER TABLE respuestas_encuesta DROP COLUMN IF EXISTS matricula;
ALTER TABLE respuestas_encuesta DROP COLUMN IF EXISTS carrera;
ALTER TABLE respuestas_encuesta ADD COLUMN IF NOT EXISTS id_licenciatura INT
    REFERENCES cat_licenciaturas(id_licenciatura) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS detalle_respuestas (
    id_detalle   SERIAL PRIMARY KEY,
    id_respuesta INT NOT NULL,
    id_pregunta  INT NOT NULL,
    -- Exactamente uno de estos tres por fila. Opción múltiple genera una fila
    -- por opción marcada; texto y escala generan una sola.
    id_opcion    INT,
    texto        TEXT,
    numero       INT,
    -- Texto libre de la opción especial «Otro». Vive en su propia columna para
    -- no tocar el CHECK de «un valor por fila»: la fila de la opción «Otro»
    -- lleva el id de la opción (el valor) y aquí el texto que escribió el
    -- alumno. Sólo se rellena en esa fila.
    texto_otro   TEXT,
    CONSTRAINT chk_detalle_valor CHECK (num_nonnulls(id_opcion, texto, numero) = 1),
    CONSTRAINT chk_detalle_texto CHECK (char_length(texto) <= 2000),
    CONSTRAINT chk_detalle_texto_otro CHECK (texto_otro IS NULL OR char_length(texto_otro) <= 200),
    CONSTRAINT fk_detalle_respuesta FOREIGN KEY (id_respuesta) REFERENCES respuestas_encuesta(id_respuesta) ON DELETE CASCADE,
    -- Integridad histórica: con respuestas registradas, ni la pregunta ni la
    -- opción se pueden borrar (RESTRICT, no CASCADE).
    CONSTRAINT fk_detalle_pregunta  FOREIGN KEY (id_pregunta) REFERENCES preguntas(id_pregunta) ON DELETE RESTRICT,
    CONSTRAINT fk_detalle_opcion    FOREIGN KEY (id_opcion, id_pregunta) REFERENCES opciones_pregunta(id_opcion, id_pregunta) ON DELETE RESTRICT
);

-- Columnas de la opción especial «Otro».
--
-- Van aquí como ALTER (idempotentes) y no sólo dentro del CREATE TABLE porque
-- `CREATE TABLE IF NOT EXISTS` no altera una tabla que ya existe: sin esto, una
-- base con el módulo ya aplicado se quedaría sin las columnas al volver a
-- ejecutar schema.sql y el índice de más abajo fallaría.
ALTER TABLE opciones_pregunta
    ADD COLUMN IF NOT EXISTS es_otro BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE detalle_respuestas
    ADD COLUMN IF NOT EXISTS texto_otro TEXT;

ALTER TABLE detalle_respuestas
    DROP CONSTRAINT IF EXISTS chk_detalle_texto_otro;

ALTER TABLE detalle_respuestas
    ADD CONSTRAINT chk_detalle_texto_otro CHECK (texto_otro IS NULL OR char_length(texto_otro) <= 200);

-- Índices para las consultas de resultados
CREATE INDEX IF NOT EXISTS idx_preguntas_encuesta        ON preguntas(id_encuesta);
CREATE INDEX IF NOT EXISTS idx_opciones_pregunta        ON opciones_pregunta(id_pregunta);
CREATE INDEX IF NOT EXISTS idx_opciones_club            ON opciones_pregunta(id_club) WHERE id_club IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_encuestas_estado         ON encuestas(estado);
CREATE INDEX IF NOT EXISTS idx_respuestas_encuesta_fecha ON respuestas_encuesta(id_encuesta, fecha_envio);
CREATE INDEX IF NOT EXISTS idx_detalle_respuesta        ON detalle_respuestas(id_respuesta);
CREATE INDEX IF NOT EXISTS idx_detalle_pregunta         ON detalle_respuestas(id_pregunta);
CREATE INDEX IF NOT EXISTS idx_detalle_opcion           ON detalle_respuestas(id_opcion) WHERE id_opcion IS NOT NULL;
-- Segmentación de resultados por programa (el único dato del alumno que se guarda)
CREATE INDEX IF NOT EXISTS idx_respuestas_licenciatura  ON respuestas_encuesta(id_licenciatura) WHERE id_licenciatura IS NOT NULL;

-- Una misma opción no se marca dos veces en una respuesta
CREATE UNIQUE INDEX IF NOT EXISTS uq_detalle_opcion ON detalle_respuestas(id_respuesta, id_pregunta, id_opcion) WHERE id_opcion IS NOT NULL;
-- Un texto o una escala no se repite para la misma pregunta
CREATE UNIQUE INDEX IF NOT EXISTS uq_detalle_texto_numero ON detalle_respuestas(id_respuesta, id_pregunta) WHERE id_opcion IS NULL;

-- Una sola opción «Otro» por pregunta (mismo criterio que la pregunta
-- única de licenciatura): es lo que permite que el formulario ofrezca el
-- texto libre una sola vez.
CREATE UNIQUE INDEX IF NOT EXISTS uq_opcion_otro ON opciones_pregunta(id_pregunta) WHERE es_otro;
-- Lectura de los textos libres de «Otro» en los resultados
CREATE INDEX IF NOT EXISTS idx_detalle_texto_otro ON detalle_respuestas(id_pregunta) WHERE texto_otro IS NOT NULL;

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
--
-- OJO: esto NO protege las encuestas por sí solo. Como la conexión salta RLS,
-- la única barrera real es que cada endpoint de routes/encuestas.js aplique
-- authenticate + requireRole en el prefijo /admin. Un endpoint nuevo sin esa
-- línea queda abierto y nada en la base de datos lo detecta.
ALTER TABLE encuestas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE preguntas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE opciones_pregunta   ENABLE ROW LEVEL SECURITY;
ALTER TABLE respuestas_encuesta ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_respuestas  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MODULO ASISTENCIA V1 (PBI-05) — integra al arranque
-- ============================================================
-- Extraido de migrations/migrate-asistencia-v1.sql (idempotente y sin
-- operaciones destructivas): se aplica en cada arranque via schema.sql,
-- el sistema de esquema existente. La migracion original se conserva
-- como referencia/manual para bases que requieran el modulo sin reiniciar.
-- Regla de negocio clave (PBI-05 §23, §24, §32): cada sesion conserva su
-- integrantes_snapshot (JSONB); las sesiones iniciadas/completadas/
-- canceladas son inmutables y las 'pendiente' refrescan el snapshot con
-- filtro de fechas (§24). Estados derivados §17–§19 se calculan en lectura.
-- ============================================================

-- 1. Periodos de actividad (cuatrimestres con fechas)
--    Las fechas institucionales exactas se configuran por la
--    institución (ver plantilla comentada en seed.sql).
CREATE TABLE IF NOT EXISTS periodos_actividad (
    id_periodo SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    activo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_periodos_fechas UNIQUE (fecha_inicio, fecha_fin)
);

CREATE INDEX IF NOT EXISTS idx_periodos_actividad_fechas
    ON periodos_actividad (fecha_inicio, fecha_fin);

-- 2. Sesiones: instancias concretas derivadas de horarios_club
--    ON DELETE RESTRICT preserva el historial (no se borran en cascada).
CREATE TABLE IF NOT EXISTS sesiones (
    id_sesion SERIAL PRIMARY KEY,
    id_club INT NOT NULL REFERENCES clubes (id_club) ON DELETE RESTRICT,
    id_periodo INT NOT NULL REFERENCES periodos_actividad (id_periodo) ON DELETE RESTRICT,
    id_horario INT NOT NULL REFERENCES horarios_club (id_horario) ON DELETE RESTRICT,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    lugar VARCHAR(255) NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'pendiente'
        CONSTRAINT chk_sesion_estado CHECK (estado IN (
            'pendiente', 'en_progreso', 'completada', 'cancelada'
        )),
    iniciada_en TIMESTAMPTZ,
    finalizada_en TIMESTAMPTZ,
    cancelada_en TIMESTAMPTZ,
    motivo_cancelacion VARCHAR(50),
    observacion_cancelacion TEXT,
    cancelada_por INT REFERENCES usuarios (id_usuario) ON DELETE SET NULL,
    integrantes_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_sesion_horario_fecha UNIQUE (id_horario, fecha)
);

CREATE INDEX IF NOT EXISTS idx_sesiones_club_fecha ON sesiones (id_club, fecha);
CREATE INDEX IF NOT EXISTS idx_sesiones_periodo ON sesiones (id_periodo);
CREATE INDEX IF NOT EXISTS idx_sesiones_estado ON sesiones (estado);
CREATE INDEX IF NOT EXISTS idx_sesiones_club_periodo ON sesiones (id_club, id_periodo);

-- Nota técnica sobre estados 'no_registrada' y 'no_completada' (PBI-05 §17–§19):
--   Se calculan EN TIEMPO DE LECTURA a partir de fecha vs fecha institucional
--   (pendiente + fecha pasada => no_registrada; en_progreso + fecha pasada =>
--   no_completada). No requieren proceso programado y no se almacenan.

-- 3. Registros de asistencia (integrante × sesión)
--    ON DELETE RESTRICT: el historial de asistencia nunca se elimina en cascada.
CREATE TABLE IF NOT EXISTS asistencias (
    id_asistencia SERIAL PRIMARY KEY,
    id_sesion INT NOT NULL REFERENCES sesiones (id_sesion) ON DELETE RESTRICT,
    id_usuario INT NOT NULL REFERENCES usuarios (id_usuario) ON DELETE RESTRICT,
    estado VARCHAR(20) NOT NULL
        CONSTRAINT chk_asistencia_estado CHECK (estado IN ('presente', 'ausente', 'justificado')),
    motivo_justificacion TEXT,
    registrada_en TIMESTAMPTZ DEFAULT NOW(),
    actualizada_en TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_asistencia_sesion_usuario UNIQUE (id_sesion, id_usuario)
);

CREATE INDEX IF NOT EXISTS idx_asistencias_sesion ON asistencias (id_sesion);
CREATE INDEX IF NOT EXISTS idx_asistencias_usuario ON asistencias (id_usuario);

CREATE OR REPLACE FUNCTION fn_actualizar_asistencia_ts()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizada_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_asistencia ON asistencias;
CREATE TRIGGER trg_actualizar_asistencia
    BEFORE UPDATE ON asistencias
    FOR EACH ROW
    EXECUTE FUNCTION fn_actualizar_asistencia_ts();

-- 4. Catálogo de motivos de cancelación
CREATE TABLE IF NOT EXISTS cat_motivos_cancelacion (
    codigo VARCHAR(50) PRIMARY KEY,
    descripcion VARCHAR(100) NOT NULL,
    orden INT DEFAULT 0
);

INSERT INTO cat_motivos_cancelacion (codigo, descripcion, orden) VALUES
    ('evento_institucional', 'Evento institucional', 1),
    ('clima', 'Condiciones climáticas', 2),
    ('instalaciones', 'Instalaciones no disponibles', 3),
    ('ausencia_responsable', 'Ausencia del responsable', 4),
    ('dia_inhabil', 'Día inhábil o suspensión institucional', 5),
    ('otro', 'Otro', 99)
ON CONFLICT (codigo) DO NOTHING;

-- 5. Función idempotente: genera las sesiones de un club para un periodo
--    a partir de los horarios oficiales (horarios_club), capturando el
--    SNAPSHOT de integrantes elegibles al momento de la generación.
--
--    Elegibles = inscripción activa + rol alumno + cuenta no borrada.
--    Cubre ambos caminos de incorporación: oferta aceptada (RF-08) e
--    inscripción directa (RF-03). Matrícula: formulario si existe, si no
--    institutional_id de usuarios.
CREATE OR REPLACE FUNCTION generar_sesiones_periodo_club(p_id_periodo INT, p_id_club INT)
RETURNS INT AS $$
DECLARE
    v_horario RECORD;
    v_fecha DATE;
    v_dia_semana INT;
    v_inicio DATE;
    v_fin DATE;
    v_snapshot JSONB;
    v_creadas INT := 0;
BEGIN
    SELECT fecha_inicio, fecha_fin
    INTO v_inicio, v_fin
    FROM periodos_actividad
    WHERE id_periodo = p_id_periodo;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Periodo no encontrado: %', p_id_periodo;
    END IF;

    -- Snapshot inicial de elegibles AHORA. Es solo el valor de entrada para
    -- las filas recién creadas: el refresco de abajo recalcula cualquier
    -- sesión 'pendiente' con el filtro de fechas de §24 en esta misma corrida.
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id_usuario', u.id_usuario,
                'nombre_completo', u.nombre_completo,
                'matricula', COALESCE(f.matricula, u.institutional_id, ''),
                'licenciatura', COALESCE(l.nombre, '')
            )
            ORDER BY u.nombre_completo
        ),
        '[]'::jsonb
    )
    INTO v_snapshot
    FROM inscripciones i
    JOIN usuarios u ON u.id_usuario = i.id_usuario
    LEFT JOIN LATERAL (
        SELECT fo.matricula, fo.id_licenciatura
        FROM formularios fo
        WHERE fo.id_alumno = u.id_usuario
          AND fo.id_club = i.id_club
          AND fo.status = 'Miembro oficial'
        ORDER BY fo.fecha_envio DESC
        LIMIT 1
    ) f ON TRUE
    LEFT JOIN cat_licenciaturas l ON l.id_licenciatura = f.id_licenciatura
    WHERE i.id_club = p_id_club
      AND i.id_estatus_inscripcion = 1
      AND u.id_rol = 1
      AND u.deleted_at IS NULL;

    FOR v_horario IN SELECT * FROM horarios_club WHERE id_club = p_id_club LOOP
        v_dia_semana := v_horario.dia_semana;

        -- Primera ocurrencia del día dentro del periodo
        -- EXTRACT(DOW): 0=Domingo … 6=Sábado (misma convención que dia_semana)
        v_fecha := v_inicio;
        WHILE EXTRACT(DOW FROM v_fecha)::INT != v_dia_semana LOOP
            v_fecha := v_fecha + INTERVAL '1 day';
        END LOOP;

        WHILE v_fin >= v_fecha LOOP
            INSERT INTO sesiones (
                id_club, id_periodo, id_horario, fecha,
                hora_inicio, hora_fin, lugar, integrantes_snapshot
            )
            VALUES (
                p_id_club, p_id_periodo, v_horario.id_horario, v_fecha,
                v_horario.hora_inicio, v_horario.hora_fin, v_horario.lugar, v_snapshot
            )
            ON CONFLICT (id_horario, fecha) DO NOTHING;
            GET DIAGNOSTICS v_creadas = ROW_COUNT;

            v_fecha := v_fecha + INTERVAL '7 days';
        END LOOP;
    END LOOP;

    -- Refresco de snapshots 'pendiente' (PBI-05 §23–§24).
    --   Una sesión solo se modifica mientras nadie haya iniciado la toma:
    --   'pendiente' = sin registros de asistencia que proteger. Al recomputar
    --   se aplican las reglas de fechas:
    --     * fecha_inscripcion::date < fecha de la sesión  → quien se incorpora
    --       un día con sesión NO entra retroactivamente a esa lista, sino a
    --       partir de la siguiente (§24);
    --     * fecha_baja aún no ocurrida respecto a la fecha de la sesión →
    --       las bajas conservan las listas anteriores a su baja (§23).
    --   Sesiones 'en_progreso', 'completada' o 'cancelada' jamás se tocan
    --   (§15: integridad histórica y estabilidad de la toma en curso).
    --   Solo se reescribe si el snapshot efectivamente cambió.
    --   CURRENT_DATE y los cast ::date se resuelven en la zona institucional
    --   porque el pool abre cada conexión con TimeZone=America/Merida.
    WITH candidatas AS (
        SELECT s.id_sesion,
               (
                   SELECT COALESCE(
                       jsonb_agg(
                           jsonb_build_object(
                               'id_usuario', u.id_usuario,
                               'nombre_completo', u.nombre_completo,
                               'matricula', COALESCE(f.matricula, u.institutional_id, ''),
                               'licenciatura', COALESCE(l.nombre, '')
                           )
                           ORDER BY u.nombre_completo
                       ),
                       '[]'::jsonb
                   )
                   FROM inscripciones i
                   JOIN usuarios u ON u.id_usuario = i.id_usuario
                   LEFT JOIN LATERAL (
                       SELECT fo.matricula, fo.id_licenciatura
                       FROM formularios fo
                       WHERE fo.id_alumno = u.id_usuario
                         AND fo.id_club = s.id_club
                         AND fo.status = 'Miembro oficial'
                       ORDER BY fo.fecha_envio DESC
                       LIMIT 1
                   ) f ON TRUE
                   LEFT JOIN cat_licenciaturas l ON l.id_licenciatura = f.id_licenciatura
                   WHERE i.id_club = s.id_club
                     AND u.id_rol = 1
                     AND u.deleted_at IS NULL
                     AND (i.id_estatus_inscripcion = 1 OR i.fecha_baja IS NOT NULL)
                     AND i.fecha_inscripcion::date < s.fecha
                     AND (i.fecha_baja IS NULL OR i.fecha_baja::date >= s.fecha)
               ) AS nuevo_snapshot
        FROM sesiones s
        WHERE s.id_club = p_id_club
          AND s.id_periodo = p_id_periodo
          AND s.estado = 'pendiente'
    )
    UPDATE sesiones s
    SET integrantes_snapshot = c.nuevo_snapshot
    FROM candidatas c
    WHERE s.id_sesion = c.id_sesion
      AND s.integrantes_snapshot IS DISTINCT FROM c.nuevo_snapshot;

    RETURN v_creadas;
END;
$$ LANGUAGE plpgsql;

-- 6. Vista auxiliar: sesiones con conteos derivados del snapshot
CREATE OR REPLACE VIEW v_sesiones_con_integrantes AS
SELECT s.*,
       jsonb_array_length(s.integrantes_snapshot) AS total_integrantes,
       (SELECT COUNT(*) FROM asistencias a WHERE a.id_sesion = s.id_sesion) AS registradas
FROM sesiones s;

-- Publicaciones propias del mural, independientes del feed de noticias.
CREATE TABLE IF NOT EXISTS publicaciones_mural (
    id_publicacion SERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    subtitulo VARCHAR(300),
    contenido TEXT NOT NULL,
    url_imagen VARCHAR(500),
    enlace_url VARCHAR(2048),
    enlace_texto VARCHAR(80),
    publicada BOOLEAN NOT NULL DEFAULT FALSE,
    destacada BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_retiro DATE,
    id_autor INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Flujo de aprobación previa para publicaciones del mural.
-- El rol responsable_mural crea y edita; Coordinación (admin) aprueba o devuelve.
ALTER TABLE publicaciones_mural ADD COLUMN IF NOT EXISTS status VARCHAR(20);
ALTER TABLE publicaciones_mural ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT;
ALTER TABLE publicaciones_mural ADD COLUMN IF NOT EXISTS id_revisor INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL;
ALTER TABLE publicaciones_mural ADD COLUMN IF NOT EXISTS fecha_revision TIMESTAMPTZ;
ALTER TABLE publicaciones_mural ADD COLUMN IF NOT EXISTS enviado_revision_at TIMESTAMPTZ;

-- Migración idempotente: publicada heredado -> status.
UPDATE publicaciones_mural
SET status = CASE WHEN publicada THEN 'published' ELSE 'draft' END
WHERE status IS NULL;

ALTER TABLE publicaciones_mural ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE publicaciones_mural ALTER COLUMN status SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_mural_status') THEN
        ALTER TABLE publicaciones_mural ADD CONSTRAINT chk_mural_status
            CHECK (status IN ('draft', 'pending', 'published', 'rejected'));
    END IF;
END $$;

-- Invariante: publicada siempre refleja status (protege código anterior).
CREATE OR REPLACE FUNCTION fn_mural_espejo_publicada() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.publicada AND NEW.status = 'draft' THEN
            NEW.status := 'published';
        END IF;
    ELSIF NEW.status IS NOT DISTINCT FROM OLD.status
          AND NEW.publicada IS DISTINCT FROM OLD.publicada THEN
        NEW.status := CASE WHEN NEW.publicada THEN 'published' ELSE 'draft' END;
        IF NEW.status <> 'rejected' THEN
            NEW.motivo_rechazo := NULL;
        END IF;
    END IF;
    NEW.publicada := (NEW.status = 'published');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mural_espejo_publicada ON publicaciones_mural;
CREATE TRIGGER trg_mural_espejo_publicada
    BEFORE INSERT OR UPDATE ON publicaciones_mural
    FOR EACH ROW
    EXECUTE FUNCTION fn_mural_espejo_publicada();

CREATE INDEX IF NOT EXISTS idx_mural_status ON publicaciones_mural(status);
CREATE INDEX IF NOT EXISTS idx_mural_visibilidad ON publicaciones_mural(publicada, status, fecha_retiro);
CREATE TABLE IF NOT EXISTS configuracion_mural (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    url_publica VARCHAR(2048)
);
ALTER TABLE publicaciones_mural ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_mural ENABLE ROW LEVEL SECURITY;

-- PBI-13: horarios oficiales y propuestas revisadas por Coordinación (admin).
ALTER TABLE clubes ADD COLUMN IF NOT EXISTS version_horario INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS espacios_club (
    id_espacio SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    nombre_normalizado TEXT GENERATED ALWAYS AS (LOWER(REGEXP_REPLACE(TRIM(nombre), '\s+', ' ', 'g'))) STORED,
    CONSTRAINT uq_espacio_nombre UNIQUE (nombre_normalizado)
);
INSERT INTO espacios_club(nombre)
SELECT DISTINCT TRIM(lugar) FROM horarios_club WHERE TRIM(lugar) <> ''
ON CONFLICT (nombre_normalizado) DO NOTHING;
ALTER TABLE horarios_club ADD COLUMN IF NOT EXISTS id_espacio INT REFERENCES espacios_club(id_espacio);
ALTER TABLE horarios_club ADD COLUMN IF NOT EXISTS vigencia_inicio DATE;
ALTER TABLE horarios_club ADD COLUMN IF NOT EXISTS vigencia_fin DATE;
UPDATE horarios_club h SET id_espacio = e.id_espacio FROM espacios_club e
WHERE h.id_espacio IS NULL AND e.nombre_normalizado = LOWER(REGEXP_REPLACE(TRIM(h.lugar), '\s+', ' ', 'g'));
CREATE TABLE IF NOT EXISTS solicitudes_horario (
    id_solicitud SERIAL PRIMARY KEY,
    id_club INT NOT NULL REFERENCES clubes(id_club) ON DELETE CASCADE,
    id_solicitante INT NOT NULL REFERENCES usuarios(id_usuario),
    estado VARCHAR(15) NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'pendiente', 'aprobado', 'rechazado')),
    version_base INTEGER NOT NULL,
    detalle JSONB NOT NULL CHECK (JSONB_TYPEOF(detalle) = 'array'),
    vigencia_inicio DATE NOT NULL,
    vigencia_fin DATE,
    id_revisor INT REFERENCES usuarios(id_usuario),
    observaciones TEXT,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (vigencia_fin IS NULL OR vigencia_fin >= vigencia_inicio)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitud_horario_activa ON solicitudes_horario(id_club) WHERE estado IN ('borrador', 'pendiente');
CREATE TABLE IF NOT EXISTS historial_solicitudes_horario (
    id_historial SERIAL PRIMARY KEY,
    id_solicitud INT NOT NULL REFERENCES solicitudes_horario(id_solicitud) ON DELETE CASCADE,
    id_actor INT NOT NULL REFERENCES usuarios(id_usuario),
    accion VARCHAR(30) NOT NULL,
    observaciones TEXT,
    fecha TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE espacios_club ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_horario ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_solicitudes_horario ENABLE ROW LEVEL SECURITY;

-- PBI-12: el presidente propone; únicamente admin revisa y publica.
CREATE TABLE IF NOT EXISTS solicitudes_convocatoria (
    id_solicitud SERIAL PRIMARY KEY,
    id_club INT NOT NULL REFERENCES clubes(id_club) ON DELETE CASCADE,
    id_solicitante INT NOT NULL REFERENCES usuarios(id_usuario),
    configuracion JSONB NOT NULL,
    estado VARCHAR(15) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobado','rechazado','vencido')),
    id_revisor INT REFERENCES usuarios(id_usuario),
    observaciones TEXT,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_revision TIMESTAMPTZ
);
ALTER TABLE solicitudes_convocatoria DROP CONSTRAINT IF EXISTS solicitudes_convocatoria_estado_check;
ALTER TABLE solicitudes_convocatoria ADD CONSTRAINT solicitudes_convocatoria_estado_check CHECK (estado IN ('pendiente','aprobado','rechazado','vencido'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_convocatoria_pendiente ON solicitudes_convocatoria(id_club) WHERE estado = 'pendiente';
ALTER TABLE solicitudes_convocatoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE convocatorias ADD COLUMN IF NOT EXISTS estado_revision VARCHAR(15) NOT NULL DEFAULT 'preparacion' CHECK (estado_revision IN ('preparacion','pendiente','aprobado','rechazado','vencido'));
ALTER TABLE convocatorias DROP CONSTRAINT IF EXISTS convocatorias_estado_revision_check;
ALTER TABLE convocatorias ADD CONSTRAINT convocatorias_estado_revision_check CHECK (estado_revision IN ('preparacion','pendiente','aprobado','rechazado','vencido'));
ALTER TABLE convocatorias ADD COLUMN IF NOT EXISTS id_revisor INT REFERENCES usuarios(id_usuario);
ALTER TABLE convocatorias ADD COLUMN IF NOT EXISTS observaciones TEXT;
ALTER TABLE convocatorias ADD COLUMN IF NOT EXISTS fecha_revision TIMESTAMPTZ;
UPDATE convocatorias SET estado_revision = 'aprobado' WHERE enviada = TRUE AND estado_revision <> 'aprobado';

-- ============================================================
-- BUG-01: cada convocatoria de inscripción tiene su propio conteo.
-- Los formularios históricos se conservan, pero sólo cuentan para
-- el ciclo de inscripción al que pertenecen.
-- ============================================================
CREATE TABLE IF NOT EXISTS convocatorias_inscripcion (
    id_convocatoria_inscripcion SERIAL PRIMARY KEY,
    id_club INT NOT NULL REFERENCES clubes(id_club) ON DELETE CASCADE,
    id_solicitud INT REFERENCES solicitudes_convocatoria(id_solicitud) ON DELETE SET NULL,
    fecha_apertura_programada TIMESTAMPTZ,
    fecha_limite_cierre TIMESTAMPTZ,
    max_postulaciones INT,
    fecha_publicacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_convocatoria_inscripcion_club
    ON convocatorias_inscripcion(id_club, fecha_publicacion DESC);
ALTER TABLE convocatorias_inscripcion ENABLE ROW LEVEL SECURITY;

ALTER TABLE clubes ADD COLUMN IF NOT EXISTS id_convocatoria_inscripcion_actual INT;
ALTER TABLE formularios ADD COLUMN IF NOT EXISTS id_convocatoria_inscripcion INT;
CREATE INDEX IF NOT EXISTS idx_formularios_convocatoria_inscripcion
    ON formularios(id_convocatoria_inscripcion);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_club_convocatoria_inscripcion_actual'
    ) THEN
        ALTER TABLE clubes
            ADD CONSTRAINT fk_club_convocatoria_inscripcion_actual
            FOREIGN KEY (id_convocatoria_inscripcion_actual)
            REFERENCES convocatorias_inscripcion(id_convocatoria_inscripcion)
            ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_formulario_convocatoria_inscripcion'
    ) THEN
        ALTER TABLE formularios
            ADD CONSTRAINT fk_formulario_convocatoria_inscripcion
            FOREIGN KEY (id_convocatoria_inscripcion)
            REFERENCES convocatorias_inscripcion(id_convocatoria_inscripcion)
            ON DELETE SET NULL;
    END IF;
END $$;

-- Backfill: representa la convocatoria publicada actual de cada club.
-- La fecha de publicación es la última aprobación conocida (o la apertura).
WITH aprobada AS (
    SELECT DISTINCT ON (id_club) id_club, id_solicitud, fecha_revision
    FROM solicitudes_convocatoria
    WHERE estado = 'aprobado'
    ORDER BY id_club, fecha_revision DESC NULLS LAST, id_solicitud DESC
), nuevos AS (
    INSERT INTO convocatorias_inscripcion
        (id_club, id_solicitud, fecha_apertura_programada, fecha_limite_cierre,
         max_postulaciones, fecha_publicacion)
    SELECT cl.id_club, a.id_solicitud, cl.fecha_apertura_programada,
           cl.fecha_limite_cierre, cl.max_postulaciones,
           GREATEST(
               COALESCE(a.fecha_revision, cl.fecha_apertura_programada),
               cl.fecha_apertura_programada
           )
    FROM clubes cl
    LEFT JOIN aprobada a ON a.id_club = cl.id_club
    WHERE cl.id_convocatoria_inscripcion_actual IS NULL
      AND cl.fecha_apertura_programada IS NOT NULL
    RETURNING id_convocatoria_inscripcion, id_club
)
UPDATE clubes cl
SET id_convocatoria_inscripcion_actual = n.id_convocatoria_inscripcion
FROM nuevos n
WHERE cl.id_club = n.id_club;

-- Los formularios enviados desde la apertura del ciclo actual se enlazan a él,
-- aunque hayan llegado antes de la última aprobación del mismo periodo. Los
-- anteriores quedan sin ciclo y no cuentan para el cupo nuevo.
UPDATE formularios f
SET id_convocatoria_inscripcion = cl.id_convocatoria_inscripcion_actual
FROM clubes cl
JOIN convocatorias_inscripcion ci
  ON ci.id_convocatoria_inscripcion = cl.id_convocatoria_inscripcion_actual
WHERE f.id_club = cl.id_club
  AND f.id_convocatoria_inscripcion IS NULL
  AND f.fecha_envio >= ci.fecha_apertura_programada;

UPDATE clubes cl
SET postulaciones_actuales = (
    SELECT COUNT(*)::int
    FROM formularios f
    WHERE f.id_convocatoria_inscripcion = cl.id_convocatoria_inscripcion_actual
);

DROP VIEW IF EXISTS clubes_con_estado;

CREATE VIEW clubes_con_estado AS
SELECT
  cl.*,
  COUNT(f.id_formulario)::int AS formularios_recibidos,
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
LEFT JOIN formularios f
  ON f.id_club = cl.id_club
 AND f.id_convocatoria_inscripcion = cl.id_convocatoria_inscripcion_actual
GROUP BY cl.id_club;
