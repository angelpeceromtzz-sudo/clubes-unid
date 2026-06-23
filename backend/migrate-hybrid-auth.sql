-- ============================================================
-- MIGRACIÓN: SOPORTE PARA AUTENTICACIÓN HÍBRIDA
-- ============================================================
-- 1.  Agrega columna microsoft_id (único, nullable) para
--     vincular cuentas institucionales de Microsoft Entra ID.
-- 2.  Hace password_hash nullable para que los usuarios que
--     solo inician sesión con Microsoft no requieran contraseña.
-- ============================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS microsoft_id VARCHAR(255) UNIQUE;

ALTER TABLE usuarios
  ALTER COLUMN password_hash DROP NOT NULL;
