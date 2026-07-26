-- Migración: Convertir horarios_club de eventos puntuales a horario semanal recurrente
-- Ejecutar: psql -U tu_usuario -d tu_base -f migrate-horarios-semanal.sql

BEGIN;

-- Eliminar datos existentes (tabla nueva sin datos reales aún)
TRUNCATE TABLE horarios_club;

-- Eliminar columna fecha y agregar estructura semanal
ALTER TABLE horarios_club DROP CONSTRAINT IF EXISTS fk_horario_club;
ALTER TABLE horarios_club DROP COLUMN IF EXISTS fecha;
ALTER TABLE horarios_club DROP COLUMN IF EXISTS hora;

ALTER TABLE horarios_club
  ADD COLUMN dia_semana   SMALLINT NOT NULL DEFAULT 1 CHECK (dia_semana BETWEEN 0 AND 6),
  ADD COLUMN hora_inicio  TIME NOT NULL DEFAULT '09:00',
  ADD COLUMN hora_fin     TIME NOT NULL DEFAULT '11:00',
  ADD COLUMN descripcion  TEXT DEFAULT '';

ALTER TABLE horarios_club
  ADD CONSTRAINT fk_horario_club FOREIGN KEY (id_club) REFERENCES clubes(id_club) ON DELETE CASCADE,
  ADD CONSTRAINT chk_hora_valida CHECK (hora_fin > hora_inicio);

-- Índice para búsquedas por club
CREATE INDEX IF NOT EXISTS idx_horarios_club_id ON horarios_club(id_club);

COMMIT;
