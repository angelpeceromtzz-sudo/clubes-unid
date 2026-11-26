-- Vincula cada sesión confiable a una generación aleatoria de 32 bytes y
-- añade un token anterior con 60 segundos de gracia para tolerar respuestas
-- perdidas durante la rotación.
--
-- Aplicar manualmente una vez por base existente:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -f backend/migrations/migrate-dispositivos-confiables-generacion.sql
--
-- Es transaccional e idempotente. No se ejecuta automáticamente.

BEGIN;

ALTER TABLE dispositivos_confiables
    ADD COLUMN IF NOT EXISTS generacion VARCHAR(64),
    ADD COLUMN IF NOT EXISTS token_hash_anterior VARCHAR(64),
    ADD COLUMN IF NOT EXISTS token_anterior_expira_en TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_dispositivo_generacion'
          AND conrelid = 'dispositivos_confiables'::regclass
    ) THEN
        ALTER TABLE dispositivos_confiables
            ADD CONSTRAINT chk_dispositivo_generacion
            CHECK (generacion IS NULL OR generacion ~ '^[a-f0-9]{64}$');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_dispositivo_token_hash_anterior'
          AND conrelid = 'dispositivos_confiables'::regclass
    ) THEN
        ALTER TABLE dispositivos_confiables
            ADD CONSTRAINT chk_dispositivo_token_hash_anterior
            CHECK (token_hash_anterior IS NULL OR token_hash_anterior ~ '^[a-f0-9]{64}$');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_dispositivo_gracia_token_anterior'
          AND conrelid = 'dispositivos_confiables'::regclass
    ) THEN
        ALTER TABLE dispositivos_confiables
            ADD CONSTRAINT chk_dispositivo_gracia_token_anterior CHECK (
                (token_hash_anterior IS NULL AND token_anterior_expira_en IS NULL)
                OR
                (token_hash_anterior IS NOT NULL AND token_anterior_expira_en IS NOT NULL)
            );
    END IF;
END $$;

-- Las filas previas no tienen una generación que validar. Se revocan en vez
-- de inventar una: fail-closed y reactivación posterior mediante un nuevo OTP.
UPDATE dispositivos_confiables
   SET revocado_en = CURRENT_TIMESTAMP
 WHERE generacion IS NULL
   AND revocado_en IS NULL;

COMMIT;
