-- Responsables adicionales, invitados de Trineo y gestión de cartas por inscripción.
-- Aplicar después de migrate-actividades-20261123.sql.
-- La migración es idempotente.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $$
BEGIN
  IF to_regclass('clubes') IS NULL
    OR to_regclass('usuarios') IS NULL
    OR to_regclass('actividades_ediciones') IS NULL
    OR to_regclass('actividades_registros') IS NULL
    OR to_regclass('actividades_cartas_reservas') IS NULL THEN
    RAISE EXCEPTION 'Faltan tablas base del catálogo de Actividades. No se aplicó esta actualización.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS actividades_responsables (
  id_actividad INT NOT NULL REFERENCES clubes(id_club) ON DELETE CASCADE,
  id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id_actividad, id_usuario)
);
CREATE INDEX IF NOT EXISTS idx_actividades_responsables_usuario ON actividades_responsables(id_usuario);

SELECT id_actividad, id_usuario FROM actividades_responsables LIMIT 0;

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

CREATE OR REPLACE FUNCTION fn_trineo_reserva() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM actividades_cartas c
    JOIN actividades_registros r ON r.id_edicion=c.id_edicion
    WHERE c.id_carta=NEW.id_carta AND r.id_registro=NEW.id_registro) THEN
    RAISE EXCEPTION 'La carta y el participante deben pertenecer a la misma edición del Trineo' USING ERRCODE='23514';
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

COMMIT;

SELECT 'Responsables adicionales, invitados de Trineo y gestión de cartas habilitados' AS resultado;
