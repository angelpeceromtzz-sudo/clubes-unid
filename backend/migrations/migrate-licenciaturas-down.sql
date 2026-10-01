-- ============================================================
-- REVERSIÓN — CATÁLOGO DE LICENCIATURAS
-- ============================================================
-- Uso:  psql -U postgres -d clubs_bd -f backend/migrations/migrate-licenciaturas-down.sql
--
-- Este archivo NO se ejecuta automáticamente: backend/migrate.js sólo lee
-- backend/schema.sql. Hay que invocarlo a mano.
--
-- ⚠️  DESTRUCTIVO. Devuelve 'carrera VARCHAR(100)' a formularios y elimina el
--     catálogo. Los valores de carrera OLD no se pueden recuperar: las filas
--     que existían guardaban abreviaturas ('Ing. en Sistemas') que no
--     correspondían a ningún programa del catálogo. Confirmar antes de correrlo
--     contra cualquier base que no sea desechable.
--
-- Orden por FKs: primero se suelta la columna que la referencia, y al final se
-- borra la tabla. formularios e id_licenciatura NO se tocan aquí salvo por el
-- DROP COLUMN de abajo.
-- ============================================================

-- Contador de respuestas por programa, deja de ser válido
DROP INDEX IF EXISTS idx_respuestas_licenciatura;

-- 1. Devolver la columna de texto libre a formularios
ALTER TABLE formularios DROP COLUMN IF EXISTS id_licenciatura;
ALTER TABLE formularios ADD COLUMN IF NOT EXISTS carrera VARCHAR(100);

-- 2. Lo mismo para las respuestas de encuesta, más las columnas de identidad
--    que esta tabla tenía antes del cambio al anonimato estructural.
ALTER TABLE respuestas_encuesta DROP COLUMN IF EXISTS id_licenciatura;
ALTER TABLE respuestas_encuesta ADD COLUMN IF NOT EXISTS nombre    VARCHAR(150);
ALTER TABLE respuestas_encuesta ADD COLUMN IF NOT EXISTS matricula VARCHAR(30);
ALTER TABLE respuestas_encuesta ADD COLUMN IF NOT EXISTS carrera   VARCHAR(100);

-- 3. Sólo al final se puede borrar el catálogo: nada debe apuntarle
DROP TABLE IF EXISTS cat_licenciaturas;