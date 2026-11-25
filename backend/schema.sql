-- ============================================================
-- SCHEMA COMPLETO — CLUBS UNID
-- ============================================================
-- Archivo consolidado con la estructura actual del proyecto.
-- Incluye clubes, actividades, registros y publicaciones compartidas.
--
-- AVISO: úsalo únicamente para crear una base vacía o desechable. No lo
-- ejecutes sobre una base con datos para actualizarla: contiene compatibilidad
-- histórica y backfills. Para una base existente, sigue migrations/README.md.
--
-- Uso:
--   psql -U postgres -d clubs_bd -f schema.sql
--   psql -U postgres -d clubs_bd -f seed.sql  (datos de prueba)
-- ============================================================

-- ============================================================
-- CATÁLOGOS
-- ============================================================

BEGIN;

-- Registro usado por backend/apply-migrations.js. Las migraciones históricas
-- anteriores al registro no se marcan automáticamente.
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    nombre       TEXT PRIMARY KEY,
    checksum     CHAR(64) NOT NULL,
    orden        INTEGER NOT NULL,
    aplicada_en  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    origen       TEXT NOT NULL DEFAULT 'ejecutor'
        CHECK (origen IN ('ejecutor', 'adopcion_verificada'))
);
ALTER TABLE public.schema_migrations ADD COLUMN IF NOT EXISTS orden INTEGER;
ALTER TABLE public.schema_migrations ADD COLUMN IF NOT EXISTS origen TEXT NOT NULL DEFAULT 'ejecutor';
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_schema_migrations_origen'
          AND conrelid = 'public.schema_migrations'::regclass
          AND pg_get_constraintdef(oid) ILIKE '%aplicacion_manual%'
    ) THEN
        ALTER TABLE public.schema_migrations
            DROP CONSTRAINT IF EXISTS chk_schema_migrations_origen;
        ALTER TABLE public.schema_migrations
            ADD CONSTRAINT chk_schema_migrations_origen
            CHECK (origen IN ('ejecutor', 'adopcion_verificada', 'aplicacion_manual'));
    END IF;
    IF EXISTS (SELECT 1 FROM public.schema_migrations WHERE orden IS NULL) THEN
        RAISE EXCEPTION 'El ledger de migraciones anterior no tiene orden; requiere revisión manual antes de continuar';
    END IF;
END $$;
ALTER TABLE public.schema_migrations ALTER COLUMN orden SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_schema_migrations_checksum
    ON public.schema_migrations (checksum);
CREATE UNIQUE INDEX IF NOT EXISTS uq_schema_migrations_orden
    ON public.schema_migrations (orden);

CREATE TABLE IF NOT EXISTS cat_roles (
    id_rol SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(20) UNIQUE NOT NULL
);

INSERT INTO cat_roles (id_rol, nombre_rol) VALUES
    (1, 'alumno'),
    (2, 'responsable_club'),
    (3, 'admin'),
    (4, 'rectoria'),
    (5, 'vicepresidente'),
    (6, 'responsable_mural'),
    (7, 'coordinacion')
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
    orden          INT NOT NULL DEFAULT 0,
    modalidad      VARCHAR(20) NOT NULL DEFAULT 'escolarizada'
                   CONSTRAINT chk_licenciatura_modalidad CHECK (modalidad IN ('escolarizada', 'ejecutiva', 'dual', 'maestria'))
);
ALTER TABLE cat_licenciaturas ADD COLUMN IF NOT EXISTS modalidad VARCHAR(20) NOT NULL DEFAULT 'escolarizada';
ALTER TABLE cat_licenciaturas DROP CONSTRAINT IF EXISTS chk_licenciatura_modalidad;
ALTER TABLE cat_licenciaturas ADD CONSTRAINT chk_licenciatura_modalidad CHECK (modalidad IN ('escolarizada', 'ejecutiva', 'dual', 'maestria'));

INSERT INTO cat_licenciaturas (nombre, orden, modalidad) VALUES
    ('Licenciatura en Administración Empresarial', 1, 'escolarizada'),
    ('Licenciatura en Administración de Empresas Turísticas', 2, 'escolarizada'),
    ('Licenciatura en Arquitectura', 3, 'escolarizada'),
    ('Licenciatura en Ciencias y Técnicas de la Comunicación', 4, 'escolarizada'),
    ('Licenciatura en Contabilidad y Finanzas', 5, 'escolarizada'),
    ('Licenciatura en Derecho y Ciencias Jurídicas', 6, 'escolarizada'),
    ('Licenciatura en Diseño Gráfico Digital', 7, 'escolarizada'),
    ('Licenciatura en Educación Física, Recreación y Deporte', 8, 'escolarizada'),
    ('Licenciatura en Ingeniería de Software y Sistemas Computacionales', 9, 'escolarizada'),
    ('Licenciatura en Mercadotecnia Estratégica', 10, 'escolarizada'),
    -- Licenciaturas Ejecutivas: son programas distintos de los regulares, no
    -- nombres alternativos (cada uno tiene su propio RVOE: Contabilidad
    -- Financiera 20221767 vs. Contabilidad y Finanzas 20193846; Derecho
    -- 20193847 vs. Derecho y Ciencias Jurídicas 20193848). Se listan sin
    -- distinguir modalidad porque el catálogo no tiene ese campo.
    ('Licenciatura en Administración de Empresas', 11, 'ejecutiva'),
    ('Licenciatura en Contabilidad Financiera', 12, 'ejecutiva'),
    ('Licenciatura en Derecho', 13, 'ejecutiva'),
    ('Licenciatura en Educación y Tecnologías para el Aprendizaje', 14, 'ejecutiva'),
    ('Licenciatura Modelo Dual', 15, 'dual'),
    ('Licenciatura en Administración y Dirección Empresarial Modelo Dual', 16, 'dual'),
    ('Maestría en Derecho Constitucional y Amparo', 17, 'maestria')
ON CONFLICT (nombre) DO UPDATE SET orden = EXCLUDED.orden, modalidad = EXCLUDED.modalidad;

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
    id_licenciatura INT REFERENCES cat_licenciaturas(id_licenciatura) ON DELETE SET NULL,
    fecha_nacimiento DATE,
    biografia VARCHAR(500),
    fecha_nacimiento_publica BOOLEAN NOT NULL DEFAULT FALSE,
    telefono_celular VARCHAR(20),
    telefono_publico BOOLEAN NOT NULL DEFAULT FALSE,
    facebook_url VARCHAR(2048),
    x_url VARCHAR(2048),
    instagram_url VARCHAR(2048),
    sitio_web_url VARCHAR(2048),
    CONSTRAINT chk_usuarios_biografia CHECK (biografia IS NULL OR char_length(biografia) <= 500),
    CONSTRAINT chk_usuarios_telefono_perfil CHECK (telefono_celular IS NULL OR (char_length(telefono_celular) <= 20 AND telefono_celular ~ '^\+?[0-9[:space:]().-]+$' AND char_length(regexp_replace(telefono_celular, '[^0-9]', '', 'g')) BETWEEN 7 AND 15)),
    CONSTRAINT chk_usuarios_perfil_visible CHECK ((NOT fecha_nacimiento_publica OR fecha_nacimiento IS NOT NULL) AND (NOT telefono_publico OR telefono_celular IS NOT NULL)),
    CONSTRAINT chk_usuarios_enlaces_perfil CHECK (
      (facebook_url IS NULL OR lower(facebook_url) ~ '^https?://[^[:space:]]+$') AND
      (x_url IS NULL OR lower(x_url) ~ '^https?://[^[:space:]]+$') AND
      (instagram_url IS NULL OR lower(instagram_url) ~ '^https?://[^[:space:]]+$') AND
      (sitio_web_url IS NULL OR lower(sitio_web_url) ~ '^https?://[^[:space:]]+$')
    ),
    CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) REFERENCES cat_roles(id_rol) ON DELETE RESTRICT
);

-- Correo institucional: la unicidad no debe depender de mayúsculas ni espacios
-- accidentales en cuentas antiguas. La aplicación normaliza los correos nuevos.
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_correo_normalizado
    ON usuarios (lower(btrim(correo_institucional)));

CREATE INDEX IF NOT EXISTS idx_usuarios_institutional_id ON usuarios(institutional_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_deleted_at ON usuarios(deleted_at);

-- Una sola cuenta OTP recordada por navegador durante un máximo de 30 días.
-- Los secretos se guardan como hashes y pueden rotarse o revocarse al cerrar sesión.
-- La generación (32 bytes aleatorios representados como 64 hex) vincula el JWT
-- con una reactivación concreta del dispositivo. Es nullable sólo para bases
-- antiguas: sus filas sin generación se revocan y nunca se revalidan.
CREATE TABLE IF NOT EXISTS dispositivos_confiables (
    id_dispositivo BIGSERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    hash_dispositivo VARCHAR(64) NOT NULL UNIQUE,
    token_hash VARCHAR(64) NOT NULL,
    generacion VARCHAR(64),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultimo_uso TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_en TIMESTAMPTZ NOT NULL,
    revocado_en TIMESTAMPTZ,
    token_hash_anterior VARCHAR(64),
    token_anterior_expira_en TIMESTAMPTZ,
    CONSTRAINT chk_dispositivo_hash CHECK (hash_dispositivo ~ '^[a-f0-9]{64}$'),
    CONSTRAINT chk_dispositivo_token_hash CHECK (token_hash ~ '^[a-f0-9]{64}$'),
    CONSTRAINT chk_dispositivo_generacion
        CHECK (generacion IS NULL OR generacion ~ '^[a-f0-9]{64}$'),
    CONSTRAINT chk_dispositivo_token_hash_anterior
        CHECK (token_hash_anterior IS NULL OR token_hash_anterior ~ '^[a-f0-9]{64}$'),
    CONSTRAINT chk_dispositivo_gracia_token_anterior CHECK (
        (token_hash_anterior IS NULL AND token_anterior_expira_en IS NULL)
        OR
        (token_hash_anterior IS NOT NULL AND token_anterior_expira_en IS NOT NULL)
    )
);

-- Equivalente idempotente para bases existentes; ver también
-- migrations/migrate-dispositivos-confiables-generacion.sql.
ALTER TABLE dispositivos_confiables
    ADD COLUMN IF NOT EXISTS generacion VARCHAR(64),
    ADD COLUMN IF NOT EXISTS token_hash_anterior VARCHAR(64),
    ADD COLUMN IF NOT EXISTS token_anterior_expira_en TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_dispositivo_generacion'
          AND conrelid = 'dispositivos_confiables'::regclass
    ) THEN
        ALTER TABLE dispositivos_confiables
            ADD CONSTRAINT chk_dispositivo_generacion
            CHECK (generacion IS NULL OR generacion ~ '^[a-f0-9]{64}$');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_dispositivo_token_hash_anterior'
          AND conrelid = 'dispositivos_confiables'::regclass
    ) THEN
        ALTER TABLE dispositivos_confiables
            ADD CONSTRAINT chk_dispositivo_token_hash_anterior
            CHECK (token_hash_anterior IS NULL OR token_hash_anterior ~ '^[a-f0-9]{64}$');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_dispositivo_gracia_token_anterior'
          AND conrelid = 'dispositivos_confiables'::regclass
    ) THEN
        ALTER TABLE dispositivos_confiables
            ADD CONSTRAINT chk_dispositivo_gracia_token_anterior CHECK (
                (token_hash_anterior IS NULL AND token_anterior_expira_en IS NULL)
                OR
                (token_hash_anterior IS NOT NULL AND token_anterior_expira_en IS NOT NULL)
            );
    END IF;
END $$;

-- Fail-closed: un registro previo no puede renovarse ni revalidar un JWT sin
-- generación. Requerirá un nuevo OTP para reactivar la confianza del navegador.
UPDATE dispositivos_confiables
   SET revocado_en = CURRENT_TIMESTAMP
 WHERE generacion IS NULL
   AND revocado_en IS NULL;

CREATE INDEX IF NOT EXISTS idx_dispositivos_confiables_usuario
    ON dispositivos_confiables (id_usuario, expira_en);

-- Aceptación de documentos legales requerida para acceder a la plataforma.
-- La migración independiente se conserva para actualizar bases existentes.
CREATE TABLE IF NOT EXISTS aceptaciones_legales (
    id_usuario   INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    documento    VARCHAR(20) NOT NULL,
    version      VARCHAR(20) NOT NULL,
    aceptado_en  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_usuario, documento),
    CONSTRAINT chk_legal_documento CHECK (documento IN ('terminos', 'privacidad'))
);

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
    cupo_maximo INT NOT NULL CONSTRAINT chk_cupo_positivo CHECK (cupo_maximo IN (10, 15, 20, 25, 30, 40, 50)),
    lugar_actividades VARCHAR(255),
    id_responsable_club INT,
    id_vicepresidente INT,
    imagen_portada VARCHAR(255),
    id_estatus_club INT NOT NULL DEFAULT 2,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    horario VARCHAR(100) DEFAULT '',
    CONSTRAINT fk_club_presidente FOREIGN KEY (id_responsable_club) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    CONSTRAINT fk_club_vicepresidente FOREIGN KEY (id_vicepresidente) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    CONSTRAINT fk_club_estatus FOREIGN KEY (id_estatus_club) REFERENCES cat_estatus_clubes(id_estatus_club) ON DELETE RESTRICT
);

DO $$
BEGIN
  ALTER TABLE clubes DROP CONSTRAINT IF EXISTS chk_cupo_positivo;
  ALTER TABLE clubes ADD CONSTRAINT chk_cupo_positivo CHECK (cupo_maximo IN (10, 15, 20, 25, 30, 40, 50));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE clubes ADD COLUMN IF NOT EXISTS lugar_actividades VARCHAR(255);
ALTER TABLE clubes ALTER COLUMN id_estatus_club SET DEFAULT 2;

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
CREATE INDEX IF NOT EXISTS idx_inscripciones_club ON inscripciones (id_club);

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

CREATE TABLE IF NOT EXISTS avisos_reacciones (
    id_aviso INT NOT NULL REFERENCES avisos_clubes(id_aviso) ON DELETE CASCADE,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    reaccion VARCHAR(10) NOT NULL CHECK (reaccion IN ('like', 'love', 'clap')),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_aviso, id_usuario)
);

