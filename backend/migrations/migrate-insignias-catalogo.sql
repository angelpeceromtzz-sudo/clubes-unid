-- Catálogo global de insignias y vinculación con ediciones de actividades.
-- Idempotente.

-- 1) Catálogo de insignias (plantillas reutilizables).
CREATE TABLE IF NOT EXISTS insignias (
  id_insignia    BIGSERIAL PRIMARY KEY,
  nombre         VARCHAR(60)  NOT NULL,
  descripcion    VARCHAR(500),
  imagen         VARCHAR(255),
  activa         BOOLEAN      NOT NULL DEFAULT TRUE,
  creada_en      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  actualizada_en TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 2) Vinculación con ediciones de actividades.
ALTER TABLE actividades_ediciones
  ADD COLUMN IF NOT EXISTS id_insignia BIGINT REFERENCES insignias(id_insignia) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS otorgar_automaticamente BOOLEAN NOT NULL DEFAULT FALSE;

-- 3) Vinculación en los reconocimientos otorgados.
ALTER TABLE expediente_reconocimientos
  ADD COLUMN IF NOT EXISTS id_insignia BIGINT REFERENCES insignias(id_insignia) ON DELETE SET NULL;
