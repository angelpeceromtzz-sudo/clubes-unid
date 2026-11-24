-- Recuerda una sola cuenta OTP por navegador durante 30 días.
-- Guarda hashes, nunca el token secreto del dispositivo.
-- Aplicar manualmente una vez en cada base existente; no se ejecuta al arrancar.

BEGIN;

CREATE TABLE IF NOT EXISTS dispositivos_confiables (
    id_dispositivo BIGSERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    hash_dispositivo VARCHAR(64) NOT NULL UNIQUE,
    token_hash VARCHAR(64) NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultimo_uso TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_en TIMESTAMPTZ NOT NULL,
    revocado_en TIMESTAMPTZ,
    CONSTRAINT chk_dispositivo_hash CHECK (hash_dispositivo ~ '^[a-f0-9]{64}$'),
    CONSTRAINT chk_dispositivo_token_hash CHECK (token_hash ~ '^[a-f0-9]{64}$')
);

CREATE INDEX IF NOT EXISTS idx_dispositivos_confiables_usuario
    ON dispositivos_confiables (id_usuario, expira_en);

COMMIT;
