-- ============================================================
-- MIGRACIÓN: Convocatorias por bloque
-- ============================================================

CREATE TABLE IF NOT EXISTS convocatorias (
  id_convocatoria SERIAL PRIMARY KEY,
  id_club INTEGER NOT NULL REFERENCES clubes(id_club) ON DELETE CASCADE,
  bloque CHAR(1) NOT NULL,
  periodo VARCHAR(50) NOT NULL,
  fecha DATE,
  hora TIME,
  lugar VARCHAR(200),
  enviada BOOLEAN DEFAULT FALSE,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_club ON convocatorias(id_club);
