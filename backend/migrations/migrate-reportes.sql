-- Tabla de reportes de problemas (soporte).
-- Idempotente: seguro de aplicar en bases existentes.

CREATE TABLE IF NOT EXISTS reportes (
    id_reporte SERIAL PRIMARY KEY,
    folio VARCHAR(32) UNIQUE NOT NULL,
    tipo VARCHAR(80) NOT NULL,
    modulo VARCHAR(160) NOT NULL,
    descripcion TEXT NOT NULL,
    pasos TEXT,
    importancia VARCHAR(20) NOT NULL,
    correo_contacto VARCHAR(160) NOT NULL,
    captura_url TEXT,
    estado VARCHAR(30) NOT NULL DEFAULT 'Pendiente',
    id_usuario INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notas_admin TEXT,
    resuelto_en TIMESTAMPTZ,
    CONSTRAINT chk_reportes_importancia CHECK (importancia IN ('Bajo', 'Medio', 'Alto', 'Crítico')),
    CONSTRAINT chk_reportes_estado CHECK (estado IN ('Pendiente', 'En revisión', 'Resuelto', 'Cerrado'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reportes_folio ON reportes(folio);
CREATE INDEX IF NOT EXISTS idx_reportes_estado ON reportes(estado);
CREATE INDEX IF NOT EXISTS idx_reportes_creado_en ON reportes(creado_en DESC);
