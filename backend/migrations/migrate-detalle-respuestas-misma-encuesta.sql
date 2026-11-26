-- Evita que el detalle de una respuesta apunte a preguntas de otra encuesta.
-- El backfill sólo copia la encuesta ya asociada a cada respuesta.
-- Si hay datos ambiguos/anómalos, la migración falla antes de modificar nada.

-- Crear la columna antes del preflight: la condición que valida un valor ya
-- existente depende de ella. La transacción del runner revierte también este
-- ALTER si el preflight encuentra datos ambiguos.
-- Bloquear en el orden de escritura (respuesta y después detalle) evita que
-- una respuesta concurrente aparezca entre el preflight y SET NOT NULL.
LOCK TABLE respuestas_encuesta, detalle_respuestas, preguntas
    IN SHARE ROW EXCLUSIVE MODE;

ALTER TABLE detalle_respuestas ADD COLUMN IF NOT EXISTS id_encuesta INT;

DO $$
DECLARE
    v_detalle INTEGER;
    v_respuesta INTEGER;
    v_encuesta_respuesta INTEGER;
    v_pregunta INTEGER;
    v_encuesta_pregunta INTEGER;
BEGIN
    SELECT d.id_detalle, d.id_respuesta, r.id_encuesta, d.id_pregunta, p.id_encuesta
      INTO v_detalle, v_respuesta, v_encuesta_respuesta, v_pregunta, v_encuesta_pregunta
    FROM detalle_respuestas d
    LEFT JOIN respuestas_encuesta r ON r.id_respuesta = d.id_respuesta
    LEFT JOIN preguntas p ON p.id_pregunta = d.id_pregunta
    WHERE r.id_respuesta IS NULL
       OR p.id_pregunta IS NULL
       OR r.id_encuesta <> p.id_encuesta
       OR (d.id_encuesta IS NOT NULL AND d.id_encuesta <> r.id_encuesta)
       OR p.tipo = 'licenciatura'
    ORDER BY d.id_detalle
    LIMIT 1;

    IF v_detalle IS NOT NULL THEN
        RAISE EXCEPTION
          'Migración detenida: detalle % (respuesta %, encuesta %, pregunta %, encuesta de pregunta %) tiene referencias huérfanas, cruzadas o usa una pregunta de licenciatura; no se modificaron filas',
          v_detalle, v_respuesta, v_encuesta_respuesta, v_pregunta, v_encuesta_pregunta;
    END IF;
END $$;

UPDATE detalle_respuestas d
SET id_encuesta = r.id_encuesta
FROM respuestas_encuesta r
WHERE r.id_respuesta = d.id_respuesta
  AND d.id_encuesta IS NULL;

ALTER TABLE detalle_respuestas ALTER COLUMN id_encuesta SET NOT NULL;

-- PostgreSQL requiere claves candidatas únicas para las FKs compuestas.
CREATE UNIQUE INDEX IF NOT EXISTS uq_respuestas_id_encuesta
    ON respuestas_encuesta(id_respuesta, id_encuesta);
CREATE UNIQUE INDEX IF NOT EXISTS uq_preguntas_id_encuesta
    ON preguntas(id_pregunta, id_encuesta);

-- Conserva los nombres y las acciones de borrado actuales.
ALTER TABLE detalle_respuestas DROP CONSTRAINT IF EXISTS fk_detalle_respuesta;
ALTER TABLE detalle_respuestas DROP CONSTRAINT IF EXISTS fk_detalle_pregunta;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_detalle_respuesta'
          AND conrelid = 'detalle_respuestas'::regclass
    ) THEN
        ALTER TABLE detalle_respuestas
            ADD CONSTRAINT fk_detalle_respuesta
            FOREIGN KEY (id_respuesta, id_encuesta)
            REFERENCES respuestas_encuesta(id_respuesta, id_encuesta)
            ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_detalle_pregunta'
          AND conrelid = 'detalle_respuestas'::regclass
    ) THEN
        ALTER TABLE detalle_respuestas
            ADD CONSTRAINT fk_detalle_pregunta
            FOREIGN KEY (id_pregunta, id_encuesta)
            REFERENCES preguntas(id_pregunta, id_encuesta)
            ON DELETE RESTRICT;
    END IF;
END $$;
