-- Aplicación manual, antes del despliegue. Conserva ediciones y respuestas anteriores.
BEGIN;

ALTER TABLE actividades_ediciones ADD COLUMN IF NOT EXISTS configuracion_misiones JSONB;
ALTER TABLE actividades_ediciones DROP CONSTRAINT IF EXISTS chk_configuracion_misiones;
ALTER TABLE actividades_ediciones ADD CONSTRAINT chk_configuracion_misiones CHECK (
  configuracion_misiones IS NULL OR
  ((jsonb_typeof(configuracion_misiones)='object' AND configuracion_misiones->>'version'='2') IS TRUE)
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
  IF TG_OP='UPDATE' AND (OLD.configuracion_misiones IS NULL) IS DISTINCT FROM (NEW.configuracion_misiones IS NULL) THEN
    RAISE EXCEPTION 'La versión del formulario se conserva para cada edición' USING ERRCODE='23514';
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
  ) THEN RAISE EXCEPTION 'Los invitados solo se inscriben a nuevas ediciones de Misiones' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_registro_invitado_misiones ON actividades_registros;
CREATE TRIGGER trg_registro_invitado_misiones BEFORE INSERT OR UPDATE ON actividades_registros FOR EACH ROW EXECUTE FUNCTION fn_registro_invitado_misiones();

COMMIT;
