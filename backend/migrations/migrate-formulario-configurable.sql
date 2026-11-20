-- Migración: preguntas configurables por club y respuestas extra.
-- Idempotente.
BEGIN;

CREATE TABLE IF NOT EXISTS club_formulario_preguntas (
    id_pregunta SERIAL PRIMARY KEY,
    id_club INT NOT NULL REFERENCES clubes(id_club) ON DELETE CASCADE,
    etiqueta VARCHAR(200) NOT NULL,
    tipo VARCHAR(30) NOT NULL DEFAULT 'texto',
    configuracion JSONB NOT NULL DEFAULT '{}'::jsonb,
    obligatorio BOOLEAN NOT NULL DEFAULT FALSE,
    orden INT NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_club_formulario_preguntas_club ON club_formulario_preguntas(id_club, orden);

ALTER TABLE formularios
  ADD COLUMN IF NOT EXISTS respuestas_extra JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMIT;