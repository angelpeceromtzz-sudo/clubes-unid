-- ============================================================
-- MIGRACIÓN — HORARIOS_CLUB: EVENTOS PUNTUALES → HORARIO SEMANAL
-- ============================================================
-- Uso:  psql -U postgres -d clubs_bd -f backend/migrations/migrate-horarios-legado-semanal.sql
--
-- Este archivo NO se ejecuta automáticamente: backend/migrate.js sólo lee
-- backend/schema.sql en cada arranque. Hay que invocarlo a mano (auditoría
-- H11: la versión anterior de este bloque vivía dentro de schema.sql, se
-- ejecutaba en cada arranque y contenía un TRUNCATE que podía vaciar la
-- tabla de horarios de una base legada sin aviso).
--
-- ⚠️  DESTRUCTIVO. El bloque vacía horarios_club (TRUNCATE) porque las filas
--     del esquema viejo ('eventos puntuales' con fecha/hora únicos) no tienen
--     equivalente en el horario semanal. ANTES de ejecutarlo:
--       1. Confirmar que la tabla aún usa el esquema legado (ver abajo).
--       2. Hacer respaldo:  pg_dump -t horarios_club clubs_bd > respaldo_horarios.sql
--     En una base ya migrada (sin la columna 'fecha') el bloque NO hace nada
--     (es no-op por la condición IF EXISTS).
--
-- ¿La base sigue legada? (debe devolver 1 fila):
--   SELECT 1 FROM information_schema.columns
--    WHERE table_name = 'horarios_club' AND column_name = 'fecha';
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'horarios_club' AND column_name = 'fecha'
  ) THEN
    TRUNCATE TABLE horarios_club;
    ALTER TABLE horarios_club DROP CONSTRAINT IF EXISTS fk_horario_club;
    ALTER TABLE horarios_club DROP COLUMN IF EXISTS fecha;
    ALTER TABLE horarios_club DROP COLUMN IF EXISTS hora;
    ALTER TABLE horarios_club ADD COLUMN dia_semana   SMALLINT NOT NULL DEFAULT 1 CHECK (dia_semana BETWEEN 0 AND 6);
    ALTER TABLE horarios_club ADD COLUMN hora_inicio  TIME NOT NULL DEFAULT '09:00';
    ALTER TABLE horarios_club ADD COLUMN hora_fin     TIME NOT NULL DEFAULT '11:00';
    ALTER TABLE horarios_club ADD COLUMN descripcion  TEXT DEFAULT '';
    ALTER TABLE horarios_club ADD CONSTRAINT fk_horario_club FOREIGN KEY (id_club) REFERENCES clubes(id_club) ON DELETE CASCADE;
    ALTER TABLE horarios_club ADD CONSTRAINT chk_hora_valida CHECK (hora_fin > hora_inicio);
    RAISE NOTICE 'Migración horarios_club completada: convertido a horario semanal recurrente';
  ELSE
    RAISE NOTICE 'horarios_club ya usa el esquema semanal: no se ejecutó nada.';
  END IF;
END $$;
