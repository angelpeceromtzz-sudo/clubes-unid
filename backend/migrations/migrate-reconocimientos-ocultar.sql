-- Permite ocultar insignias del perfil público sin borrarlas.
ALTER TABLE expediente_reconocimientos
  ADD COLUMN IF NOT EXISTS oculta BOOLEAN NOT NULL DEFAULT FALSE;