-- Eventos propios de cada club, distintos de noticias/eventos institucionales.
CREATE TABLE IF NOT EXISTS eventos_clubes (
    id_evento_club SERIAL PRIMARY KEY,
    id_club INT NOT NULL REFERENCES clubes(id_club) ON DELETE CASCADE,
    id_autor INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    fecha_evento DATE NOT NULL,
    fecha_fin_evento DATE,
    hora_evento TIME,
    lugar_evento VARCHAR(200),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_evento_club_titulo CHECK (char_length(trim(titulo)) > 0),
    CONSTRAINT chk_evento_club_descripcion CHECK (char_length(trim(descripcion)) > 0),
    CONSTRAINT chk_evento_club_fechas CHECK (fecha_fin_evento IS NULL OR fecha_fin_evento >= fecha_evento)
);
ALTER TABLE eventos_clubes ADD COLUMN IF NOT EXISTS fecha_fin_evento DATE;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_evento_club_fechas' AND conrelid = 'eventos_clubes'::regclass) THEN
        ALTER TABLE eventos_clubes ADD CONSTRAINT chk_evento_club_fechas
            CHECK (fecha_fin_evento IS NULL OR fecha_fin_evento >= fecha_evento);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_eventos_clubes_fecha
    ON eventos_clubes (id_club, fecha_evento, hora_evento, id_evento_club);

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
    respuestas_extra JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'En revisión',
    fecha_oferta TIMESTAMPTZ,
    fecha_expiracion TIMESTAMPTZ,
    fecha_respuesta TIMESTAMPTZ,
    motivo_rechazo VARCHAR(100),
    CONSTRAINT fk_formulario_alumno FOREIGN KEY (id_alumno) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    -- Preserva postulaciones y sus respuestas configurables; para retirar un
    -- club se usa su estado inactivo, no un borrado que pierda historial.
    CONSTRAINT fk_formulario_club FOREIGN KEY (id_club) REFERENCES clubes(id_club) ON DELETE RESTRICT,
    CONSTRAINT fk_formulario_licenciatura FOREIGN KEY (id_licenciatura) REFERENCES cat_licenciaturas(id_licenciatura) ON DELETE RESTRICT,
    CONSTRAINT fk_formulario_estatus FOREIGN KEY (status) REFERENCES cat_estatus_postulacion(nombre) ON DELETE RESTRICT,
    CONSTRAINT chk_bloque CHECK (bloque_asignado IN ('A', 'B', 'E')),
    CONSTRAINT chk_cuatrimestre CHECK (cuatrimestre > 0)
);
-- El catálogo es la fuente única de estados también en bases ya existentes.
ALTER TABLE formularios DROP CONSTRAINT IF EXISTS chk_status;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_formulario_estatus'
          AND conrelid = 'formularios'::regclass
    ) THEN
        ALTER TABLE formularios
            ADD CONSTRAINT fk_formulario_estatus
            FOREIGN KEY (status) REFERENCES cat_estatus_postulacion(nombre)
            ON DELETE RESTRICT;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_formularios_alumno ON formularios (id_alumno);
CREATE INDEX IF NOT EXISTS idx_formularios_club_fecha
    ON formularios (id_club, fecha_envio DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_formularios_formulario_club
    ON formularios (id_formulario, id_club);

CREATE TABLE IF NOT EXISTS club_formulario_preguntas (
    id_pregunta SERIAL PRIMARY KEY,
    id_club INT NOT NULL REFERENCES clubes(id_club) ON DELETE CASCADE,
    etiqueta VARCHAR(200) NOT NULL,
    tipo VARCHAR(30) NOT NULL DEFAULT 'texto'
        CONSTRAINT chk_club_formulario_tipo CHECK (tipo IN ('texto', 'textarea', 'numero', 'seleccion', 'fecha')),
    configuracion JSONB NOT NULL DEFAULT '{}'::jsonb,
    obligatorio BOOLEAN NOT NULL DEFAULT FALSE,
    orden INT NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM club_formulario_preguntas
        WHERE tipo IS NULL OR tipo NOT IN ('texto', 'textarea', 'numero', 'seleccion', 'fecha')
    ) THEN
        RAISE EXCEPTION 'Hay preguntas configurables con tipos desconocidos; revísalas antes de aplicar el catálogo';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_club_formulario_tipo' AND conrelid = 'club_formulario_preguntas'::regclass
    ) THEN
        ALTER TABLE club_formulario_preguntas
            ADD CONSTRAINT chk_club_formulario_tipo
            CHECK (tipo IN ('texto', 'textarea', 'numero', 'seleccion', 'fecha'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_club_formulario_preguntas_club
  ON club_formulario_preguntas(id_club, orden);
CREATE UNIQUE INDEX IF NOT EXISTS uq_club_preguntas_pregunta_club
    ON club_formulario_preguntas(id_pregunta, id_club);

-- Una respuesta configurable pertenece a un formulario y a una pregunta real.
-- Las copias de etiqueta/configuración conservan el significado histórico si
-- después se edita la pregunta; las preguntas respondidas se archivan, no se borran.
CREATE TABLE IF NOT EXISTS formulario_respuestas_extra (
    id_formulario INT NOT NULL,
    id_pregunta INT NOT NULL,
    id_club INT NOT NULL,
    etiqueta_snapshot VARCHAR(200) NOT NULL,
    tipo_snapshot VARCHAR(30) NOT NULL
        CONSTRAINT chk_formulario_respuesta_tipo_snapshot CHECK (tipo_snapshot IN ('texto', 'textarea', 'numero', 'seleccion', 'fecha')),
    configuracion_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    respuesta JSONB NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_formulario, id_pregunta),
    CONSTRAINT fk_respuesta_extra_formulario_club
        FOREIGN KEY (id_formulario, id_club)
        REFERENCES formularios(id_formulario, id_club) ON DELETE RESTRICT,
    CONSTRAINT fk_respuesta_extra_pregunta_club
        FOREIGN KEY (id_pregunta, id_club)
        REFERENCES club_formulario_preguntas(id_pregunta, id_club) ON DELETE RESTRICT
);
-- Respuestas potencialmente sensibles; se sirven a través del backend.
ALTER TABLE formulario_respuestas_extra ENABLE ROW LEVEL SECURITY;

-- El contexto de pregunta queda fijo al responder; solo la respuesta puede
-- corregirse sin cambiar la interpretación histórica.
CREATE OR REPLACE FUNCTION fn_proteger_snapshot_respuesta_extra()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF ROW(NEW.id_formulario, NEW.id_pregunta, NEW.id_club, NEW.etiqueta_snapshot,
           NEW.tipo_snapshot, NEW.configuracion_snapshot, NEW.creado_en)
       IS DISTINCT FROM
       ROW(OLD.id_formulario, OLD.id_pregunta, OLD.id_club, OLD.etiqueta_snapshot,
           OLD.tipo_snapshot, OLD.configuracion_snapshot, OLD.creado_en) THEN
        RAISE EXCEPTION 'El contexto histórico de la respuesta configurable no se puede cambiar';
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_proteger_snapshot_respuesta_extra ON formulario_respuestas_extra;
CREATE TRIGGER trg_proteger_snapshot_respuesta_extra
    BEFORE UPDATE OF id_formulario, id_pregunta, id_club, etiqueta_snapshot,
                     tipo_snapshot, configuracion_snapshot, creado_en
    ON formulario_respuestas_extra
    FOR EACH ROW EXECUTE FUNCTION fn_proteger_snapshot_respuesta_extra();

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM formulario_respuestas_extra
        WHERE tipo_snapshot IS NULL OR tipo_snapshot NOT IN ('texto', 'textarea', 'numero', 'seleccion', 'fecha')
    ) THEN
        RAISE EXCEPTION 'Hay respuestas configurables con tipos desconocidos; revísalas antes de aplicar el catálogo';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_formulario_respuesta_tipo_snapshot'
          AND conrelid = 'formulario_respuestas_extra'::regclass
    ) THEN
        ALTER TABLE formulario_respuestas_extra
            ADD CONSTRAINT chk_formulario_respuesta_tipo_snapshot
            CHECK (tipo_snapshot IN ('texto', 'textarea', 'numero', 'seleccion', 'fecha'));
    END IF;
END $$;

CREATE OR REPLACE FUNCTION fn_bloquear_reasignacion_con_respuestas_extra()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.id_club IS DISTINCT FROM OLD.id_club THEN
        IF TG_TABLE_NAME = 'formularios' THEN
            IF OLD.respuestas_extra <> '{}'::jsonb THEN
                RAISE EXCEPTION 'No se puede mover de club un formulario que ya tiene respuestas configurables';
            END IF;
        ELSIF TG_TABLE_NAME = 'club_formulario_preguntas' THEN
            IF EXISTS (
                   SELECT 1 FROM formularios f
                   WHERE f.id_club = OLD.id_club AND f.respuestas_extra ? OLD.id_pregunta::text
               ) THEN
                RAISE EXCEPTION 'No se puede mover de club una pregunta que ya tiene respuestas';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_formulario_club_respuestas_extra ON formularios;
CREATE TRIGGER trg_formulario_club_respuestas_extra
    BEFORE UPDATE OF id_club ON formularios
    FOR EACH ROW EXECUTE FUNCTION fn_bloquear_reasignacion_con_respuestas_extra();
DROP TRIGGER IF EXISTS trg_pregunta_club_respuestas_extra ON club_formulario_preguntas;
CREATE TRIGGER trg_pregunta_club_respuestas_extra
    BEFORE UPDATE OF id_club ON club_formulario_preguntas
    FOR EACH ROW EXECUTE FUNCTION fn_bloquear_reasignacion_con_respuestas_extra();

-- La columna JSON se conserva para historial/compatibilidad, pero ya no puede
-- recibir claves nuevas sin una pregunta del mismo club.
CREATE OR REPLACE FUNCTION fn_validar_json_respuestas_extra()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.respuestas_extra IS NOT DISTINCT FROM OLD.respuestas_extra THEN
        RETURN NEW;
    END IF;
    IF jsonb_typeof(NEW.respuestas_extra) <> 'object' THEN
        RAISE EXCEPTION 'respuestas_extra debe ser un objeto JSON';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM jsonb_object_keys(NEW.respuestas_extra) AS dato(clave)
        LEFT JOIN club_formulario_preguntas p
          ON p.id_pregunta::text = dato.clave
         AND p.id_club = NEW.id_club
        WHERE dato.clave !~ '^[0-9]+$' OR p.id_pregunta IS NULL
    ) THEN
        RAISE EXCEPTION 'Cada clave de respuestas_extra debe identificar una pregunta del club del formulario';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_json_respuestas_extra ON formularios;
CREATE TRIGGER trg_validar_json_respuestas_extra
    BEFORE INSERT OR UPDATE OF respuestas_extra ON formularios
    FOR EACH ROW EXECUTE FUNCTION fn_validar_json_respuestas_extra();

CREATE INDEX IF NOT EXISTS idx_formulario_respuestas_extra_pregunta
    ON formulario_respuestas_extra(id_pregunta);

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
    id_responsable_club INT,
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
-- armó con migrations_legacy/ en otro orden. schema.sql se usa manualmente
-- para inicializar una base vacía; no se ejecuta al arrancar. Incluye bloques
-- históricos de compatibilidad que requieren revisión antes de una reaplicación.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_formulario_convocatoria' AND conrelid='formularios'::regclass
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

