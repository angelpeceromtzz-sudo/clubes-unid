-- ============================================================
-- REVERSIÓN — ONBOARDING DE PREFERENCIAS DE ALUMNOS
-- ============================================================
-- Uso:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--         -f backend/migrations/migrate-onboarding-preferencias-down.sql
--
-- ⚠️  DESTRUCTIVO. Elimina todas las preferencias, propuestas y el historial
--     de consentimiento de los alumnos. Solo en bases desechables o con
--     autorización explícita y respaldo previo.
--
-- Orden por FKs: primero las tablas que referencian, después los catálogos.
-- No toca usuarios, clubes, notificaciones ni OTP.
-- ============================================================

DROP TABLE IF EXISTS historial_consentimiento_correo;
DROP TABLE IF EXISTS actividades_propuestas;
DROP TABLE IF EXISTS usuario_motivaciones;
DROP TABLE IF EXISTS usuario_actividades_interes;
DROP TABLE IF EXISTS usuario_categorias_interes;
DROP TABLE IF EXISTS preferencias_usuario;
DROP TABLE IF EXISTS cat_motivaciones;
DROP TABLE IF EXISTS cat_actividades_interes;
DROP TABLE IF EXISTS cat_categorias_interes;
