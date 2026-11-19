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
  id_aportacion INT NOT NULL REFERENCES actividades_aportaciones(id_aportacion) ON DELETE RESTRICT,
  carta_snapshot JSONB NOT NULL CHECK (jsonb_typeof(carta_snapshot)='object'),
  reservada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelada_en TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_carta_reserva_activa ON actividades_cartas_reservas(id_carta) WHERE cancelada_en IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_registro_carta_activa ON actividades_cartas_reservas(id_registro) WHERE cancelada_en IS NULL;
CREATE INDEX IF NOT EXISTS idx_cartas_reservas_registro ON actividades_cartas_reservas(id_registro);

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
    JOIN actividades_aportaciones a ON a.id_registro=r.id_registro
    JOIN actividades_aportes_catalogo o ON o.id_opcion=a.id_opcion AND o.id_edicion=c.id_edicion
    WHERE c.id_carta=NEW.id_carta AND r.id_registro=NEW.id_registro
      AND a.id_aportacion=NEW.id_aportacion AND r.id_usuario IS NOT NULL) THEN
    RAISE EXCEPTION 'La carta, el alumno y la aportación deben pertenecer a la misma edición' USING ERRCODE='23514';
  END IF;
  IF NEW.cancelada_en IS NOT NULL AND EXISTS (
    SELECT 1 FROM actividades_aportaciones WHERE id_aportacion=NEW.id_aportacion AND estado='recibida'
  ) THEN
    RAISE EXCEPTION 'Una carta con regalo recibido conserva su reserva' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_trineo_reserva ON actividades_cartas_reservas;
CREATE TRIGGER trg_trineo_reserva BEFORE INSERT OR UPDATE ON actividades_cartas_reservas FOR EACH ROW EXECUTE FUNCTION fn_trineo_reserva();

COMMIT;