CREATE TABLE IF NOT EXISTS club_chat_mensajes (
    id_mensaje BIGSERIAL PRIMARY KEY,
    id_club INT NOT NULL REFERENCES clubes(id_club) ON DELETE CASCADE,
    id_autor INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    contenido VARCHAR(400) NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    editado_en TIMESTAMPTZ,
    eliminado BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_club_chat_mensajes_lista ON club_chat_mensajes(id_club, id_mensaje DESC);
CREATE INDEX IF NOT EXISTS idx_club_chat_mensajes_autor ON club_chat_mensajes(id_club, id_autor, creado_en DESC);

CREATE TABLE IF NOT EXISTS club_chat_menciones (
    id_mensaje BIGINT NOT NULL REFERENCES club_chat_mensajes(id_mensaje) ON DELETE CASCADE,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    PRIMARY KEY (id_mensaje, id_usuario)
);

CREATE TABLE IF NOT EXISTS club_chat_fijados (
    id_mensaje BIGINT PRIMARY KEY REFERENCES club_chat_mensajes(id_mensaje) ON DELETE CASCADE,
    id_fijado_por INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS club_chat_silencios (
    id_club INT NOT NULL REFERENCES clubes(id_club) ON DELETE CASCADE,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_moderador INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    silenciado_hasta TIMESTAMPTZ,
    PRIMARY KEY (id_club, id_usuario)
);
ALTER TABLE club_chat_silencios ADD COLUMN IF NOT EXISTS silenciado_hasta TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS club_chat_presencia (
    id_club INT NOT NULL REFERENCES clubes(id_club) ON DELETE CASCADE,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    ultima_actividad TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    escribiendo_hasta TIMESTAMPTZ,
    PRIMARY KEY (id_club, id_usuario)
);

CREATE TABLE IF NOT EXISTS club_chat_lecturas (
    id_club INT NOT NULL REFERENCES clubes(id_club) ON DELETE CASCADE,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    ultimo_mensaje_id BIGINT NOT NULL DEFAULT 0,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id_club, id_usuario)
);

CREATE TABLE IF NOT EXISTS club_chat_notificaciones (
    id_notificacion INT PRIMARY KEY REFERENCES notificaciones(id_notificacion) ON DELETE CASCADE,
    id_mensaje BIGINT NOT NULL REFERENCES club_chat_mensajes(id_mensaje) ON DELETE CASCADE,
    id_destinatario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_chat_notificaciones_mensaje_destinatario
    ON club_chat_notificaciones (id_mensaje, id_destinatario);

CREATE TABLE IF NOT EXISTS historial_admin (
    id_historial SERIAL PRIMARY KEY,
    id_admin INT,
    admin_nombre VARCHAR(150) NOT NULL,
    accion VARCHAR(50) NOT NULL,
    descripcion TEXT NOT NULL,
    entidad_tipo VARCHAR(50),
    entidad_id INT,
    detalles JSONB,
    fecha TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_historial_admin FOREIGN KEY (id_admin) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_club_id_responsable_club ON clubes (id_responsable_club) WHERE id_responsable_club IS NOT NULL;

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
    contenido JSONB NOT NULL,
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
    CONSTRAINT fk_noticia_autor FOREIGN KEY (id_autor) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    CONSTRAINT chk_noticia_contenido_documento CHECK (
        jsonb_typeof(contenido) = 'object'
        AND contenido->>'version' = '1'
        AND jsonb_typeof(contenido->'blocks') = 'array'
    )
);

CREATE OR REPLACE FUNCTION fn_noticia_texto_plano(documento JSONB)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT COALESCE(string_agg(bloque->>'text', E'\n' ORDER BY posicion), '')
    FROM jsonb_array_elements(documento->'blocks') WITH ORDINALITY AS b(bloque, posicion)
    WHERE bloque->>'type' IN ('paragraph', 'heading');
$$;

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
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_noticia_categoria' AND conrelid='noticias'::regclass) THEN
        ALTER TABLE noticias
            ADD CONSTRAINT chk_noticia_categoria CHECK (categoria IN ('promocion', 'evento', 'informativo'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_noticia_periodo_evento' AND conrelid='noticias'::regclass) THEN
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
           NULLIF(CONCAT_WS(E'\n', CASE WHEN fn_noticia_texto_plano(noticias.contenido) <> titulo
                                        THEN fn_noticia_texto_plano(noticias.contenido) END,
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
DECLARE definicion TEXT;
BEGIN
    SELECT pg_get_constraintdef(oid) INTO definicion FROM pg_constraint
    WHERE conname='chk_noticia_categoria_evento' AND conrelid='noticias'::regclass;
    IF definicion LIKE '%examen%' OR definicion LIKE '%general%' THEN
        ALTER TABLE noticias DROP CONSTRAINT chk_noticia_categoria_evento;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_noticia_categoria_evento' AND conrelid='noticias'::regclass) THEN
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
-- para no romper a los lectores actuales: panel, `/eventos`,
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
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_noticia_status' AND conrelid='noticias'::regclass) THEN
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
    CONSTRAINT fk_historial_formulario FOREIGN KEY (id_formulario) REFERENCES formularios(id_formulario) ON DELETE RESTRICT
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
-- Acceso por enlace /encuesta/:slug; cada encuesta define si es pública
-- anónima o institucional autenticada.
-- La URL usa 'slug' (aleatorio, no adivinable), nunca 'id_encuesta'.
-- El slug no reemplaza la autenticación de encuestas institucionales.
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
    -- publico_anonimo: acceso por enlace, sin identidad.
    -- institucional: requiere sesión UNID y conserva id_usuario en la respuesta.
    tipo_privacidad        VARCHAR(24) NOT NULL DEFAULT 'publico_anonimo',
    id_creador             INT NOT NULL,
    fecha_creacion         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Longitud mínima de 16: impide slugs adivinables tipo 'encuesta-1'
    CONSTRAINT chk_encuesta_slug      CHECK (slug ~ '^[a-z0-9-]{16,64}$'),
    CONSTRAINT chk_encuesta_estado    CHECK (estado IN ('borrador', 'publicada', 'cerrada')),
    CONSTRAINT chk_encuesta_privacidad CHECK (tipo_privacidad IN ('publico_anonimo', 'institucional')),
    -- Vigencia opcional; si se define ambos extremos, el fin va después del inicio
    CONSTRAINT chk_encuesta_vigencia  CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin > fecha_inicio),
    CONSTRAINT fk_encuesta_creador    FOREIGN KEY (id_creador) REFERENCES usuarios(id_usuario) ON DELETE RESTRICT
);

-- Compatibilidad para bases instaladas antes de la opción de privacidad.
-- Las encuestas existentes se mantienen públicas y anónimas.
ALTER TABLE encuestas
    ADD COLUMN IF NOT EXISTS tipo_privacidad VARCHAR(24) NOT NULL DEFAULT 'publico_anonimo';
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_encuesta_privacidad'
          AND conrelid = 'encuestas'::regclass
    ) THEN
        ALTER TABLE encuestas ADD CONSTRAINT chk_encuesta_privacidad
            CHECK (tipo_privacidad IN ('publico_anonimo', 'institucional'));
    END IF;
END $$;

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
-- borrarla. Si una base anterior conserva la columna, se deja intacta para no
-- perder configuración histórica; las preguntas nuevas ya no la usan.

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
    -- Solo se captura identidad en modo institucional. Las respuestas
    -- históricas y las públicas anónimas mantienen NULL; no se inventa
    -- identidad para registros antiguos.
    id_licenciatura INT,
    -- NULL para encuestas públicas anónimas; obligatorio por API para
    -- encuestas institucionales. No se backfillea identidad en respuestas viejas.
    id_usuario INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    fecha_envio  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- RESTRICT: no se puede borrar una encuesta que ya tenga respuestas
    CONSTRAINT fk_respuesta_encuesta     FOREIGN KEY (id_encuesta) REFERENCES encuestas(id_encuesta) ON DELETE RESTRICT,
    CONSTRAINT fk_respuesta_licenciatura FOREIGN KEY (id_licenciatura) REFERENCES cat_licenciaturas(id_licenciatura) ON DELETE RESTRICT
);
ALTER TABLE respuestas_encuesta
    ADD COLUMN IF NOT EXISTS id_usuario INT
    REFERENCES usuarios(id_usuario) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_respuesta_encuesta_usuario
    ON respuestas_encuesta (id_encuesta, id_usuario)
    WHERE id_usuario IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_respuestas_encuesta_usuario
    ON respuestas_encuesta (id_usuario)
    WHERE id_usuario IS NOT NULL;

-- La API aplica estas reglas también en PostgreSQL para cualquier ruta de escritura.
DO $$
DECLARE
    v_id_encuesta INTEGER;
    v_id_respuesta INTEGER;
BEGIN
    SELECT e.id_encuesta, r.id_respuesta
      INTO v_id_encuesta, v_id_respuesta
    FROM encuestas e
    JOIN respuestas_encuesta r ON r.id_encuesta = e.id_encuesta
    WHERE e.tipo_privacidad = 'publico_anonimo'
      AND r.id_usuario IS NOT NULL
    ORDER BY e.id_encuesta, r.id_respuesta
    LIMIT 1;

    IF v_id_respuesta IS NOT NULL THEN
        RAISE EXCEPTION
          'Migración detenida: la respuesta % de la encuesta anónima % conserva identidad; revisa el caso sin cambiar respuestas',
          v_id_respuesta, v_id_encuesta;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION fn_validar_privacidad_respuesta_encuesta()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_privacidad VARCHAR(24);
BEGIN
    SELECT tipo_privacidad INTO v_privacidad
    FROM encuestas WHERE id_encuesta = NEW.id_encuesta FOR SHARE;
    IF NOT FOUND THEN RETURN NEW; END IF;
    IF TG_OP = 'UPDATE' AND NEW.id_encuesta IS DISTINCT FROM OLD.id_encuesta THEN
        RAISE EXCEPTION 'La respuesta no puede cambiarse a otra encuesta' USING ERRCODE = '23514';
    END IF;
    IF v_privacidad = 'publico_anonimo' AND NEW.id_usuario IS NOT NULL THEN
        RAISE EXCEPTION 'Una respuesta anónima no puede guardar identidad' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'INSERT' AND v_privacidad = 'institucional' AND NEW.id_usuario IS NULL THEN
        RAISE EXCEPTION 'Una respuesta institucional requiere identidad al enviarse' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'UPDATE'
       AND v_privacidad = 'institucional'
       AND NEW.id_usuario IS DISTINCT FROM OLD.id_usuario THEN
        -- La FK anida su trigger para ON DELETE SET NULL; un UPDATE directo tiene profundidad 1.
        IF OLD.id_usuario IS NOT NULL AND NEW.id_usuario IS NULL AND pg_trigger_depth() > 1 THEN
            RETURN NEW;
        END IF;
        RAISE EXCEPTION 'La identidad institucional no puede cambiarse después del envío' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validar_privacidad_respuesta_encuesta ON respuestas_encuesta;
CREATE TRIGGER trg_validar_privacidad_respuesta_encuesta
    BEFORE INSERT OR UPDATE OF id_encuesta, id_usuario ON respuestas_encuesta
    FOR EACH ROW EXECUTE FUNCTION fn_validar_privacidad_respuesta_encuesta();

CREATE OR REPLACE FUNCTION fn_bloquear_cambio_privacidad_encuesta()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.tipo_privacidad IS DISTINCT FROM OLD.tipo_privacidad
       AND EXISTS (SELECT 1 FROM respuestas_encuesta r WHERE r.id_encuesta = OLD.id_encuesta) THEN
        RAISE EXCEPTION 'La privacidad no puede cambiar después de recibir respuestas' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_bloquear_cambio_privacidad_encuesta ON encuestas;
CREATE TRIGGER trg_bloquear_cambio_privacidad_encuesta
    BEFORE UPDATE OF tipo_privacidad ON encuestas
    FOR EACH ROW EXECUTE FUNCTION fn_bloquear_cambio_privacidad_encuesta();

-- Algunas instalaciones antiguas guardaban nombre, matrícula y carrera en
-- respuestas_encuesta. Se conservan esas columnas y sus restricciones en bases
-- existentes: no se puede atribuir ni convertir esos datos sin una revisión.
ALTER TABLE respuestas_encuesta ADD COLUMN IF NOT EXISTS id_licenciatura INT
    REFERENCES cat_licenciaturas(id_licenciatura) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS detalle_respuestas (
    id_detalle   SERIAL PRIMARY KEY,
    id_respuesta INT NOT NULL,
    id_pregunta  INT NOT NULL,
    -- Se deriva de la respuesta y permite que las FKs validen que pregunta y
    -- respuesta pertenezcan a la misma encuesta.
    id_encuesta  INT NOT NULL,
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
    CONSTRAINT chk_detalle_texto_otro CHECK (texto_otro IS NULL OR char_length(texto_otro) <= 70),
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
    ADD CONSTRAINT chk_detalle_texto_otro CHECK (texto_otro IS NULL OR char_length(texto_otro) <= 70) NOT VALID;

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

-- Claves destino para validar encuesta, respuesta y pregunta en una sola FK.
CREATE UNIQUE INDEX IF NOT EXISTS uq_respuestas_id_encuesta
    ON respuestas_encuesta(id_respuesta, id_encuesta);
CREATE UNIQUE INDEX IF NOT EXISTS uq_preguntas_id_encuesta
    ON preguntas(id_pregunta, id_encuesta);

-- En instalaciones antiguas el campo se completa desde la respuesta existente.
-- La migración administrada aborta antes si encuentra preguntas cruzadas.
LOCK TABLE respuestas_encuesta, detalle_respuestas, preguntas
    IN SHARE ROW EXCLUSIVE MODE;
ALTER TABLE detalle_respuestas ADD COLUMN IF NOT EXISTS id_encuesta INT;
DO $$
DECLARE
    v_detalle INTEGER;
    v_encuesta_respuesta INTEGER;
    v_encuesta_pregunta INTEGER;
BEGIN
    SELECT d.id_detalle, r.id_encuesta, p.id_encuesta
      INTO v_detalle, v_encuesta_respuesta, v_encuesta_pregunta
    FROM detalle_respuestas d
    LEFT JOIN respuestas_encuesta r ON r.id_respuesta = d.id_respuesta
    LEFT JOIN preguntas p ON p.id_pregunta = d.id_pregunta
    WHERE r.id_respuesta IS NULL OR p.id_pregunta IS NULL
       OR r.id_encuesta <> p.id_encuesta
       OR (d.id_encuesta IS NOT NULL AND d.id_encuesta <> r.id_encuesta)
       OR p.tipo = 'licenciatura'
    ORDER BY d.id_detalle
    LIMIT 1;
    IF v_detalle IS NOT NULL THEN
        RAISE EXCEPTION
          'No se puede completar id_encuesta: detalle % tiene referencias huérfanas, cruzadas o usa una pregunta de licenciatura',
          v_detalle;
    END IF;
END $$;
UPDATE detalle_respuestas d
SET id_encuesta = r.id_encuesta
FROM respuestas_encuesta r
WHERE r.id_respuesta = d.id_respuesta AND d.id_encuesta IS NULL;
ALTER TABLE detalle_respuestas ALTER COLUMN id_encuesta SET NOT NULL;

-- Sustituye las relaciones simples por compuestas; mantiene CASCADE para el
-- detalle de una respuesta y RESTRICT para proteger preguntas con historial.
ALTER TABLE detalle_respuestas DROP CONSTRAINT IF EXISTS fk_detalle_respuesta;
ALTER TABLE detalle_respuestas DROP CONSTRAINT IF EXISTS fk_detalle_pregunta;
ALTER TABLE detalle_respuestas
    ADD CONSTRAINT fk_detalle_respuesta
    FOREIGN KEY (id_respuesta, id_encuesta)
    REFERENCES respuestas_encuesta(id_respuesta, id_encuesta) ON DELETE CASCADE;
ALTER TABLE detalle_respuestas
    ADD CONSTRAINT fk_detalle_pregunta
    FOREIGN KEY (id_pregunta, id_encuesta)
    REFERENCES preguntas(id_pregunta, id_encuesta) ON DELETE RESTRICT;

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
-- MÓDULO ASISTENCIA V1 (PBI-05) — definición del esquema
-- ============================================================
-- Extraido de migrations/migrate-asistencia-v1.sql (idempotente y sin
-- operaciones destructivas): este bloque se ejecuta solo al aplicar
-- manualmente schema.sql. La migración original se conserva para despliegues
-- controlados que necesiten instalar el módulo sin reaplicar el esquema entero.
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
    CONSTRAINT uq_periodos_fechas UNIQUE (fecha_inicio, fecha_fin),
    CONSTRAINT chk_periodos_fechas CHECK (fecha_fin >= fecha_inicio),
    CONSTRAINT ex_periodos_actividad_sin_traslape
        EXCLUDE USING gist (daterange(fecha_inicio, fecha_fin, '[]') WITH &&)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_periodos_fechas' AND conrelid = 'periodos_actividad'::regclass
    ) THEN
        ALTER TABLE periodos_actividad
            ADD CONSTRAINT chk_periodos_fechas CHECK (fecha_fin >= fecha_inicio);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ex_periodos_actividad_sin_traslape' AND conrelid = 'periodos_actividad'::regclass
    ) THEN
        ALTER TABLE periodos_actividad
            ADD CONSTRAINT ex_periodos_actividad_sin_traslape
            EXCLUDE USING gist (daterange(fecha_inicio, fecha_fin, '[]') WITH &&);
    END IF;
END $$;

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
    v_insertadas INT := 0;
    v_limite_fin DATE;
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
        v_limite_fin := LEAST(v_fin, COALESCE(v_horario.vigencia_fin, v_fin));

        -- Primera ocurrencia del día dentro del periodo
        -- EXTRACT(DOW): 0=Domingo … 6=Sábado (misma convención que dia_semana)
        v_fecha := GREATEST(v_inicio, COALESCE(v_horario.vigencia_inicio, v_inicio));
        WHILE EXTRACT(DOW FROM v_fecha)::INT != v_dia_semana LOOP
            v_fecha := v_fecha + INTERVAL '1 day';
        END LOOP;

        WHILE v_limite_fin >= v_fecha LOOP
            INSERT INTO sesiones (
                id_club, id_periodo, id_horario, fecha,
                hora_inicio, hora_fin, lugar, integrantes_snapshot
            )
            VALUES (
                p_id_club, p_id_periodo, v_horario.id_horario, v_fecha,
                v_horario.hora_inicio, v_horario.hora_fin, v_horario.lugar, v_snapshot
            )
            ON CONFLICT (id_horario, fecha) DO NOTHING;
            GET DIAGNOSTICS v_insertadas = ROW_COUNT;
            v_creadas := v_creadas + v_insertadas;

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
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_mural_status' AND conrelid='publicaciones_mural'::regclass) THEN
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
    cerrada_manualmente BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_publicacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE convocatorias_inscripcion
    ADD COLUMN IF NOT EXISTS cerrada_manualmente BOOLEAN NOT NULL DEFAULT FALSE;
-- La clave compuesta permite comprobar que el ciclo pertenece al mismo club
-- que lo referencia (formularios y ciclo actual del club).
CREATE UNIQUE INDEX IF NOT EXISTS uq_convocatoria_inscripcion_id_club
    ON convocatorias_inscripcion(id_convocatoria_inscripcion, id_club);
CREATE INDEX IF NOT EXISTS idx_convocatoria_inscripcion_club
    ON convocatorias_inscripcion(id_club, fecha_publicacion DESC);
ALTER TABLE convocatorias_inscripcion ENABLE ROW LEVEL SECURITY;

ALTER TABLE clubes ADD COLUMN IF NOT EXISTS id_convocatoria_inscripcion_actual INT;
ALTER TABLE formularios ADD COLUMN IF NOT EXISTS id_convocatoria_inscripcion INT;
CREATE INDEX IF NOT EXISTS idx_formularios_convocatoria_inscripcion
    ON formularios(id_convocatoria_inscripcion);
-- Una sola postulación por alumno, club y ciclo. Filas históricas sin ciclo
-- siguen conservándose y no se pueden deduplicar sin una asignación fiable.
CREATE UNIQUE INDEX IF NOT EXISTS uq_formulario_alumno_club_ciclo
    ON formularios (id_alumno, id_club, id_convocatoria_inscripcion)
    WHERE id_convocatoria_inscripcion IS NOT NULL;

DO $$
BEGIN
    ALTER TABLE clubes DROP CONSTRAINT IF EXISTS fk_club_convocatoria_inscripcion_actual;
    ALTER TABLE formularios DROP CONSTRAINT IF EXISTS fk_formulario_convocatoria_inscripcion;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_club_ciclo_actual_mismo_club' AND conrelid='clubes'::regclass
    ) THEN
        ALTER TABLE clubes ADD CONSTRAINT fk_club_ciclo_actual_mismo_club
            FOREIGN KEY (id_convocatoria_inscripcion_actual, id_club)
            REFERENCES convocatorias_inscripcion(id_convocatoria_inscripcion, id_club)
            ON DELETE SET NULL (id_convocatoria_inscripcion_actual);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_formulario_ciclo_mismo_club' AND conrelid='formularios'::regclass
    ) THEN
        ALTER TABLE formularios ADD CONSTRAINT fk_formulario_ciclo_mismo_club
            FOREIGN KEY (id_convocatoria_inscripcion, id_club)
            REFERENCES convocatorias_inscripcion(id_convocatoria_inscripcion, id_club)
            ON DELETE RESTRICT;
    END IF;
