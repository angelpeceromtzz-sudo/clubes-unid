-- Migración: teléfono de contacto opcional en preferencias_usuario.
-- Idempotente.
BEGIN;

ALTER TABLE preferencias_usuario
  ADD COLUMN IF NOT EXISTS telefono_contacto VARCHAR(20);

COMMIT;