-- Migración aditiva: tabla de códigos OTP para el acceso con correo
-- institucional (Fase 1).
--
-- Solo crea una tabla nueva y sus índices. No borra, no altera ni migra datos
-- existentes de `usuarios`, `cat_roles` ni de ninguna otra tabla.
--
-- El código OTP nunca se guarda en texto plano: `codigo_hash` contiene un
-- HMAC-SHA-256 calculado con OTP_PEPPER. Puede conservar códigos consumidos,
-- pero solo uno activo (`consumido_en IS NULL`); una solicitud nueva reutiliza
-- el registro activo.
--
-- FUENTE DE VERDAD de la tabla `otp_codigos`. schema.sql ya NO la crea y el
-- backend ya no ejecuta migraciones al arrancar. Se aplica a mano (psql) en una
-- ventana controlada, con respaldo previo y autorización explícita:
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/migrations/migrate-otp-codigos.sql
--
-- Es idempotente (CREATE ... IF NOT EXISTS y ALTER TABLE ... ENABLE ROW LEVEL
-- SECURITY pueden repetirse sin efectos secundarios) y se ejecuta dentro de una
-- transacción: si una sentencia falla, no queda una migración a medias.
-- No hace DROP, TRUNCATE ni DELETE, y no modifica `usuarios`.

BEGIN;

CREATE TABLE IF NOT EXISTS otp_codigos (
    id_otp BIGSERIAL PRIMARY KEY,
    correo_institucional VARCHAR(100) NOT NULL,
    codigo_hash VARCHAR(255) NOT NULL,
    expira_en TIMESTAMPTZ NOT NULL,
    intentos SMALLINT NOT NULL DEFAULT 0,
    max_intentos SMALLINT NOT NULL DEFAULT 5,
    consumido_en TIMESTAMPTZ,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_solicitud INET,
    user_agent TEXT,
    CONSTRAINT chk_otp_intentos_positivos CHECK (intentos >= 0),
    CONSTRAINT chk_otp_max_intentos_positivo CHECK (max_intentos > 0)
);

CREATE INDEX IF NOT EXISTS idx_otp_codigos_activos
    ON otp_codigos(correo_institucional, consumido_en, expira_en);
CREATE INDEX IF NOT EXISTS idx_otp_codigos_expira
    ON otp_codigos(expira_en);

-- Un solo código activo por correo, garantizado por la base de datos. El
-- upsert de otpStore.js usa este índice parcial.
CREATE UNIQUE INDEX IF NOT EXISTS uq_otp_codigo_activo_por_correo
    ON otp_codigos(correo_institucional)
    WHERE consumido_en IS NULL;

ALTER TABLE otp_codigos ENABLE ROW LEVEL SECURITY;

COMMIT;
