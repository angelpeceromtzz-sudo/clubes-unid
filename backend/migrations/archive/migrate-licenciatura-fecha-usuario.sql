-- Migración: licenciatura y fecha de nacimiento en usuarios + modalidad en cat_licenciaturas.
-- Idempotente: se puede ejecutar varias veces sin efectos secundarios.
-- NO se ejecuta al arrancar el backend. Aplicar a mano con:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/migrations/migrate-licenciatura-fecha-usuario.sql

BEGIN;

-- 1) Modalidad en cat_licenciaturas (escolarizada por defecto).
ALTER TABLE cat_licenciaturas
  ADD COLUMN IF NOT EXISTS modalidad VARCHAR(20) NOT NULL DEFAULT 'escolarizada';

DO $$
BEGIN
  -- Eliminar constraint viejo si existe y recrear con las nuevas modalidades.
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_licenciatura_modalidad') THEN
    ALTER TABLE cat_licenciaturas DROP CONSTRAINT chk_licenciatura_modalidad;
  END IF;
  ALTER TABLE cat_licenciaturas
    ADD CONSTRAINT chk_licenciatura_modalidad
    CHECK (modalidad IN ('escolarizada', 'ejecutiva', 'dual', 'maestria'));
END $$;

-- Marcar las licenciaturas ejecutivas (RVOE distintos, programas separados).
UPDATE cat_licenciaturas
SET modalidad = 'ejecutiva'
WHERE nombre IN (
  'Licenciatura en Administración de Empresas',
  'Licenciatura en Contabilidad Financiera',
  'Licenciatura en Derecho',
  'Licenciatura en Educación y Tecnologías para el Aprendizaje'
);

-- Insertar licenciaturas adicionales (idempotente).
INSERT INTO cat_licenciaturas (nombre, orden, modalidad) VALUES
  ('Licenciatura Modelo Dual', 15, 'dual'),
  ('Licenciatura en Administración y Dirección Empresarial Modelo Dual', 16, 'dual'),
  ('Maestría en Derecho Constitucional y Amparo', 17, 'maestria')
ON CONFLICT (nombre) DO UPDATE SET orden = EXCLUDED.orden, modalidad = EXCLUDED.modalidad;

-- 2) Licenciatura y fecha de nacimiento en usuarios.
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS id_licenciatura INT
    REFERENCES cat_licenciaturas(id_licenciatura) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;

CREATE INDEX IF NOT EXISTS idx_usuarios_licenciatura ON usuarios(id_licenciatura);

COMMIT;