-- ============================================================
-- MIGRACIÓN: institutional_id, deleted_at, last_login
-- ============================================================

-- Agrego la columna sin UNIQUE primero porque si hay datos existentes
-- con duplicados (por ejemplo si dos usuarios tienen el mismo correo
-- local) el ALTER TABLE va a fallar. Primero la pobló, luego verifico,
-- y solo si no hay duplicados aplico el constraint.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS institutional_id VARCHAR(50);

-- Para los usuarios que ya se habían registrado con Microsoft antes de
-- esta migración, les extraigo el ID institucional de su correo.
-- Ej: "00906641@red.unid.mx" → "00906641"
-- Solo afecta a los que tienen microsoft_id (no toco usuarios locales).
UPDATE usuarios
SET institutional_id = SPLIT_PART(correo_institucional, '@', 1)
WHERE institutional_id IS NULL
  AND microsoft_id IS NOT NULL
  AND correo_institucional IS NOT NULL
  AND POSITION('@' IN correo_institucional) > 0;

-- Verificación manual: ejecutar esto antes de aplicar el UNIQUE
-- SELECT institutional_id, COUNT(*)
-- FROM usuarios
-- WHERE institutional_id IS NOT NULL
-- GROUP BY institutional_id
-- HAVING COUNT(*) > 1;

-- Uso bloque DO porque ADD CONSTRAINT no es idempotente y esta migración
-- se ejecuta en cada arranque del servidor. Si el constraint ya existe,
-- el ALTER TABLE lanzaría error y rompería el startup.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_usuarios_institutional_id'
    ) THEN
        ALTER TABLE usuarios ADD CONSTRAINT uq_usuarios_institutional_id UNIQUE (institutional_id);
    END IF;
END $$;

-- Las columnas de soft delete y último login. Las pongo aparte porque
-- son independientes del institutional_id y no quiero mezclar responsabilidades
-- en la misma migración conceptual.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Índices para que las búsquedas por institutional_id y el filtro de
-- usuarios activos no sean scans completos a la tabla.
CREATE INDEX IF NOT EXISTS idx_usuarios_institutional_id ON usuarios(institutional_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_deleted_at ON usuarios(deleted_at);
