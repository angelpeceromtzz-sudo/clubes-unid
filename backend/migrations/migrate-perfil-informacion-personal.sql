-- Campos editables del perfil y preferencias de visibilidad.
-- Idempotente: aplicar en bases existentes antes de desplegar la versión nueva.
-- La transacción la controla backend/apply-migrations.js.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS biografia VARCHAR(500),
  ADD COLUMN IF NOT EXISTS fecha_nacimiento_publica BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS telefono_celular VARCHAR(20),
  ADD COLUMN IF NOT EXISTS telefono_publico BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS facebook_url VARCHAR(2048),
  ADD COLUMN IF NOT EXISTS x_url VARCHAR(2048),
  ADD COLUMN IF NOT EXISTS instagram_url VARCHAR(2048),
  ADD COLUMN IF NOT EXISTS sitio_web_url VARCHAR(2048);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_usuarios_biografia' AND conrelid = 'usuarios'::regclass) THEN
    ALTER TABLE usuarios ADD CONSTRAINT chk_usuarios_biografia
      CHECK (biografia IS NULL OR char_length(biografia) <= 500);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_usuarios_telefono_perfil' AND conrelid = 'usuarios'::regclass) THEN
    ALTER TABLE usuarios ADD CONSTRAINT chk_usuarios_telefono_perfil
      CHECK (telefono_celular IS NULL OR (char_length(telefono_celular) <= 20 AND telefono_celular ~ '^\+?[0-9[:space:]().-]+$' AND char_length(regexp_replace(telefono_celular, '[^0-9]', '', 'g')) BETWEEN 7 AND 15));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_usuarios_perfil_visible' AND conrelid = 'usuarios'::regclass) THEN
    ALTER TABLE usuarios ADD CONSTRAINT chk_usuarios_perfil_visible
      CHECK ((NOT fecha_nacimiento_publica OR fecha_nacimiento IS NOT NULL) AND (NOT telefono_publico OR telefono_celular IS NOT NULL));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_usuarios_enlaces_perfil' AND conrelid = 'usuarios'::regclass) THEN
    ALTER TABLE usuarios ADD CONSTRAINT chk_usuarios_enlaces_perfil CHECK (
      (facebook_url IS NULL OR lower(facebook_url) ~ '^https?://[^[:space:]]+$') AND
      (x_url IS NULL OR lower(x_url) ~ '^https?://[^[:space:]]+$') AND
      (instagram_url IS NULL OR lower(instagram_url) ~ '^https?://[^[:space:]]+$') AND
      (sitio_web_url IS NULL OR lower(sitio_web_url) ~ '^https?://[^[:space:]]+$')
    );
  END IF;
END $$;
