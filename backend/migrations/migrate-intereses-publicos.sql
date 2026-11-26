-- Visibilidad de los intereses del alumno en su perfil público.
-- Idempotente. El dueño siempre ve sus intereses; este flag solo controla a los visitantes.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS intereses_publicos BOOLEAN NOT NULL DEFAULT FALSE;
