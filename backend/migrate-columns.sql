-- Columnas adicionales necesarias para el esquema completo
-- Se ejecuta después de las migraciones que crean tablas

-- 1. microsoft_id para autenticación híbrida
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS microsoft_id VARCHAR(255) UNIQUE;
ALTER TABLE usuarios ALTER COLUMN password_hash DROP NOT NULL;

-- 2. lugar y horario para clubes
ALTER TABLE clubes ADD COLUMN IF NOT EXISTS lugar VARCHAR(255) DEFAULT '';
ALTER TABLE clubes ADD COLUMN IF NOT EXISTS horario VARCHAR(100) DEFAULT '';

-- 3. id_destinatario para notificaciones personales
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS id_destinatario INT;
CREATE INDEX IF NOT EXISTS idx_notificaciones_destinatario ON notificaciones(id_destinatario);

-- 4. Rol Servicios Escolares
INSERT INTO cat_roles (id_rol, nombre_rol) VALUES (4, 'servicios_escolares')
ON CONFLICT (id_rol) DO NOTHING;
UPDATE cat_roles SET nombre_rol = 'servicios_escolares' WHERE id_rol = 4;

-- 5. Usuario de prueba para Servicios Escolares
INSERT INTO usuarios (nombre_completo, correo_institucional, password_hash, id_rol)
VALUES (
  'Roberto Carlos Mendoza Lopez',
  'escolares@unid.mx',
  '$2a$10$xczneQc8cHO3ZipxNcZ1EuK0CnWNHwH8BmSLq0/ChZzXiSlHYy9e2',
  4
)
ON CONFLICT (correo_institucional) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  id_rol = EXCLUDED.id_rol;
