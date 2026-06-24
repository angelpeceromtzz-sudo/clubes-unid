-- ============================================================
-- MIGRACIÓN FINAL: Convovatorias, Nuevos Estatus, id_destinatario
-- Se ejecuta ÚLTIMO (prefijo z) para corregir constraint tras migrate-formularios.sql
-- ============================================================

-- 1. Eliminar constraint obsoleto que solo permite Pendiente/Aceptado/Rechazado
ALTER TABLE formularios DROP CONSTRAINT IF EXISTS chk_status;

-- 2. Migrar estatus legacy Aceptado → Admitido
UPDATE formularios SET status = 'Admitido' WHERE status = 'Aceptado';

-- 3. Agregar nuevo constraint con los estatus del flujo completo
ALTER TABLE formularios ADD CONSTRAINT chk_status CHECK (
    status IN ('Pendiente', 'En revisión', 'Preseleccionado', 'Convocado', 'Admitido', 'Rechazado')
);

-- 4. Crear tabla de convocatorias
CREATE TABLE IF NOT EXISTS convocatorias (
    id_convocatoria SERIAL PRIMARY KEY,
    id_formulario INT NOT NULL,
    id_club INT NOT NULL,
    id_presidente INT NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    lugar VARCHAR(255) NOT NULL,
    descripcion TEXT DEFAULT '',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_conv_formulario FOREIGN KEY (id_formulario) REFERENCES formularios(id_formulario) ON DELETE CASCADE,
    CONSTRAINT fk_conv_club FOREIGN KEY (id_club) REFERENCES clubes(id_club) ON DELETE CASCADE,
    CONSTRAINT fk_conv_presidente FOREIGN KEY (id_presidente) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_convocatorias_club ON convocatorias(id_club);
CREATE INDEX IF NOT EXISTS idx_convocatorias_formulario ON convocatorias(id_formulario);

-- 5. Agregar columna id_destinatario para notificaciones personales
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS id_destinatario INT;
CREATE INDEX IF NOT EXISTS idx_notificaciones_destinatario ON notificaciones(id_destinatario);