END $$;

-- Backfill: representa la convocatoria publicada actual de cada club.
-- La fecha de publicación es la última aprobación conocida (o la apertura).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'clubes'
          AND column_name = 'fecha_apertura_programada'
    ) THEN
        EXECUTE $sql$
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
                       GREATEST(COALESCE(a.fecha_revision, cl.fecha_apertura_programada),
                                cl.fecha_apertura_programada)
                FROM clubes cl
                LEFT JOIN aprobada a ON a.id_club = cl.id_club
                WHERE cl.id_convocatoria_inscripcion_actual IS NULL
                  AND cl.fecha_apertura_programada IS NOT NULL
                RETURNING id_convocatoria_inscripcion, id_club
            )
            UPDATE clubes cl
               SET id_convocatoria_inscripcion_actual = n.id_convocatoria_inscripcion
              FROM nuevos n
             WHERE cl.id_club = n.id_club
        $sql$;
    END IF;
END $$;

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

-- CATALOGO UNIFICADO: clubes, actividades y publicaciones.

-- Este bloque forma parte del esquema completo; no requiere ejecutar archivos adicionales.
-- También incorpora las versiones anteriores del módulo conservando sus correspondencias e historial.
-- Inventario actual: 14 tablas físicas del módulo.
--   Ediciones y registros: actividades_ediciones, actividades_registros.
--   Aportaciones: actividades_aportes_catalogo, actividades_aportaciones.
--   Publicaciones: publicaciones_oferta, publicaciones_imagenes, reacciones_catalogo.
--   Migración: migraciones_catalogo.
--   Asistencia: actividades_asistencia_accesos, actividades_asistencias.
--   Misiones: misiones_documentos.
--   Trineo: actividades_cartas, actividades_cartas_reservas.
--   Responsables adicionales: actividades_responsables.
-- Se reutilizan clubes y actividad_clubes. Los nombres anteriores actividades,
-- actividades_fotos, actividades_reacciones, actividades_historial y
-- actividades_legado_clubes se conservan como vistas sobre el modelo compartido.
-- Las tablas de intereses y actividades_propuestas pertenecen al onboarding,
-- definido después de este bloque.

LOCK TABLE clubes IN SHARE ROW EXCLUSIVE MODE;
DROP VIEW IF EXISTS clubes_con_estado;
DROP VIEW IF EXISTS clubes_operativos;

ALTER TABLE clubes ADD COLUMN IF NOT EXISTS tipo VARCHAR(12) NOT NULL DEFAULT 'club';
ALTER TABLE clubes ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
ALTER TABLE clubes ADD COLUMN IF NOT EXISTS plantilla VARCHAR(20) NOT NULL DEFAULT 'general';
ALTER TABLE clubes ADD COLUMN IF NOT EXISTS estado_publicacion VARCHAR(20);
ALTER TABLE clubes ADD COLUMN IF NOT EXISTS mostrar_en_oferta BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE clubes ADD COLUMN IF NOT EXISTS id_autor INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL;
ALTER TABLE clubes ADD COLUMN IF NOT EXISTS propuesta JSONB;
ALTER TABLE clubes ADD COLUMN IF NOT EXISTS estado_propuesta VARCHAR(20);
ALTER TABLE clubes ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT;
ALTER TABLE clubes ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW();
DO $$ BEGIN
 IF (SELECT character_maximum_length FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='clubes' AND column_name='nombre_club') IS DISTINCT FROM 160 THEN
  ALTER TABLE clubes ALTER COLUMN nombre_club TYPE VARCHAR(160);
 END IF;
 IF (SELECT character_maximum_length FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='clubes' AND column_name='categoria') IS DISTINCT FROM 80 THEN
  ALTER TABLE clubes ALTER COLUMN categoria TYPE VARCHAR(80);
 END IF;
 IF (SELECT data_type FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='clubes' AND column_name='imagen_portada') IS DISTINCT FROM 'text' THEN
  ALTER TABLE clubes ALTER COLUMN imagen_portada TYPE TEXT;
 END IF;
END $$;
ALTER TABLE clubes ALTER COLUMN cupo_maximo DROP NOT NULL;
ALTER TABLE clubes ALTER COLUMN participacion DROP NOT NULL;
ALTER TABLE clubes ALTER COLUMN cupo_maximo DROP DEFAULT;
ALTER TABLE clubes ALTER COLUMN participacion DROP DEFAULT;
UPDATE clubes SET slug = 'club-' || id_club WHERE slug IS NULL;
UPDATE clubes SET estado_publicacion = CASE WHEN id_estatus_club = 3 THEN 'archivada' ELSE 'publicada' END WHERE estado_publicacion IS NULL;
ALTER TABLE clubes ALTER COLUMN estado_publicacion SET DEFAULT 'borrador';
ALTER TABLE clubes ALTER COLUMN estado_publicacion SET NOT NULL;
ALTER TABLE clubes ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_catalogo_slug ON clubes(slug);
CREATE INDEX IF NOT EXISTS idx_catalogo_tipo_publicacion ON clubes(tipo,estado_publicacion);
DROP INDEX IF EXISTS uq_club_id_responsable_club;
CREATE UNIQUE INDEX uq_club_id_responsable_club ON clubes(id_responsable_club) WHERE tipo='club' AND id_responsable_club IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clubes_vicepresidente
    ON clubes (id_vicepresidente)
    WHERE id_vicepresidente IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clubes_estatus_publicacion
    ON clubes (id_estatus_club, estado_publicacion);
ALTER TABLE clubes DROP CONSTRAINT IF EXISTS chk_catalogo_tipo;
ALTER TABLE clubes ADD CONSTRAINT chk_catalogo_tipo CHECK (tipo IN ('club','actividad'));
ALTER TABLE clubes DROP CONSTRAINT IF EXISTS chk_catalogo_publicacion;
ALTER TABLE clubes ADD CONSTRAINT chk_catalogo_publicacion CHECK (estado_publicacion IN ('borrador','pendiente','publicada','rechazada','archivada'));
ALTER TABLE clubes DROP CONSTRAINT IF EXISTS chk_catalogo_plantilla;
ALTER TABLE clubes ADD CONSTRAINT chk_catalogo_plantilla CHECK (plantilla IN ('general','trineo','misiones') AND (tipo='actividad' OR plantilla='general'));
ALTER TABLE clubes DROP CONSTRAINT IF EXISTS chk_catalogo_revision;
ALTER TABLE clubes ADD CONSTRAINT chk_catalogo_revision CHECK (estado_propuesta IN ('borrador','pendiente','rechazada'));
ALTER TABLE clubes DROP CONSTRAINT IF EXISTS chk_catalogo_datos_club;
ALTER TABLE clubes ADD CONSTRAINT chk_catalogo_datos_club CHECK (
  (tipo = 'club' AND cupo_maximo IS NOT NULL AND cupo_maximo IN (10,15,20,25,30,40,50) AND participacion IS NOT NULL)
  OR (tipo = 'actividad' AND cupo_maximo IS NULL AND participacion IS NULL)
);

CREATE TABLE IF NOT EXISTS migraciones_catalogo (
  id_migracion BIGSERIAL PRIMARY KEY,
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('equivalencia_actividad','traslado_club')),
  id_actividad_anterior INT,
  id_club_origen INT REFERENCES clubes(id_club) ON DELETE RESTRICT,
  id_club_destino INT NOT NULL REFERENCES clubes(id_club) ON DELETE RESTRICT,
  id_edicion_destino INT,
  datos_originales JSONB NOT NULL DEFAULT '{}'::jsonb,
  resumen JSONB NOT NULL DEFAULT '{}'::jsonb,
  migrado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (tipo='equivalencia_actividad' AND id_actividad_anterior IS NOT NULL AND id_club_origen IS NULL AND id_edicion_destino IS NULL)
    OR (tipo='traslado_club' AND id_actividad_anterior IS NULL AND id_club_origen IS NOT NULL AND id_edicion_destino IS NOT NULL)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_migracion_actividad_anterior ON migraciones_catalogo(id_actividad_anterior) WHERE tipo='equivalencia_actividad';
CREATE UNIQUE INDEX IF NOT EXISTS uq_migracion_actividad_destino ON migraciones_catalogo(id_club_destino) WHERE tipo='equivalencia_actividad';
CREATE UNIQUE INDEX IF NOT EXISTS uq_migracion_club_origen ON migraciones_catalogo(id_club_origen) WHERE tipo='traslado_club';
CREATE OR REPLACE FUNCTION fn_migracion_catalogo_destino() RETURNS trigger AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM clubes WHERE id_club=NEW.id_club_destino AND tipo='actividad')
    OR (NEW.tipo='traslado_club' AND NOT EXISTS(SELECT 1 FROM clubes WHERE id_club=NEW.id_club_origen AND tipo='club')) THEN
  RAISE EXCEPTION 'Revisa el origen y el destino de la migración del catálogo' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_migracion_catalogo_destino ON migraciones_catalogo;
CREATE TRIGGER trg_migracion_catalogo_destino BEFORE INSERT OR UPDATE ON migraciones_catalogo FOR EACH ROW EXECUTE FUNCTION fn_migracion_catalogo_destino();

-- Incorpora las equivalencias de la versión con once tablas antes de retirarla.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('catalogo_equivalencias_actividades') AND relkind='r') THEN
  LOCK TABLE catalogo_equivalencias_actividades IN ACCESS EXCLUSIVE MODE;
  INSERT INTO migraciones_catalogo(tipo,id_actividad_anterior,id_club_destino,datos_originales,migrado_en)
   SELECT 'equivalencia_actividad',id_actividad_anterior,id_club,datos_originales,migrado_en FROM catalogo_equivalencias_actividades
   ON CONFLICT DO NOTHING;
  IF EXISTS(
   SELECT 1 FROM catalogo_equivalencias_actividades a LEFT JOIN migraciones_catalogo m
    ON m.tipo='equivalencia_actividad' AND m.id_actividad_anterior=a.id_actividad_anterior
   WHERE m.id_migracion IS NULL OR m.id_club_destino IS DISTINCT FROM a.id_club
    OR m.datos_originales IS DISTINCT FROM a.datos_originales OR m.migrado_en IS DISTINCT FROM a.migrado_en
  ) THEN RAISE EXCEPTION 'Hay equivalencias incompatibles; la migración se revierte'; END IF;
  DROP TABLE catalogo_equivalencias_actividades;
 END IF;
END $$;
CREATE OR REPLACE VIEW catalogo_equivalencias_actividades AS
 SELECT id_actividad_anterior,id_club_destino AS id_club,datos_originales,migrado_en
 FROM migraciones_catalogo WHERE tipo='equivalencia_actividad';
DO $$
DECLARE secuencia TEXT; ultimo BIGINT; usado BOOLEAN; maximo BIGINT;
BEGIN
 secuencia:=pg_get_serial_sequence('clubes','id_club');
 SELECT COALESCE(MAX(id_club),0) INTO maximo FROM clubes;
 EXECUTE format('SELECT last_value,is_called FROM %s',secuencia) INTO ultimo,usado;
 PERFORM setval(secuencia,GREATEST(ultimo,maximo),usado OR maximo>=ultimo);
END $$;

CREATE TABLE IF NOT EXISTS actividades_ediciones (
  id_edicion SERIAL PRIMARY KEY,
  id_actividad INT NOT NULL CONSTRAINT fk_edicion_catalogo REFERENCES clubes(id_club) ON DELETE RESTRICT,
  nombre VARCHAR(160) NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  lugar VARCHAR(240) NOT NULL DEFAULT '',
  ubicacion_maps VARCHAR(2048) NOT NULL DEFAULT '',
  fecha_inicio DATE,
  fecha_fin DATE,
  hora_inicio VARCHAR(5) NOT NULL DEFAULT '',
  requiere_registro BOOLEAN NOT NULL DEFAULT FALSE,
  campos_registro JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(campos_registro) = 'array'),
  configuracion_misiones JSONB,
  cartas_habilitadas BOOLEAN NOT NULL DEFAULT FALSE,
  carta_obligatoria BOOLEAN NOT NULL DEFAULT TRUE,
  requiere_aportacion BOOLEAN NOT NULL DEFAULT FALSE,
  inscripcion_desde DATE,
  inscripcion_hasta DATE,
  inscripciones_habilitadas BOOLEAN NOT NULL DEFAULT TRUE,
  destacable BOOLEAN NOT NULL DEFAULT FALSE,
  destacada_desde DATE,
  destacada_hasta DATE,
  estado VARCHAR(20) NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','pendiente','publicada','rechazada','archivada')),
  propuesta JSONB,
  estado_propuesta VARCHAR(20) CHECK (estado_propuesta IN ('borrador','pendiente','rechazada')),
  motivo_rechazo TEXT,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio),
  CHECK (inscripcion_hasta IS NULL OR inscripcion_desde IS NULL OR inscripcion_hasta >= inscripcion_desde),
  CHECK (destacada_hasta IS NULL OR destacada_desde IS NULL OR destacada_hasta >= destacada_desde)
);

