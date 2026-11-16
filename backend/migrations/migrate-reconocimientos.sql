-- ============================================================
-- MIGRACIÓN — RECONOCIMIENTOS (INSIGNIAS) DEL ALUMNO
-- ============================================================
-- Idempotente.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS reconocimientos_usuario (
    id_reconocimiento SERIAL PRIMARY KEY,
    id_usuario        INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_noticia        INT REFERENCES noticias(id_noticia) ON DELETE SET NULL,
    codigo            VARCHAR(40) NOT NULL,
    descripcion       VARCHAR(200),
    fecha_otorgado    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    otorgado_por      INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reconocimientos_usuario
    ON reconocimientos_usuario(id_usuario, fecha_otorgado DESC);

COMMIT;