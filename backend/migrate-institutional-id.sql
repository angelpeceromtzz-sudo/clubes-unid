-- ============================================================
-- MIGRACIÓN: institutional_id, deleted_at, last_login
-- ============================================================

-- 1. AGREGAR COLUMNA institutional_id (SIN UNIQUE aún)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS institutional_id VARCHAR(50);

-- 2. POBLAR institutional_id para usuarios existentes con microsoft_id
--    Extrae la parte local del correo_institucional (split en '@')
UPDATE usuarios
SET institutional_id = SPLIT_PART(correo_institucional, '@', 1)
WHERE institutional_id IS NULL
  AND microsoft_id IS NOT NULL
  AND correo_institucional IS NOT NULL
  AND POSITION('@' IN correo_institucional) > 0;

-- 3. VERIFICAR duplicados (consulta de control, solo referencia)
--    SELECT institutional_id, COUNT(*)
--    FROM usuarios
--    WHERE institutional_id IS NOT NULL
--    GROUP BY institutional_id
--    HAVING COUNT(*) > 1;

-- 4. AGREGAR CONSTRAINT UNIQUE (idempotente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_usuarios_institutional_id'
    ) THEN
        ALTER TABLE usuarios ADD CONSTRAINT uq_usuarios_institutional_id UNIQUE (institutional_id);
    END IF;
END $$;

-- 5. COLUMNAS restantes
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- 6. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_usuarios_institutional_id ON usuarios(institutional_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_deleted_at ON usuarios(deleted_at);