-- No empareja por nombre ni reutiliza IDs que puedan pertenecer a otro club.
DO $$
DECLARE fila RECORD; nuevo_id INT; nueva_slug TEXT; restriccion RECORD; contador INT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE oid=to_regclass('actividades') AND relkind='r') THEN
    FOR fila IN SELECT * FROM actividades ORDER BY id_actividad LOOP
      IF NOT EXISTS (SELECT 1 FROM migraciones_catalogo WHERE tipo='equivalencia_actividad' AND id_actividad_anterior=fila.id_actividad) THEN
        nueva_slug := fila.slug;
        contador:=0;
        WHILE EXISTS (SELECT 1 FROM clubes WHERE slug=nueva_slug) LOOP
          contador:=contador+1;
          nueva_slug := left(fila.slug,65) || '-actividad-' || fila.id_actividad || CASE WHEN contador=1 THEN '' ELSE '-' || contador END;
        END LOOP;
        INSERT INTO clubes (nombre_club,descripcion,categoria,imagen_portada,tipo,slug,plantilla,estado_publicacion,mostrar_en_oferta,id_autor,id_responsable_club,propuesta,estado_propuesta,motivo_rechazo,actualizado_en,cupo_maximo,participacion)
        VALUES (fila.nombre,fila.descripcion,fila.categoria,fila.url_imagen,'actividad',nueva_slug,fila.plantilla,fila.estado,fila.mostrar_en_oferta,fila.id_autor,fila.id_responsable,fila.propuesta,fila.estado_propuesta,fila.motivo_rechazo,fila.actualizado_en,NULL,NULL)
        RETURNING id_club INTO nuevo_id;
        INSERT INTO migraciones_catalogo(tipo,id_actividad_anterior,id_club_destino,datos_originales) VALUES ('equivalencia_actividad',fila.id_actividad,nuevo_id,to_jsonb(fila));
      END IF;
    END LOOP;
    FOR restriccion IN SELECT conname FROM pg_constraint WHERE conrelid=to_regclass('actividades_ediciones') AND confrelid=to_regclass('actividades') LOOP
      EXECUTE format('ALTER TABLE actividades_ediciones DROP CONSTRAINT %I',restriccion.conname);
    END LOOP;
    UPDATE actividades_ediciones e SET id_actividad=m.id_club_destino FROM migraciones_catalogo m WHERE m.tipo='equivalencia_actividad' AND e.id_actividad=m.id_actividad_anterior;
    ALTER TABLE actividades RENAME TO actividades_catalogo_anterior;
  END IF;
END $$;
ALTER TABLE actividades_ediciones DROP CONSTRAINT IF EXISTS fk_edicion_catalogo;
ALTER TABLE actividades_ediciones ADD CONSTRAINT fk_edicion_catalogo FOREIGN KEY (id_actividad) REFERENCES clubes(id_club) ON DELETE RESTRICT;
ALTER TABLE actividades_ediciones ADD COLUMN IF NOT EXISTS ubicacion_maps VARCHAR(2048) NOT NULL DEFAULT '';
ALTER TABLE actividades_ediciones ADD COLUMN IF NOT EXISTS carta_obligatoria BOOLEAN NOT NULL DEFAULT TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_edicion_propietario ON actividades_ediciones(id_edicion,id_actividad);
ALTER TABLE migraciones_catalogo DROP CONSTRAINT IF EXISTS fk_migracion_edicion;
ALTER TABLE migraciones_catalogo ADD CONSTRAINT fk_migracion_edicion FOREIGN KEY(id_edicion_destino,id_club_destino) REFERENCES actividades_ediciones(id_edicion,id_actividad) ON DELETE RESTRICT;

DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('actividades_legado_clubes') AND relkind='r') THEN
  LOCK TABLE actividades_legado_clubes IN ACCESS EXCLUSIVE MODE;
  INSERT INTO migraciones_catalogo(tipo,id_club_origen,id_club_destino,id_edicion_destino,resumen,migrado_en)
   SELECT 'traslado_club',l.id_club,e.id_actividad,l.id_edicion,l.resumen,l.migrado_en
   FROM actividades_legado_clubes l JOIN actividades_ediciones e ON e.id_edicion=l.id_edicion
   ON CONFLICT DO NOTHING;
  IF EXISTS(
   SELECT 1 FROM actividades_legado_clubes l LEFT JOIN migraciones_catalogo m
    ON m.tipo='traslado_club' AND m.id_club_origen=l.id_club
   WHERE m.id_migracion IS NULL OR m.id_edicion_destino IS DISTINCT FROM l.id_edicion
    OR m.resumen IS DISTINCT FROM l.resumen OR m.migrado_en IS DISTINCT FROM l.migrado_en
  ) THEN RAISE EXCEPTION 'Hay traslados incompatibles; la migración se revierte'; END IF;
  DROP TABLE actividades_legado_clubes;
 END IF;
END $$;
CREATE OR REPLACE VIEW actividades_legado_clubes AS
 SELECT id_club_origen AS id_club,id_edicion_destino AS id_edicion,resumen,migrado_en
 FROM migraciones_catalogo WHERE tipo='traslado_club';

CREATE OR REPLACE VIEW catalogo_recursos AS
SELECT id_club AS id_actividad,id_club,tipo,slug,nombre_club AS nombre,descripcion,categoria,
       imagen_portada AS url_imagen,plantilla,mostrar_en_oferta,estado_publicacion AS estado,
       id_autor,id_responsable_club AS id_responsable,propuesta,estado_propuesta,motivo_rechazo,
       actualizado_en,cupo_maximo,participacion,lugar_actividades,id_vicepresidente,id_estatus_club
FROM clubes;
CREATE OR REPLACE VIEW actividades AS SELECT id_actividad,slug,nombre,descripcion,categoria,url_imagen,
       plantilla,mostrar_en_oferta,estado,id_autor,id_responsable,propuesta,estado_propuesta,
       motivo_rechazo,actualizado_en FROM catalogo_recursos WHERE tipo='actividad';
CREATE TABLE IF NOT EXISTS actividades_responsables (
  id_actividad INT NOT NULL REFERENCES clubes(id_club) ON DELETE CASCADE,
  id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id_actividad, id_usuario)
);
CREATE INDEX IF NOT EXISTS idx_actividades_responsables_usuario ON actividades_responsables(id_usuario);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'clubes'
          AND column_name = 'cerrada_manualmente'
    ) THEN
        EXECUTE $sql$
            UPDATE convocatorias_inscripcion ci
               SET cerrada_manualmente = cl.cerrada_manualmente
              FROM clubes cl
             WHERE ci.id_convocatoria_inscripcion = cl.id_convocatoria_inscripcion_actual
               AND ci.id_club = cl.id_club
        $sql$;
    END IF;
END $$;

DROP VIEW IF EXISTS clubes_con_estado;
DROP VIEW IF EXISTS clubes_operativos;
ALTER TABLE clubes DROP COLUMN IF EXISTS postulaciones_actuales;
ALTER TABLE clubes DROP COLUMN IF EXISTS max_postulaciones;
ALTER TABLE clubes DROP COLUMN IF EXISTS cerrada_manualmente;
ALTER TABLE clubes DROP COLUMN IF EXISTS fecha_apertura_programada;
ALTER TABLE clubes DROP COLUMN IF EXISTS fecha_limite_cierre;

CREATE OR REPLACE VIEW clubes_operativos AS SELECT * FROM clubes WHERE tipo='club' WITH LOCAL CHECK OPTION;
CREATE VIEW clubes_con_estado AS
SELECT cl.id_club, cl.nombre_club, cl.descripcion, cl.categoria, cl.participacion,
       cl.cupo_maximo, cl.lugar_actividades, cl.id_responsable_club,
       cl.id_vicepresidente, cl.imagen_portada, cl.id_estatus_club,
       cl.fecha_creacion, cl.horario, ci.max_postulaciones,
       COUNT(f.id_formulario)::int AS postulaciones_actuales,
       COALESCE(ci.cerrada_manualmente,FALSE) AS cerrada_manualmente,
       ci.fecha_apertura_programada, ci.fecha_limite_cierre,
       cl.version_horario, cl.id_convocatoria_inscripcion_actual, cl.tipo,
       cl.slug, cl.plantilla, cl.estado_publicacion, cl.mostrar_en_oferta,
       cl.id_autor, cl.propuesta, cl.estado_propuesta, cl.motivo_rechazo,
       cl.actualizado_en, COUNT(f.id_formulario)::int AS formularios_recibidos,
       CASE WHEN COALESCE(ci.cerrada_manualmente,FALSE) THEN 'cerrado'
            WHEN ci.fecha_apertura_programada IS NOT NULL AND NOW()<ci.fecha_apertura_programada THEN 'proximo'
            WHEN ci.max_postulaciones IS NOT NULL AND COUNT(f.id_formulario)>=ci.max_postulaciones THEN 'lleno'
            WHEN ci.fecha_limite_cierre IS NOT NULL AND NOW()>ci.fecha_limite_cierre THEN 'cerrado'
            WHEN ci.fecha_apertura_programada IS NULL THEN 'cerrado' ELSE 'abierto' END AS estado_calculado
FROM clubes cl
LEFT JOIN convocatorias_inscripcion ci
  ON ci.id_convocatoria_inscripcion=cl.id_convocatoria_inscripcion_actual AND ci.id_club=cl.id_club
LEFT JOIN formularios f ON f.id_convocatoria_inscripcion=ci.id_convocatoria_inscripcion AND f.id_club=cl.id_club
WHERE cl.tipo='club' GROUP BY cl.id_club,ci.id_convocatoria_inscripcion;

CREATE TABLE IF NOT EXISTS actividades_aportes_catalogo (
  id_opcion SERIAL PRIMARY KEY,
  id_edicion INT NOT NULL REFERENCES actividades_ediciones(id_edicion) ON DELETE RESTRICT,
  nombre VARCHAR(160) NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  unidad VARCHAR(60) NOT NULL,
  cantidad_minima NUMERIC(12,3) NOT NULL CHECK (cantidad_minima > 0),
  activa BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS actividades_registros (
  id_registro SERIAL PRIMARY KEY,
  id_edicion INT NOT NULL REFERENCES actividades_ediciones(id_edicion) ON DELETE RESTRICT,
  id_usuario INT REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
  nombre_completo VARCHAR(150) NOT NULL,
  matricula VARCHAR(50),
  tipo_participante VARCHAR(10) NOT NULL DEFAULT 'unid',
  folio UUID,
  correo VARCHAR(254),
  telefono VARCHAR(40),
  invitado_token_hash VARCHAR(64),
  pedido JSONB,
  misiones_snapshot JSONB,
  -- La FK se agrega después de crear misiones_documentos (referencia circular).
  codigo_firmado_id UUID,
  respuestas JSONB NOT NULL DEFAULT '{}'::jsonb,
  formulario_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  estado VARCHAR(30) NOT NULL DEFAULT 'confirmado' CHECK (estado IN ('confirmado','cancelado','pendiente_completar')),
  origen_legacy JSONB,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id_edicion, id_usuario),
  UNIQUE (id_edicion, matricula)
);

CREATE TABLE IF NOT EXISTS actividades_aportaciones (
  id_aportacion SERIAL PRIMARY KEY,
  id_registro INT NOT NULL REFERENCES actividades_registros(id_registro) ON DELETE RESTRICT,
  id_opcion INT NOT NULL REFERENCES actividades_aportes_catalogo(id_opcion) ON DELETE RESTRICT,
  nombre VARCHAR(160) NOT NULL,
  unidad VARCHAR(60) NOT NULL,
  cantidad NUMERIC(12,3) NOT NULL CHECK (cantidad > 0),
  cantidad_minima NUMERIC(12,3) NOT NULL CHECK (cantidad_minima > 0),
  estado VARCHAR(20) NOT NULL DEFAULT 'comprometida' CHECK (estado IN ('comprometida','recibida','cancelada')),
  recibida_por INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  recibida_en TIMESTAMPTZ,
  UNIQUE (id_registro, id_opcion)
);

CREATE INDEX IF NOT EXISTS idx_actividades_ediciones_actividad ON actividades_ediciones(id_actividad);
CREATE INDEX IF NOT EXISTS idx_actividades_registros_usuario ON actividades_registros(id_usuario);
CREATE INDEX IF NOT EXISTS idx_actividades_aportes_edicion ON actividades_aportes_catalogo(id_edicion);

