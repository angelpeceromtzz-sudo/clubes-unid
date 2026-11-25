-- Migración idempotente: registra aceptación de documentos legales.
-- No ejecutar en producción sin revisión.

BEGIN;

CREATE TABLE IF NOT EXISTS aceptaciones_legales (
    id_usuario   INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    documento    VARCHAR(20) NOT NULL,
    version      VARCHAR(20) NOT NULL,
    aceptado_en  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_usuario, documento),
    CONSTRAINT chk_legal_documento CHECK (documento IN ('terminos', 'privacidad'))
);

COMMIT;