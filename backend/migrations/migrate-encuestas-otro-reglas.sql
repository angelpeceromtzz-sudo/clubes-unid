-- Asegura las columnas, límites e índices de la opción especial «Otro».
-- Conserva respuestas históricas de más de 70 caracteres: NOT VALID omite sólo
-- la comprobación inicial; nuevas filas y filas modificadas sí deben cumplirla.
ALTER TABLE opciones_pregunta
    ADD COLUMN IF NOT EXISTS es_otro BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE detalle_respuestas
    ADD COLUMN IF NOT EXISTS texto_otro TEXT;

DO $$
DECLARE
    v_pregunta INTEGER;
BEGIN
    SELECT id_pregunta INTO v_pregunta
    FROM opciones_pregunta
    WHERE es_otro
    GROUP BY id_pregunta
    HAVING COUNT(*) > 1
    ORDER BY id_pregunta
    LIMIT 1;

    IF v_pregunta IS NOT NULL THEN
        RAISE EXCEPTION
          'Migración detenida: la pregunta % tiene más de una opción marcada como «Otro»',
          v_pregunta;
    END IF;
END $$;

ALTER TABLE detalle_respuestas DROP CONSTRAINT IF EXISTS chk_detalle_texto_otro;
ALTER TABLE detalle_respuestas
    ADD CONSTRAINT chk_detalle_texto_otro
    CHECK (texto_otro IS NULL OR char_length(texto_otro) <= 70) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS uq_opcion_otro
    ON opciones_pregunta(id_pregunta) WHERE es_otro;
CREATE INDEX IF NOT EXISTS idx_detalle_texto_otro
    ON detalle_respuestas(id_pregunta) WHERE texto_otro IS NOT NULL;