-- Publicaciones e imágenes compartidas. El identificador de cada foto se conserva.
CREATE TABLE IF NOT EXISTS publicaciones_oferta (
 id_publicacion SERIAL PRIMARY KEY,
 id_club INT NOT NULL REFERENCES clubes(id_club) ON DELETE RESTRICT,
 id_edicion INT,
 contenido VARCHAR(300) NOT NULL DEFAULT '',
 id_autor INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
 estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('borrador','pendiente','publicada','rechazada','retirada')),
 estado_propuesta VARCHAR(20) CHECK (estado_propuesta IN ('borrador','pendiente','rechazada')),
 contenido_pendiente VARCHAR(300),
 motivo_rechazo TEXT,
 creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 FOREIGN KEY (id_edicion,id_club) REFERENCES actividades_ediciones(id_edicion,id_actividad) ON DELETE RESTRICT
);
-- Compatibilidad con datos existentes: agrega columnas nuevas y conserva publicaciones previas.
ALTER TABLE publicaciones_oferta ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'publicada';
ALTER TABLE publicaciones_oferta ADD COLUMN IF NOT EXISTS estado_propuesta VARCHAR(20);
ALTER TABLE publicaciones_oferta ADD COLUMN IF NOT EXISTS contenido_pendiente VARCHAR(300);
ALTER TABLE publicaciones_oferta ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT;
ALTER TABLE publicaciones_oferta ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW();
UPDATE publicaciones_oferta SET estado='publicada' WHERE estado IS NULL;
ALTER TABLE publicaciones_oferta DROP CONSTRAINT IF EXISTS chk_publicacion_estado;
ALTER TABLE publicaciones_oferta ADD CONSTRAINT chk_publicacion_estado CHECK (estado IN ('borrador','pendiente','publicada','rechazada','retirada'));
ALTER TABLE publicaciones_oferta DROP CONSTRAINT IF EXISTS chk_publicacion_estado_propuesta;
ALTER TABLE publicaciones_oferta ADD CONSTRAINT chk_publicacion_estado_propuesta CHECK (estado_propuesta IS NULL OR estado_propuesta IN ('borrador','pendiente','rechazada'));
CREATE TABLE IF NOT EXISTS reacciones_publicacion (
 id_reaccion BIGSERIAL PRIMARY KEY,
 id_publicacion INT NOT NULL REFERENCES publicaciones_oferta(id_publicacion) ON DELETE CASCADE,
 id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
 reaccion VARCHAR(10) NOT NULL CHECK (reaccion IN ('like','love','clap')),
 creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE (id_publicacion, id_usuario)
);
DO $$
DECLARE foto RECORD; publicacion INT;
BEGIN
 IF EXISTS (SELECT 1 FROM pg_class WHERE oid=to_regclass('actividades_fotos') AND relkind='r') THEN
   ALTER TABLE actividades_fotos RENAME TO publicaciones_imagenes;
   ALTER TABLE publicaciones_imagenes ADD COLUMN id_publicacion INT REFERENCES publicaciones_oferta(id_publicacion) ON DELETE RESTRICT;
   ALTER TABLE publicaciones_imagenes ADD COLUMN orden INT NOT NULL DEFAULT 0;
   ALTER TABLE publicaciones_imagenes ADD COLUMN public_id TEXT;
   FOR foto IN SELECT f.*,e.id_actividad AS id_propietario FROM publicaciones_imagenes f JOIN actividades_ediciones e ON e.id_edicion=f.id_edicion LOOP
      INSERT INTO publicaciones_oferta(id_club,id_edicion,contenido,id_autor,estado,creado_en)
      VALUES(foto.id_propietario,foto.id_edicion,foto.pie,foto.id_autor,'publicada',foto.creado_en) RETURNING id_publicacion INTO publicacion;
     UPDATE publicaciones_imagenes SET id_publicacion=publicacion WHERE id_foto=foto.id_foto;
   END LOOP;
   ALTER TABLE publicaciones_imagenes ALTER COLUMN id_publicacion SET NOT NULL;
   ALTER TABLE publicaciones_imagenes DROP COLUMN id_edicion;
   ALTER TABLE publicaciones_imagenes DROP COLUMN pie;
   ALTER TABLE publicaciones_imagenes DROP COLUMN id_autor;
   ALTER TABLE publicaciones_imagenes DROP COLUMN creado_en;
   ALTER TABLE publicaciones_imagenes DROP COLUMN IF EXISTS etapa;
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS publicaciones_imagenes (
 id_foto SERIAL PRIMARY KEY,
 id_publicacion INT NOT NULL REFERENCES publicaciones_oferta(id_publicacion) ON DELETE RESTRICT,
 url_imagen TEXT NOT NULL,
 estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','publicada','rechazada','eliminada')),
 orden INT NOT NULL DEFAULT 0,
 public_id TEXT
);

CREATE OR REPLACE VIEW actividades_fotos AS
 SELECT i.id_foto,p.id_edicion,p.id_club,p.id_publicacion,i.url_imagen,p.contenido AS pie,
        i.estado,p.id_autor,p.creado_en,i.orden,i.public_id
 FROM publicaciones_imagenes i JOIN publicaciones_oferta p ON p.id_publicacion=i.id_publicacion;
CREATE INDEX IF NOT EXISTS idx_publicaciones_oferta_dueno ON publicaciones_oferta(id_club,id_edicion,creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_publicaciones_imagenes_publicacion ON publicaciones_imagenes(id_publicacion,estado,orden);
CREATE TABLE IF NOT EXISTS reacciones_catalogo (
 id_reaccion BIGSERIAL PRIMARY KEY,
 id_club INT NOT NULL REFERENCES clubes(id_club) ON DELETE RESTRICT,
 id_edicion INT,
 id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
 reaccion VARCHAR(10) NOT NULL CHECK (reaccion IN ('like','love','clap')),
 FOREIGN KEY(id_edicion,id_club) REFERENCES actividades_ediciones(id_edicion,id_actividad) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_reaccion_club_usuario ON reacciones_catalogo(id_club,id_usuario) WHERE id_edicion IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_reaccion_edicion_usuario ON reacciones_catalogo(id_edicion,id_usuario) WHERE id_edicion IS NOT NULL;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('actividades_reacciones') AND relkind='r') THEN
  LOCK TABLE actividades_reacciones IN ACCESS EXCLUSIVE MODE;
  INSERT INTO reacciones_catalogo(id_club,id_edicion,id_usuario,reaccion)
   SELECT e.id_actividad,r.id_edicion,r.id_usuario,r.reaccion FROM actividades_reacciones r JOIN actividades_ediciones e USING(id_edicion)
   ON CONFLICT DO NOTHING;
  IF EXISTS(
   SELECT 1 FROM actividades_reacciones a LEFT JOIN reacciones_catalogo r
    ON r.id_edicion=a.id_edicion AND r.id_usuario=a.id_usuario
   WHERE r.id_reaccion IS NULL OR r.reaccion IS DISTINCT FROM a.reaccion
  ) THEN RAISE EXCEPTION 'Hay reacciones de edición incompatibles; la migración se revierte'; END IF;
  DROP TABLE actividades_reacciones;
 END IF;
 IF EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('clubes_reacciones') AND relkind='r') THEN
  LOCK TABLE clubes_reacciones IN ACCESS EXCLUSIVE MODE;
  INSERT INTO reacciones_catalogo(id_club,id_usuario,reaccion)
   SELECT id_club,id_usuario,reaccion FROM clubes_reacciones ON CONFLICT DO NOTHING;
  IF EXISTS(
   SELECT 1 FROM clubes_reacciones a LEFT JOIN reacciones_catalogo r
    ON r.id_club=a.id_club AND r.id_usuario=a.id_usuario AND r.id_edicion IS NULL
   WHERE r.id_reaccion IS NULL OR r.reaccion IS DISTINCT FROM a.reaccion
  ) THEN RAISE EXCEPTION 'Hay reacciones de club incompatibles; la migración se revierte'; END IF;
  DROP TABLE clubes_reacciones;
 END IF;
END $$;
CREATE OR REPLACE VIEW actividades_reacciones AS
 SELECT id_edicion,id_usuario,reaccion FROM reacciones_catalogo WHERE id_edicion IS NOT NULL;
CREATE OR REPLACE VIEW clubes_reacciones AS
 SELECT id_club,id_usuario,reaccion FROM reacciones_catalogo WHERE id_edicion IS NULL;

-- La bitácora existente también recibe las acciones del catálogo y las ediciones.
DO $$ BEGIN
 IF (SELECT character_maximum_length FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='actividad_clubes' AND column_name='tipo_evento') IS DISTINCT FROM 80 THEN
  ALTER TABLE actividad_clubes ALTER COLUMN tipo_evento TYPE VARCHAR(80);
 END IF;
END $$;
ALTER TABLE actividad_clubes ADD COLUMN IF NOT EXISTS id_edicion INT;
ALTER TABLE actividad_clubes ADD COLUMN IF NOT EXISTS origen VARCHAR(20) NOT NULL DEFAULT 'club';
ALTER TABLE actividad_clubes ADD COLUMN IF NOT EXISTS id_historial_actividad_anterior INT;
ALTER TABLE actividad_clubes DROP CONSTRAINT IF EXISTS chk_actividad_origen;
ALTER TABLE actividad_clubes ADD CONSTRAINT chk_actividad_origen CHECK(origen IN ('club','catalogo'));
ALTER TABLE actividad_clubes DROP CONSTRAINT IF EXISTS chk_actividad_edicion;
ALTER TABLE actividad_clubes ADD CONSTRAINT chk_actividad_edicion CHECK(id_edicion IS NULL OR id_club IS NOT NULL);
ALTER TABLE actividad_clubes DROP CONSTRAINT IF EXISTS fk_actividad_edicion;
ALTER TABLE actividad_clubes ADD CONSTRAINT fk_actividad_edicion FOREIGN KEY(id_edicion,id_club) REFERENCES actividades_ediciones(id_edicion,id_actividad) ON DELETE RESTRICT;
DO $$
DECLARE restriccion RECORD;
BEGIN
 FOR restriccion IN SELECT conname FROM pg_constraint
  WHERE conrelid=to_regclass('actividad_clubes') AND contype='f' AND confrelid=to_regclass('usuarios')
    AND conkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid=to_regclass('actividad_clubes') AND attname='id_actor')]::smallint[]
 LOOP EXECUTE format('ALTER TABLE actividad_clubes DROP CONSTRAINT %I',restriccion.conname); END LOOP;
 ALTER TABLE actividad_clubes ADD CONSTRAINT fk_actividad_actor FOREIGN KEY(id_actor) REFERENCES usuarios(id_usuario) ON DELETE SET NULL;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_actividad_historial_anterior ON actividad_clubes(id_historial_actividad_anterior) WHERE id_historial_actividad_anterior IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_actividad_clubes_edicion ON actividad_clubes(id_edicion);
DO $$
DECLARE fila RECORD; destino INT; edicion INT; referencia INT;
BEGIN
 IF EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('actividades_historial') AND relkind='r') THEN
  LOCK TABLE actividades_historial IN ACCESS EXCLUSIVE MODE;
  FOR fila IN SELECT * FROM actividades_historial ORDER BY id LOOP
   destino:=NULL; edicion:=NULL;
   -- Las referencias a hijos mantienen su identidad aunque cambie el ID del catálogo.
   BEGIN
    SELECT e.id_edicion,e.id_actividad INTO edicion,destino FROM actividades_ediciones e
    WHERE e.id_edicion=COALESCE(
     (fila.detalle->>'id_edicion')::int,
     (SELECT id_edicion FROM actividades_registros WHERE id_registro=(fila.detalle->>'id_registro')::int),
     (SELECT id_edicion FROM actividades_aportes_catalogo WHERE id_opcion=(fila.detalle->>'id_opcion')::int),
     (SELECT r.id_edicion FROM actividades_aportaciones a JOIN actividades_registros r USING(id_registro) WHERE a.id_aportacion=(fila.detalle->>'id_aportacion')::int),
     (SELECT id_edicion FROM actividades_fotos WHERE id_foto=(fila.detalle->>'id_foto')::int)
    );
    IF destino IS NULL THEN
     referencia:=COALESCE((fila.detalle->>'id_actividad')::int,(fila.detalle->>'id_club')::int,
      (SELECT id_club FROM actividades_fotos WHERE id_foto=(fila.detalle->>'id_foto')::int));
     SELECT id_club_destino INTO destino FROM migraciones_catalogo
      WHERE tipo='equivalencia_actividad' AND id_actividad_anterior=referencia AND fila.creado_en<=migrado_en;
     IF destino IS NULL THEN SELECT id_club INTO destino FROM clubes WHERE id_club=referencia; END IF;
    END IF;
   EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN destino:=NULL; edicion:=NULL;
   END;
   INSERT INTO actividad_clubes(tipo_evento,id_club,id_edicion,id_actor,descripcion,detalles,fecha_creacion,origen,id_historial_actividad_anterior)
    VALUES(fila.accion,destino,edicion,fila.id_usuario,'Acción anterior: '||replace(fila.accion,'_',' '),fila.detalle,fila.creado_en,'catalogo',fila.id)
    ON CONFLICT DO NOTHING;
   IF NOT EXISTS(SELECT 1 FROM actividad_clubes WHERE id_historial_actividad_anterior=fila.id
     AND tipo_evento=fila.accion AND id_actor IS NOT DISTINCT FROM fila.id_usuario
     AND detalles IS NOT DISTINCT FROM fila.detalle AND fecha_creacion=fila.creado_en) THEN
    RAISE EXCEPTION 'Hay entradas de historial incompatibles; la migración se revierte';
   END IF;
  END LOOP;
  DROP TABLE actividades_historial;
 END IF;
END $$;
CREATE OR REPLACE VIEW actividades_historial AS
 SELECT id_evento AS id,id_actor AS id_usuario,tipo_evento AS accion,COALESCE(detalles,'{}'::jsonb) AS detalle,
        fecha_creacion AS creado_en,id_historial_actividad_anterior AS id_anterior
 FROM actividad_clubes WHERE origen='catalogo';

-- Las restricciones se aplican también a llamadas directas y conservan los estados históricos cerrados.
CREATE OR REPLACE FUNCTION fn_catalogo_destino_club() RETURNS trigger AS $$
DECLARE clase TEXT;
BEGIN
 SELECT tipo INTO clase FROM clubes WHERE id_club=NEW.id_club FOR KEY SHARE;
 IF clase IS DISTINCT FROM 'club' THEN
   RAISE EXCEPTION 'Este proceso requiere un club' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$ LANGUAGE plpgsql;
DO $$
DECLARE tabla TEXT;
BEGIN
 FOREACH tabla IN ARRAY ARRAY['inscripciones','formularios','horarios_club','convocatorias','convocatorias_inscripcion','solicitudes_horario','solicitudes_convocatoria','clubes_niveles'] LOOP
   IF to_regclass(tabla) IS NOT NULL THEN
     EXECUTE format('DROP TRIGGER IF EXISTS trg_catalogo_solo_club ON %I',tabla);
     EXECUTE format('CREATE TRIGGER trg_catalogo_solo_club BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fn_catalogo_destino_club()',tabla);
   END IF;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION fn_catalogo_edicion_actividad() RETURNS trigger AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM clubes WHERE id_club=NEW.id_actividad AND tipo='actividad') THEN
  RAISE EXCEPTION 'Una edición requiere una actividad' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_catalogo_edicion_actividad ON actividades_ediciones;
CREATE TRIGGER trg_catalogo_edicion_actividad BEFORE INSERT OR UPDATE ON actividades_ediciones FOR EACH ROW EXECUTE FUNCTION fn_catalogo_edicion_actividad();
CREATE OR REPLACE FUNCTION fn_catalogo_tipo_estable() RETURNS trigger AS $$
BEGIN
 IF NEW.tipo IS DISTINCT FROM OLD.tipo THEN
  RAISE EXCEPTION 'El tipo se conserva; utiliza un traslado revisado para los registros anteriores' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_catalogo_tipo_estable ON clubes;
CREATE TRIGGER trg_catalogo_tipo_estable BEFORE UPDATE OF tipo ON clubes FOR EACH ROW EXECUTE FUNCTION fn_catalogo_tipo_estable();
CREATE OR REPLACE FUNCTION fn_publicacion_destino() RETURNS trigger AS $$
DECLARE clase TEXT;
BEGIN
 SELECT tipo INTO clase FROM clubes WHERE id_club=NEW.id_club FOR KEY SHARE;
 IF (clase='club' AND NEW.id_edicion IS NOT NULL) OR (clase='actividad' AND NEW.id_edicion IS NULL) THEN
  RAISE EXCEPTION 'La publicación debe corresponder al club o a una edición de la actividad' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_publicacion_destino ON publicaciones_oferta;
CREATE TRIGGER trg_publicacion_destino BEFORE INSERT OR UPDATE ON publicaciones_oferta FOR EACH ROW EXECUTE FUNCTION fn_publicacion_destino();
DROP TRIGGER IF EXISTS trg_reaccion_destino ON reacciones_catalogo;
CREATE TRIGGER trg_reaccion_destino BEFORE INSERT OR UPDATE ON reacciones_catalogo FOR EACH ROW EXECUTE FUNCTION fn_publicacion_destino();

