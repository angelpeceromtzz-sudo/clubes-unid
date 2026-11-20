-- Aplicación manual antes de desplegar la API. No modifica ediciones ni registros.
BEGIN;

ALTER TABLE actividades_ediciones DROP CONSTRAINT IF EXISTS chk_configuracion_misiones;
ALTER TABLE actividades_ediciones ADD CONSTRAINT chk_configuracion_misiones CHECK (
  configuracion_misiones IS NULL OR
  ((jsonb_typeof(configuracion_misiones)='object' AND configuracion_misiones->>'version'='2'
    AND (NOT (configuracion_misiones ? 'formato') OR configuracion_misiones->>'formato'='megamisiones-2026')) IS TRUE)
);

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

COMMIT;
