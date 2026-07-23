CREATE TABLE IF NOT EXISTS actividad_clubes (
  id_evento       SERIAL PRIMARY KEY,
  tipo_evento     VARCHAR(40)  NOT NULL,
  id_club         INT REFERENCES clubes(id_club),
  id_actor        INT REFERENCES usuarios(id_usuario),
  descripcion     TEXT         NOT NULL,
  detalles        JSONB,
  fecha_creacion  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_actividad_clubes_fecha ON actividad_clubes (fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_actividad_clubes_club  ON actividad_clubes (id_club);