-- Impide que el catálogo retirado vuelva a ser una fuente de escritura.
CREATE OR REPLACE FUNCTION fn_catalogo_anterior_lectura() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'Usa el catálogo unificado' USING ERRCODE='55000'; END $$ LANGUAGE plpgsql;
DO $$ BEGIN
 IF to_regclass('actividades_catalogo_anterior') IS NOT NULL THEN
  DROP TRIGGER IF EXISTS trg_catalogo_anterior_lectura ON actividades_catalogo_anterior;
  CREATE TRIGGER trg_catalogo_anterior_lectura BEFORE INSERT OR UPDATE OR DELETE ON actividades_catalogo_anterior FOR EACH ROW EXECUTE FUNCTION fn_catalogo_anterior_lectura();
 END IF;
END $$;
DROP TRIGGER IF EXISTS trg_actividades_compat_lectura ON actividades;
CREATE TRIGGER trg_actividades_compat_lectura INSTEAD OF INSERT OR UPDATE OR DELETE ON actividades FOR EACH ROW EXECUTE FUNCTION fn_catalogo_anterior_lectura();
DO $$
DECLARE vista TEXT;
BEGIN
 FOREACH vista IN ARRAY ARRAY['catalogo_equivalencias_actividades','actividades_legado_clubes','actividades_reacciones','clubes_reacciones','actividades_historial'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS trg_compat_catalogo_lectura ON %I',vista);
  EXECUTE format('CREATE TRIGGER trg_compat_catalogo_lectura INSTEAD OF INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION fn_catalogo_anterior_lectura()',vista);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION fn_catalogo_slug() RETURNS trigger AS $$
DECLARE base TEXT; contador INT:=0;
BEGIN
 IF NEW.slug IS NULL OR NEW.slug='' THEN
  base:=NEW.tipo || '-' || NEW.id_club;
  NEW.slug:=base;
  WHILE EXISTS(SELECT 1 FROM clubes WHERE slug=NEW.slug) LOOP
   contador:=contador+1; NEW.slug:=base || '-' || contador;
  END LOOP;
 END IF;
 RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_catalogo_slug ON clubes;
CREATE TRIGGER trg_catalogo_slug BEFORE INSERT ON clubes FOR EACH ROW EXECUTE FUNCTION fn_catalogo_slug();


-- Información institucional; las fechas, preguntas y aportaciones se configuran en el panel.
-- Se reconoce por plantilla, conserva los datos publicados y evita duplicar un catálogo importado.
DO $$
DECLARE actividad RECORD; direccion TEXT; contador INT;
BEGIN
 FOR actividad IN SELECT * FROM (VALUES
  ('trineo-de-los-suenos','Trineo de los Sueños','Integración con valores de solidaridad y amor al prójimo en comunidad.','/actividades/trineo-suenos-1.jpg','trineo'),
  ('misiones','Misiones','Espacios de servicio y encuentro que fortalecen la vida en comunidad.','/actividades/misiones-3.jpg','misiones')
 ) AS datos(slug,nombre,descripcion,imagen,plantilla) LOOP
  IF NOT EXISTS(SELECT 1 FROM clubes WHERE tipo='actividad' AND plantilla=actividad.plantilla) THEN
   direccion:=actividad.slug; contador:=0;
   WHILE EXISTS(SELECT 1 FROM clubes WHERE slug=direccion) LOOP
    contador:=contador+1; direccion:=actividad.slug || '-actividad-' || contador;
   END LOOP;
   INSERT INTO clubes(tipo,slug,nombre_club,descripcion,categoria,imagen_portada,plantilla,estado_publicacion,cupo_maximo,participacion)
   VALUES('actividad',direccion,actividad.nombre,actividad.descripcion,'Servicio',actividad.imagen,actividad.plantilla,'publicada',NULL,NULL);
  END IF;
 END LOOP;
END $$;

-- Pase de lista de actividades. El acceso se entrega solo por gestión;
-- permanece separado de las ediciones que también se consultan públicamente.
CREATE TABLE IF NOT EXISTS actividades_asistencia_accesos (
    id_edicion INT PRIMARY KEY REFERENCES actividades_ediciones(id_edicion) ON DELETE RESTRICT,
    codigo VARCHAR(8) NOT NULL CHECK (codigo ~ '^[A-HJ-NP-Z2-9]{8}$'),
    id_autor INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS actividades_asistencias (
    id_registro INT PRIMARY KEY REFERENCES actividades_registros(id_registro) ON DELETE RESTRICT,
    estado VARCHAR(12) NOT NULL CHECK (estado IN ('presente', 'anulada')),
    registrada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    origen VARCHAR(10) NOT NULL CHECK (origen IN ('qr', 'codigo', 'manual')),
    id_actor INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    motivo_correccion VARCHAR(500),
    actualizada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (origen <> 'manual' OR LENGTH(BTRIM(motivo_correccion)) > 0),
    CHECK (origen <> 'manual' OR motivo_correccion IS NOT NULL)
);

-- Insignias permanentes por asistencia confirmada a una edición.
-- Se guardan copias del nombre y emblema; al borrar una edición, el historial
-- conserva la insignia y solo desvincula su referencia a esa edición.
-- En bases existentes, agrega la columna antes del trigger y la carga histórica.
--
-- Permisos: no se declara aquí un rol PostgreSQL de runtime ni ACL/RLS. El rol
-- efectivo es el usuario de DATABASE_URL (o DB_USER en local) y debe verificarse
-- en cada entorno. El trigger es SECURITY INVOKER: requiere SELECT en
-- actividades_registros, actividades_ediciones y clubes, INSERT/DELETE en esta
-- tabla y USAGE en expediente_reconocimientos_id_reconocimiento_seq. La lectura
-- del expediente requiere SELECT. La restricción por alumno se aplica en Express.
-- Ver también la nota de permisos de migrate-reconocimientos-permanentes.sql.
ALTER TABLE actividades_registros
    ADD COLUMN IF NOT EXISTS tipo_participante VARCHAR(10) NOT NULL DEFAULT 'unid';

CREATE TABLE IF NOT EXISTS expediente_reconocimientos (
    id_reconocimiento BIGSERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
    id_edicion INT REFERENCES actividades_ediciones(id_edicion) ON DELETE SET NULL,
    tipo_actividad VARCHAR(20) NOT NULL,
    nombre_actividad VARCHAR(160) NOT NULL,
    nombre_edicion VARCHAR(160) NOT NULL,
    anio SMALLINT NOT NULL,
    insignia_key VARCHAR(120),
    oculta BOOLEAN NOT NULL DEFAULT FALSE,
    otorgada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_expediente_reconocimiento_usuario_edicion
    ON expediente_reconocimientos (id_usuario, id_edicion)
    WHERE id_edicion IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expediente_reconocimientos_usuario
    ON expediente_reconocimientos (id_usuario, anio DESC, otorgada_en DESC);

CREATE OR REPLACE FUNCTION fn_sync_expediente_reconocimiento_actividad()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario INT;
    v_tipo_participante VARCHAR(10);
    v_matricula VARCHAR(50);
    v_id_edicion INT;
    v_actividad VARCHAR(160);
    v_plantilla VARCHAR(20);
    v_edicion VARCHAR(160);
    v_fecha DATE;
    v_anio SMALLINT;
    v_insignia_key VARCHAR(120);
BEGIN
    SELECT r.id_usuario, r.tipo_participante, r.matricula,
           e.id_edicion, c.nombre_club, c.plantilla, e.nombre,
           COALESCE(e.fecha_inicio, e.fecha_fin, (NEW.registrada_en AT TIME ZONE 'America/Merida')::date)
      INTO v_usuario, v_tipo_participante, v_matricula,
           v_id_edicion, v_actividad, v_plantilla, v_edicion, v_fecha
      FROM actividades_registros r
      JOIN actividades_ediciones e ON e.id_edicion = r.id_edicion
      JOIN clubes c ON c.id_club = e.id_actividad
     WHERE r.id_registro = NEW.id_registro;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    IF NEW.estado <> 'presente' THEN
        IF v_usuario IS NOT NULL AND v_id_edicion IS NOT NULL THEN
            DELETE FROM expediente_reconocimientos
             WHERE id_usuario = v_usuario AND id_edicion = v_id_edicion;
        END IF;
        RETURN NEW;
    END IF;

    IF v_usuario IS NULL OR v_tipo_participante <> 'unid' OR NULLIF(BTRIM(v_matricula), '') IS NULL THEN
        RETURN NEW;
    END IF;

    v_anio := EXTRACT(YEAR FROM v_fecha)::SMALLINT;
    v_insignia_key := CASE v_plantilla
        WHEN 'trineo' THEN 'trineo-de-los-suenos-' || v_anio::text
        WHEN 'misiones' THEN 'misiones-' || v_anio::text
        ELSE NULL
    END;

    INSERT INTO expediente_reconocimientos (
        id_usuario, id_edicion, tipo_actividad, nombre_actividad,
        nombre_edicion, anio, insignia_key, otorgada_en
    ) VALUES (
        v_usuario, v_id_edicion, v_plantilla, v_actividad,
        v_edicion, v_anio, v_insignia_key, NEW.registrada_en
    )
    ON CONFLICT (id_usuario, id_edicion) WHERE id_edicion IS NOT NULL DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_expediente_reconocimiento_actividad ON actividades_asistencias;
CREATE TRIGGER trg_sync_expediente_reconocimiento_actividad
    AFTER INSERT OR UPDATE OF estado ON actividades_asistencias
    FOR EACH ROW
    EXECUTE FUNCTION fn_sync_expediente_reconocimiento_actividad();

INSERT INTO expediente_reconocimientos (
    id_usuario, id_edicion, tipo_actividad, nombre_actividad,
    nombre_edicion, anio, insignia_key, otorgada_en
)
SELECT r.id_usuario, e.id_edicion, c.plantilla, c.nombre_club, e.nombre,
       EXTRACT(YEAR FROM COALESCE(
           e.fecha_inicio, e.fecha_fin,
           (a.registrada_en AT TIME ZONE 'America/Merida')::date
       ))::SMALLINT,
       CASE c.plantilla
           WHEN 'trineo' THEN 'trineo-de-los-suenos-' || EXTRACT(YEAR FROM COALESCE(e.fecha_inicio, e.fecha_fin, (a.registrada_en AT TIME ZONE 'America/Merida')::date))::int::text
           WHEN 'misiones' THEN 'misiones-' || EXTRACT(YEAR FROM COALESCE(e.fecha_inicio, e.fecha_fin, (a.registrada_en AT TIME ZONE 'America/Merida')::date))::int::text
           ELSE NULL
       END,
       a.registrada_en
  FROM actividades_asistencias a
  JOIN actividades_registros r ON r.id_registro = a.id_registro
  JOIN actividades_ediciones e ON e.id_edicion = r.id_edicion
  JOIN clubes c ON c.id_club = e.id_actividad
 WHERE a.estado = 'presente'
   AND r.id_usuario IS NOT NULL
   AND r.tipo_participante = 'unid'
   AND NULLIF(BTRIM(r.matricula), '') IS NOT NULL
ON CONFLICT (id_usuario, id_edicion) WHERE id_edicion IS NOT NULL DO NOTHING;

-- MISIONES: registro v2 para nuevas ediciones

ALTER TABLE actividades_ediciones ADD COLUMN IF NOT EXISTS configuracion_misiones JSONB;
ALTER TABLE actividades_ediciones DROP CONSTRAINT IF EXISTS chk_configuracion_misiones;
ALTER TABLE actividades_ediciones ADD CONSTRAINT chk_configuracion_misiones CHECK (
  configuracion_misiones IS NULL OR
  ((jsonb_typeof(configuracion_misiones)='object' AND configuracion_misiones->>'version'='2'
    AND (NOT (configuracion_misiones ? 'formato') OR configuracion_misiones->>'formato'='megamisiones-2026')) IS TRUE)
);

ALTER TABLE actividades_registros ALTER COLUMN id_usuario DROP NOT NULL;
ALTER TABLE actividades_registros ALTER COLUMN matricula DROP NOT NULL;
ALTER TABLE actividades_registros ADD COLUMN IF NOT EXISTS tipo_participante VARCHAR(10) NOT NULL DEFAULT 'unid';
ALTER TABLE actividades_registros ADD COLUMN IF NOT EXISTS folio UUID;
ALTER TABLE actividades_registros ADD COLUMN IF NOT EXISTS correo VARCHAR(254);
ALTER TABLE actividades_registros ADD COLUMN IF NOT EXISTS telefono VARCHAR(40);
ALTER TABLE actividades_registros ADD COLUMN IF NOT EXISTS invitado_token_hash VARCHAR(64);
ALTER TABLE actividades_registros ADD COLUMN IF NOT EXISTS pedido JSONB;
ALTER TABLE actividades_registros ADD COLUMN IF NOT EXISTS misiones_snapshot JSONB;
ALTER TABLE actividades_registros ADD COLUMN IF NOT EXISTS codigo_firmado_id UUID;
ALTER TABLE actividades_registros DROP CONSTRAINT IF EXISTS chk_registro_identidad;
ALTER TABLE actividades_registros ADD CONSTRAINT chk_registro_identidad CHECK (
  (tipo_participante='unid' AND id_usuario IS NOT NULL AND matricula IS NOT NULL AND folio IS NULL AND invitado_token_hash IS NULL)
  OR
  (tipo_participante='invitado' AND id_usuario IS NULL AND matricula IS NULL AND folio IS NOT NULL
   AND correo IS NOT NULL AND correo=lower(correo) AND length(correo)>3
   AND telefono IS NOT NULL AND length(telefono)>=7
   AND invitado_token_hash IS NOT NULL AND invitado_token_hash ~ '^[a-f0-9]{64}$')
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_misiones_folio ON actividades_registros(folio) WHERE folio IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_misiones_invitado_correo ON actividades_registros(id_edicion,correo) WHERE tipo_participante='invitado';

CREATE TABLE IF NOT EXISTS misiones_documentos (
  id_documento UUID PRIMARY KEY,
  id_actividad INT NOT NULL REFERENCES clubes(id_club) ON DELETE RESTRICT,
  id_edicion INT REFERENCES actividades_ediciones(id_edicion) ON DELETE RESTRICT,
  id_registro INT REFERENCES actividades_registros(id_registro) ON DELETE RESTRICT,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('plantilla','firmado')),
  public_id TEXT NOT NULL UNIQUE,
  nombre VARCHAR(200) NOT NULL,
  bytes INT NOT NULL CHECK (bytes>0 AND bytes<=10485760),
  sha256 VARCHAR(64) NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((tipo='plantilla' AND id_registro IS NULL) OR (tipo='firmado' AND id_edicion IS NOT NULL AND id_registro IS NOT NULL))
);
ALTER TABLE actividades_registros DROP CONSTRAINT IF EXISTS fk_misiones_codigo_firmado;
ALTER TABLE actividades_registros ADD CONSTRAINT fk_misiones_codigo_firmado FOREIGN KEY(codigo_firmado_id) REFERENCES misiones_documentos(id_documento) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION fn_misiones_version_edicion() RETURNS trigger AS $$
BEGIN
  IF TG_OP='UPDATE' AND (
    (OLD.configuracion_misiones IS NULL) IS DISTINCT FROM (NEW.configuracion_misiones IS NULL)
    OR (OLD.configuracion_misiones->>'formato') IS DISTINCT FROM (NEW.configuracion_misiones->>'formato')
  ) THEN
    IF NOT (OLD.estado='borrador' AND NEW.estado='borrador'
      AND (NEW.configuracion_misiones->>'formato'='megamisiones-2026') IS TRUE
      AND NOT EXISTS (SELECT 1 FROM actividades_registros WHERE id_edicion=OLD.id_edicion)) THEN
      RAISE EXCEPTION 'El formato solo cambia a MEGAMISIONES en borradores sin registros' USING ERRCODE='23514';
    END IF;
  END IF;
  IF NEW.configuracion_misiones IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM clubes WHERE id_club=NEW.id_actividad AND tipo='actividad' AND plantilla='misiones'
  ) THEN RAISE EXCEPTION 'El formulario corresponde únicamente a Misiones' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_misiones_version_edicion ON actividades_ediciones;
CREATE TRIGGER trg_misiones_version_edicion BEFORE INSERT OR UPDATE OF configuracion_misiones,id_actividad ON actividades_ediciones FOR EACH ROW EXECUTE FUNCTION fn_misiones_version_edicion();

CREATE OR REPLACE FUNCTION fn_registro_invitado_misiones() RETURNS trigger AS $$
BEGIN
  IF NEW.tipo_participante='invitado' AND NOT EXISTS (
    SELECT 1 FROM actividades_ediciones e JOIN clubes c ON c.id_club=e.id_actividad
    WHERE e.id_edicion=NEW.id_edicion AND c.tipo='actividad' AND c.plantilla='misiones'
      AND e.configuracion_misiones @> '{"version":2}'::jsonb
  ) AND NOT EXISTS (
    SELECT 1 FROM actividades_ediciones e JOIN clubes c ON c.id_club=e.id_actividad
    WHERE e.id_edicion=NEW.id_edicion AND c.tipo='actividad' AND c.plantilla='trineo'
  ) THEN RAISE EXCEPTION 'Los invitados solo se inscriben a nuevas ediciones de Misiones o Trineo' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_registro_invitado_misiones ON actividades_registros;
CREATE TRIGGER trg_registro_invitado_misiones BEFORE INSERT OR UPDATE ON actividades_registros FOR EACH ROW EXECUTE FUNCTION fn_registro_invitado_misiones();

-- TRINEO: cartas y reservas exclusivas por edición
ALTER TABLE actividades_ediciones ADD COLUMN IF NOT EXISTS cartas_habilitadas BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS actividades_cartas (
  id_carta SERIAL PRIMARY KEY,
  id_edicion INT NOT NULL REFERENCES actividades_ediciones(id_edicion) ON DELETE RESTRICT,
  nombre VARCHAR(150) NOT NULL CHECK (length(trim(nombre))>0),
  edad INT NOT NULL CHECK (edad BETWEEN 0 AND 100),
  deseo TEXT NOT NULL CHECK (length(trim(deseo)) BETWEEN 1 AND 2000),
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
 );
ALTER TABLE actividades_cartas ADD COLUMN IF NOT EXISTS edad INT;
DO $$
DECLARE tipo_edad TEXT;
BEGIN
  SELECT data_type INTO tipo_edad
  FROM information_schema.columns
  WHERE table_schema=current_schema() AND table_name='actividades_cartas' AND column_name='edad';
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='actividades_cartas' AND column_name='edad_meses')
    OR (tipo_edad IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('actividades_cartas') AND conname='chk_carta_edad')) THEN
    ALTER TABLE actividades_cartas ADD COLUMN IF NOT EXISTS edad_nueva INT;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='actividades_cartas' AND column_name='edad_meses') THEN
      UPDATE actividades_cartas SET edad_nueva=LEAST(100,FLOOR(edad_meses / 12.0)::int) WHERE edad_nueva IS NULL;
    END IF;
    IF tipo_edad IS NOT NULL THEN
      UPDATE actividades_cartas SET edad_nueva=LEAST(100,FLOOR(edad::numeric)::int) WHERE edad_nueva IS NULL;
    END IF;
    ALTER TABLE actividades_cartas DROP CONSTRAINT IF EXISTS actividades_cartas_edad_check;
    ALTER TABLE actividades_cartas DROP CONSTRAINT IF EXISTS actividades_cartas_edad_meses_check;
    ALTER TABLE actividades_cartas DROP CONSTRAINT IF EXISTS chk_carta_edad;
    ALTER TABLE actividades_cartas DROP CONSTRAINT IF EXISTS chk_carta_edad_meses;
    ALTER TABLE actividades_cartas DROP COLUMN IF EXISTS edad;
    ALTER TABLE actividades_cartas DROP COLUMN IF EXISTS edad_meses;
    ALTER TABLE actividades_cartas RENAME COLUMN edad_nueva TO edad;
    ALTER TABLE actividades_cartas ALTER COLUMN edad SET NOT NULL;
    ALTER TABLE actividades_cartas ADD CONSTRAINT chk_carta_edad CHECK (edad BETWEEN 0 AND 100);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_cartas_edicion ON actividades_cartas(id_edicion);

