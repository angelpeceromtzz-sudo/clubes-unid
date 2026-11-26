-- Migración aditiva: licenciaturas ejecutivas al catálogo de programas.
--
-- Las cuatro licenciaturas ejecutivas que faltaban en `cat_licenciaturas`.
-- Son programas DISTINTOS de los regulares, no nombres alternativos de los
-- que ya estaban (cada uno tiene su propio RVOE):
--   - Contabilidad Financiera          (20221767) vs. Contabilidad y Finanzas (20193846)
--   - Derecho                           (20193847) vs. Derecho y Ciencias Jurídicas (20193848)
--   - Administración de Empresas        vs. Administración Empresarial
--   - Educación y Tecnologías para el Aprendizaje (sin equivalente previo)
--
-- Aditiva e idempotente: sólo INSERT ... ON CONFLICT. No borra, no renumera y
-- no altera los ids de las 10 filas existentes (`formularios.id_licenciatura`
-- y `respuestas_encuesta.id_licenciatura` son FK ON DELETE RESTRICT y siguen
-- apuntando igual).
--
-- Esta migración NO se ejecuta automáticamente en el arranque: `migrate.js`
-- sólo corre `schema.sql`, que ya incluye estas cuatro filas. Se aplica a
-- mano (psql) cuando hay que actualizar una base existente sin redesplegar:
--
--   psql "$DATABASE_URL" -f backend/migrations/migrate-licenciaturas-ejecutivas.sql
--
-- Tras aplicarla, invalidar el caché del catálogo para que el <select> no
-- sirva la lista vieja: POST /api/catalogos/licenciaturas/cache (admin) o
-- reiniciar el backend (el endpoint cachea 10 minutos).

INSERT INTO cat_licenciaturas (nombre, orden) VALUES
    ('Licenciatura en Administración de Empresas', 11),
    ('Licenciatura en Contabilidad Financiera', 12),
    ('Licenciatura en Derecho', 13),
    ('Licenciatura en Educación y Tecnologías para el Aprendizaje', 14)
ON CONFLICT (nombre) DO UPDATE SET orden = EXCLUDED.orden;
