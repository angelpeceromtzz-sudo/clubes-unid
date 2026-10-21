-- Migración aditiva: opción especial «Otro» con texto libre por pregunta.
--
-- Qué añade:
--   · opciones_pregunta.es_otro   → marca la opción especial de una pregunta
--                                     (como máximo una por pregunta).
--   · detalle_respuestas.texto_otro → texto libre que escribió el alumno al
--                                     elegir esa opción. Vive en su propia
--                                     columna para no tocar el CHECK de «un
--                                     valor por fila».
--
-- Es aditiva: sólo añade columnas, un CHECK y dos índices. No modifica ni
-- borra filas, así que las encuestas y respuestas anteriores quedan intactas
-- y se comportan exactamente igual que hasta ahora (sus opciones tienen
-- es_otro = false y sus respuestas no tienen texto_otro).
--
-- Despliegue:
--   · El runner (`backend/migrate.js`) ejecuta `backend/schema.sql` en cada
--     arranque, y schema.sql ya incluye estas columnas y estos índices (con
--     ALTER idempotentes), así que en los entornos que arrancan con el runner
--     los cambios se aplican solos al arrancar.
--   · Este archivo está para los entornos donde schema.sql ya se aplicó y no
--     se vuelve a ejecutar de principio a fin (por ejemplo, una base ya
--     migrada a mano o una que aplica las migraciones por pasos). Es un paso
--     manual y planificado, y se puede aplicar varias veces: todas las
--     sentencias son idempotentes.
--
-- Verificado contra la base local de desarrollo (localhost). NO se ha
-- aplicado en ningún entorno remoto.

ALTER TABLE opciones_pregunta
    ADD COLUMN IF NOT EXISTS es_otro BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE detalle_respuestas
    ADD COLUMN IF NOT EXISTS texto_otro TEXT;

ALTER TABLE detalle_respuestas
    DROP CONSTRAINT IF EXISTS chk_detalle_texto_otro;

ALTER TABLE detalle_respuestas
    ADD CONSTRAINT chk_detalle_texto_otro CHECK (texto_otro IS NULL OR char_length(texto_otro) <= 200);

-- Una sola opción «Otro» por pregunta (mismo criterio que la pregunta única
-- de licenciatura).
CREATE UNIQUE INDEX IF NOT EXISTS uq_opcion_otro
    ON opciones_pregunta (id_pregunta) WHERE es_otro;

-- Lectura de los textos libres de «Otro» en los resultados.
CREATE INDEX IF NOT EXISTS idx_detalle_texto_otro
    ON detalle_respuestas (id_pregunta) WHERE texto_otro IS NOT NULL;
