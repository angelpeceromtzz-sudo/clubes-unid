-- Aplicar manualmente antes del despliegue. No modifica aportaciones anteriores.
BEGIN;

-- TRINEO: cartas y reservas exclusivas por edición
ALTER TABLE actividades_ediciones ADD COLUMN IF NOT EXISTS cartas_habilitadas BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS actividades_cartas (
  id_carta SERIAL PRIMARY KEY,
  id_edicion INT NOT NULL REFERENCES actividades_ediciones(id_edicion) ON DELETE RESTRICT,
  nombre VARCHAR(150) NOT NULL CHECK (length(trim(nombre))>0),
  edad INT NOT NULL CHECK (edad BETWEEN 1 AND 18),
  deseo TEXT NOT NULL CHECK (length(trim(deseo)) BETWEEN 1 AND 2000),
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
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
    WHERE c.id_carta=NEW.id_carta AND r.id_registro=NEW.id_registro AND r.id_usuario IS NOT NULL) THEN
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

COMMIT;