CREATE TABLE IF NOT EXISTS actividades_cartas_reservas (
  id_reserva SERIAL PRIMARY KEY,
  id_carta INT NOT NULL REFERENCES actividades_cartas(id_carta) ON DELETE RESTRICT,
  id_registro INT NOT NULL REFERENCES actividades_registros(id_registro) ON DELETE RESTRICT,
  id_aportacion INT REFERENCES actividades_aportaciones(id_aportacion) ON DELETE RESTRICT,
  recibida BOOLEAN NOT NULL DEFAULT FALSE,
  recibida_en TIMESTAMPTZ,
  recibida_por INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  carta_snapshot JSONB NOT NULL CHECK (jsonb_typeof(carta_snapshot)='object'),
  reservada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelada_en TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_carta_reserva_activa ON actividades_cartas_reservas(id_carta) WHERE cancelada_en IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_registro_carta_activa ON actividades_cartas_reservas(id_registro) WHERE cancelada_en IS NULL;
CREATE INDEX IF NOT EXISTS idx_cartas_reservas_registro ON actividades_cartas_reservas(id_registro);

ALTER TABLE actividades_cartas_reservas ALTER COLUMN id_aportacion DROP NOT NULL;
ALTER TABLE actividades_cartas_reservas ADD COLUMN IF NOT EXISTS recibida BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE actividades_cartas_reservas ADD COLUMN IF NOT EXISTS recibida_en TIMESTAMPTZ;
ALTER TABLE actividades_cartas_reservas ADD COLUMN IF NOT EXISTS recibida_por INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL;

-- Solo la reserva vigente hereda la entrega: un aporte antiguo puede tener varias reservas históricas.
UPDATE actividades_cartas_reservas SET recibida=TRUE WHERE recibida_en IS NOT NULL AND NOT recibida;
UPDATE actividades_cartas_reservas v SET recibida=TRUE,recibida_en=a.recibida_en,recibida_por=a.recibida_por
FROM actividades_aportaciones a WHERE v.id_aportacion=a.id_aportacion
  AND v.cancelada_en IS NULL AND NOT v.recibida AND a.estado='recibida';

ALTER TABLE actividades_cartas_reservas DROP CONSTRAINT IF EXISTS chk_carta_entrega_vigente;
ALTER TABLE actividades_cartas_reservas ADD CONSTRAINT chk_carta_entrega_vigente CHECK (cancelada_en IS NULL OR NOT recibida);

CREATE OR REPLACE FUNCTION fn_trineo_carta() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM actividades_ediciones e JOIN clubes c ON c.id_club=e.id_actividad
    WHERE e.id_edicion=NEW.id_edicion AND c.tipo='actividad' AND c.plantilla='trineo') THEN
    RAISE EXCEPTION 'Las cartas corresponden a una edición del Trineo' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_trineo_carta ON actividades_cartas;
CREATE TRIGGER trg_trineo_carta BEFORE INSERT OR UPDATE ON actividades_cartas FOR EACH ROW EXECUTE FUNCTION fn_trineo_carta();

CREATE OR REPLACE FUNCTION fn_trineo_reserva() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM actividades_cartas c
    JOIN actividades_registros r ON r.id_edicion=c.id_edicion
    WHERE c.id_carta=NEW.id_carta AND r.id_registro=NEW.id_registro) THEN
    RAISE EXCEPTION 'La carta y el alumno deben pertenecer a la misma edición del Trineo' USING ERRCODE='23514';
  END IF;
  IF NEW.id_aportacion IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM actividades_aportaciones a
    JOIN actividades_aportes_catalogo o USING(id_opcion)
    JOIN actividades_cartas c ON c.id_edicion=o.id_edicion
    WHERE a.id_aportacion=NEW.id_aportacion AND a.id_registro=NEW.id_registro AND c.id_carta=NEW.id_carta
  ) THEN RAISE EXCEPTION 'La referencia histórica del regalo corresponde a otra inscripción' USING ERRCODE='23514'; END IF;
  IF NEW.cancelada_en IS NOT NULL AND NEW.recibida THEN
    RAISE EXCEPTION 'Una carta con regalo recibido conserva su reserva' USING ERRCODE='23514';
  END IF;
  IF TG_OP='UPDATE' AND OLD.recibida AND
    (NEW.id_carta,NEW.id_registro,NEW.id_aportacion,NEW.carta_snapshot,NEW.cancelada_en,NEW.recibida,NEW.recibida_en)
    IS DISTINCT FROM
    (OLD.id_carta,OLD.id_registro,OLD.id_aportacion,OLD.carta_snapshot,OLD.cancelada_en,OLD.recibida,OLD.recibida_en) THEN
    RAISE EXCEPTION 'El regalo recibido conserva sus datos y fecha de entrega' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_trineo_reserva ON actividades_cartas_reservas;
CREATE TRIGGER trg_trineo_reserva BEFORE INSERT OR UPDATE ON actividades_cartas_reservas FOR EACH ROW EXECUTE FUNCTION fn_trineo_reserva();


-- ============================================================
-- ONBOARDING DE PREFERENCIAS (integrado desde migracion manual)
-- ============================================================
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
    telefono_contacto           VARCHAR(20),
    disposicion_responsable     VARCHAR(20),
    onboarding_completado_en    TIMESTAMPTZ,
    onboarding_omitido_en       TIMESTAMPTZ,
    actualizado_en              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_pref_estado CHECK (estado_onboarding IN ('pendiente', 'completado', 'omitido')),
    CONSTRAINT chk_pref_genero CHECK (genero IS NULL OR genero IN ('mujer', 'hombre', 'otra_identidad', 'prefiero_no_responder')),
    CONSTRAINT chk_pref_frecuencia CHECK (correo_frecuencia IN ('inmediata', 'diaria', 'semanal')),
    CONSTRAINT chk_pref_disposicion CHECK (disposicion_responsable IS NULL OR disposicion_responsable IN ('responsable', 'miembro', 'indeciso'))
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

-- ------------------------------------------------------------
-- Reportes / incidencias (apartado reportar problema)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reportes (
    id_reporte SERIAL PRIMARY KEY,
    folio VARCHAR(32) UNIQUE NOT NULL,
    tipo VARCHAR(80) NOT NULL,
    modulo VARCHAR(160) NOT NULL,
    descripcion TEXT NOT NULL,
    pasos TEXT,
    importancia VARCHAR(20) NOT NULL,
    correo_contacto VARCHAR(160) NOT NULL,
    captura_url TEXT,
    estado VARCHAR(30) NOT NULL DEFAULT 'Pendiente',
    id_usuario INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notas_admin TEXT,
    resuelto_en TIMESTAMPTZ,
    CONSTRAINT chk_reportes_importancia CHECK (importancia IN ('Bajo', 'Medio', 'Alto', 'Crítico')),
    CONSTRAINT chk_reportes_estado CHECK (estado IN ('Pendiente', 'En revisión', 'Resuelto', 'Cerrado'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reportes_folio ON reportes(folio);
CREATE INDEX IF NOT EXISTS idx_reportes_estado ON reportes(estado);
CREATE INDEX IF NOT EXISTS idx_reportes_creado_en ON reportes(creado_en DESC);

-- Los comentarios persistentes se comparten con la migración administrada.
COMMENT ON TABLE clubes IS 'Catálogo común. tipo distingue clubes y actividades; los campos exclusivos de club se validan según el tipo.';
COMMENT ON COLUMN clubes.tipo IS 'club para membresía y convocatorias; actividad para ediciones y registros de actividades.';
COMMENT ON TABLE convocatorias IS 'Invitaciones a alumnos preseleccionados para una postulación; no representa el ciclo general de inscripción.';
COMMENT ON TABLE solicitudes_convocatoria IS 'Solicitud del responsable para abrir o cambiar una convocatoria de inscripción, sujeta a revisión.';
COMMENT ON TABLE convocatorias_inscripcion IS 'Ciclo aprobado de inscripción de un club; los formularios se vinculan al ciclo al que pertenecen.';
COMMENT ON TABLE formularios IS 'Postulación de un alumno a un club y ciclo; conserva la información y respuestas entregadas al solicitar ingreso.';
COMMENT ON TABLE club_formulario_preguntas IS 'Preguntas configurables propias de cada club, por ejemplo talla o información de salud.';
COMMENT ON TABLE formulario_respuestas_extra IS 'Respuestas configurables normalizadas con una copia inmutable del contexto de la pregunta al contestar.';
COMMENT ON TABLE encuestas IS 'Encuestas independientes de las postulaciones; cada una define si es pública anónima o institucional.';
COMMENT ON COLUMN encuestas.tipo_privacidad IS 'publico_anonimo no guarda identidad; institucional requiere sesión y asocia al respondiente.';
COMMENT ON TABLE preguntas IS 'Preguntas de una encuesta específica; detalle_respuestas valida que la respuesta y la pregunta sean de la misma encuesta.';
COMMENT ON TABLE respuestas_encuesta IS 'Un envío completo de una encuesta; id_usuario queda NULL en respuestas anónimas.';
COMMENT ON COLUMN respuestas_encuesta.id_usuario IS 'Identidad solo para encuestas institucionales; las respuestas anónimas históricas no se atribuyen después.';
COMMENT ON TABLE detalle_respuestas IS 'Valores individuales por pregunta; las claves foráneas preservan la pertenencia a la misma encuesta.';
COMMENT ON TABLE noticias IS 'Contenido editorial institucional en documento JSON; url_imagen guarda la imagen de portada.';

COMMIT;
