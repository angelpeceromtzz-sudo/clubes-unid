-- ============================================================
-- REVERSIÓN — MÓDULO DE ENCUESTAS (PBI-10)
-- ============================================================
-- Uso:  psql -U postgres -d clubs_bd -f backend/migrations/migrate-encuestas-down.sql
--
-- Este archivo NO se ejecuta automáticamente: backend/migrate.js sólo lee
-- backend/schema.sql. Hay que invocarlo a mano.
--
-- ⚠️  DESTRUCTIVO. Borra las 5 tablas del módulo y con ellas todas las
--     encuestas, preguntas, opciones y respuestas registradas. Confirmar
--     antes de correrlo contra cualquier base que no sea desechable.
--
-- No hace falta borrar índices, constraints ni secuencias: PostgreSQL los
-- elimina junto con la tabla (las secuencias de SERIAL son propiedad de su
-- columna).
--
-- Nota: el orden importa por las FKs. Se va de hijas a padres.
-- ============================================================

-- Registro histórico de respuestas
DROP TABLE IF EXISTS detalle_respuestas;

-- Encabezado de cada respuesta
DROP TABLE IF EXISTS respuestas_encuesta;

-- Opciones de las preguntas
DROP TABLE IF EXISTS opciones_pregunta;

-- Preguntas de cada encuesta
DROP TABLE IF EXISTS preguntas;

-- Encuestas
DROP TABLE IF EXISTS encuestas;

-- ============================================================
-- NOTA SOBRE fn_actualizar_fecha()
-- ============================================================
-- El esquema renombró fn_actualizar_fecha_diapositiva() a fn_actualizar_fecha()
-- porque su cuerpo es genérico. Ese cambio se quedaría: afecta también a
-- diapositivas_hero, que está fuera del alcance de este módulo, y revertirlo
-- sólo volvería a un nombre engañoso.
