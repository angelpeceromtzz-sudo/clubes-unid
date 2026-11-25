-- Añade modos de privacidad sin borrar ni alterar respuestas existentes.
-- Las encuestas actuales se clasifican como públicas anónimas. Como no
-- almacenaban identidad, no es posible atribuir usuarios a respuestas viejas.
ALTER TABLE encuestas
    ADD COLUMN IF NOT EXISTS tipo_privacidad VARCHAR(24) NOT NULL DEFAULT 'publico_anonimo';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_encuesta_privacidad'
          AND conrelid = 'encuestas'::regclass
    ) THEN
        ALTER TABLE encuestas
            ADD CONSTRAINT chk_encuesta_privacidad
            CHECK (tipo_privacidad IN ('publico_anonimo', 'institucional'));
    END IF;
END $$;

ALTER TABLE respuestas_encuesta
    ADD COLUMN IF NOT EXISTS id_usuario INT
    REFERENCES usuarios(id_usuario) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_respuesta_encuesta_usuario
    ON respuestas_encuesta (id_encuesta, id_usuario)
    WHERE id_usuario IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_respuestas_encuesta_usuario
    ON respuestas_encuesta (id_usuario)
    WHERE id_usuario IS NOT NULL;

