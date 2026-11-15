-- Migración aditiva, manual e idempotente. No ejecuta seed.sql ni modifica clubes.
BEGIN;

CREATE TABLE IF NOT EXISTS actividades (
  id_actividad SERIAL PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  nombre VARCHAR(160) NOT NULL,
  descripcion TEXT NOT NULL,
  categoria VARCHAR(80) NOT NULL,
  url_imagen TEXT NOT NULL DEFAULT '',
  plantilla VARCHAR(20) NOT NULL DEFAULT 'general' CHECK (plantilla IN ('general', 'trineo', 'misiones')),
  mostrar_en_oferta BOOLEAN NOT NULL DEFAULT TRUE,
  estado VARCHAR(20) NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','pendiente','publicada','rechazada','archivada')),
  id_autor INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  id_responsable INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  propuesta JSONB,
  estado_propuesta VARCHAR(20) CHECK (estado_propuesta IN ('borrador','pendiente','rechazada')),
  motivo_rechazo TEXT,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS actividades_ediciones (
  id_edicion SERIAL PRIMARY KEY,
  id_actividad INT NOT NULL REFERENCES actividades(id_actividad) ON DELETE RESTRICT,
  nombre VARCHAR(160) NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  lugar VARCHAR(240) NOT NULL DEFAULT '',
  fecha_inicio DATE,
  fecha_fin DATE,
  hora_inicio VARCHAR(5) NOT NULL DEFAULT '',
  requiere_registro BOOLEAN NOT NULL DEFAULT FALSE,
  campos_registro JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(campos_registro) = 'array'),
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
  id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
  nombre_completo VARCHAR(150) NOT NULL,
  matricula VARCHAR(50) NOT NULL,
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

CREATE TABLE IF NOT EXISTS actividades_fotos (
  id_foto SERIAL PRIMARY KEY,
  id_edicion INT NOT NULL REFERENCES actividades_ediciones(id_edicion) ON DELETE RESTRICT,
  url_imagen TEXT NOT NULL,
  pie VARCHAR(300) NOT NULL DEFAULT '',
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','publicada','rechazada','eliminada')),
  id_autor INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS actividades_reacciones (
  id_edicion INT NOT NULL REFERENCES actividades_ediciones(id_edicion) ON DELETE RESTRICT,
  id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  reaccion VARCHAR(10) NOT NULL CHECK (reaccion IN ('like','love','clap')),
  PRIMARY KEY (id_edicion, id_usuario)
);

CREATE TABLE IF NOT EXISTS actividades_historial (
  id SERIAL PRIMARY KEY,
  id_usuario INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  accion VARCHAR(80) NOT NULL,
  detalle JSONB NOT NULL DEFAULT '{}'::jsonb,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS actividades_legado_clubes (
  id_club INT PRIMARY KEY REFERENCES clubes(id_club) ON DELETE RESTRICT,
  id_edicion INT NOT NULL REFERENCES actividades_ediciones(id_edicion) ON DELETE RESTRICT,
  resumen JSONB NOT NULL,
  migrado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_actividades_ediciones_actividad ON actividades_ediciones(id_actividad);
CREATE INDEX IF NOT EXISTS idx_actividades_registros_usuario ON actividades_registros(id_usuario);
CREATE INDEX IF NOT EXISTS idx_actividades_fotos_edicion ON actividades_fotos(id_edicion, estado);
CREATE INDEX IF NOT EXISTS idx_actividades_aportes_edicion ON actividades_aportes_catalogo(id_edicion);

-- Contenido informativo existente; no inventa fechas, responsables, tallas ni aportaciones.
INSERT INTO actividades (slug,nombre,descripcion,categoria,url_imagen,plantilla,estado) VALUES
('trineo-de-los-suenos','Trineo de los Sueños','Integración con valores de solidaridad y amor al prójimo en comunidad.','Servicio','/actividades/trineo-suenos-1.jpg','trineo','publicada'),
('misiones','Misiones','Espacios de servicio y encuentro que fortalecen la vida en comunidad.','Servicio','/actividades/misiones-3.jpg','misiones','publicada')
ON CONFLICT (slug) DO NOTHING;

COMMIT;
