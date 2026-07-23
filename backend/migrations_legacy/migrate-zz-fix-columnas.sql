-- ============================================================
-- MIGRACIÓN: Agregar columnas faltantes (formularios y notificaciones)
-- ============================================================

-- Tabla formularios
ALTER TABLE formularios ADD COLUMN IF NOT EXISTS id_convocatoria INT;
ALTER TABLE formularios ADD COLUMN IF NOT EXISTS fecha_oferta TIMESTAMPTZ;
ALTER TABLE formularios ADD COLUMN IF NOT EXISTS fecha_expiracion TIMESTAMPTZ;
ALTER TABLE formularios ADD COLUMN IF NOT EXISTS fecha_respuesta TIMESTAMPTZ;
ALTER TABLE formularios ADD COLUMN IF NOT EXISTS motivo_rechazo VARCHAR(100);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_formulario_convocatoria'
    ) THEN
        ALTER TABLE formularios
        ADD CONSTRAINT fk_formulario_convocatoria
        FOREIGN KEY (id_convocatoria) REFERENCES convocatorias(id_convocatoria) ON DELETE SET NULL;
    END IF;
END $$;

-- Tabla notificaciones
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS id_destinatario INT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_notif_destinatario'
    ) THEN
        ALTER TABLE notificaciones
        ADD CONSTRAINT fk_notif_destinatario
        FOREIGN KEY (id_destinatario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE;
    END IF;
END $$;

-- Tabla convocatorias
ALTER TABLE convocatorias ADD COLUMN IF NOT EXISTS bloque CHAR(1);
ALTER TABLE convocatorias ADD COLUMN IF NOT EXISTS periodo VARCHAR(50);
ALTER TABLE convocatorias ADD COLUMN IF NOT EXISTS fecha DATE;
ALTER TABLE convocatorias ADD COLUMN IF NOT EXISTS hora TIME;
ALTER TABLE convocatorias ADD COLUMN IF NOT EXISTS lugar VARCHAR(200);
ALTER TABLE convocatorias ADD COLUMN IF NOT EXISTS enviada BOOLEAN DEFAULT FALSE;
ALTER TABLE convocatorias ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMPTZ DEFAULT NOW();