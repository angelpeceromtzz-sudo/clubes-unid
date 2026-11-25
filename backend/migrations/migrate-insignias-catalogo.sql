-- Catálogo global de insignias y vinculación con ediciones de actividades.
-- Idempotente. NO aplicar sin revisar con el equipo.

-- 1) Catálogo de insignias (plantillas reutilizables).
CREATE TABLE IF NOT EXISTS insignias (
  id_insignia        BIGSERIAL PRIMARY KEY,
  nombre             VARCHAR(60)  NOT NULL,
  descripcion        VARCHAR(500),
  imagen             VARCHAR(255),
  activa             BOOLEAN      NOT NULL DEFAULT TRUE,
  creada_en          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  actualizada_en     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 2) Vinculación con ediciones de actividades.
ALTER TABLE actividades_ediciones
  ADD COLUMN IF NOT EXISTS id_insignia            BIGINT REFERENCES insignias(id_insignia) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS otorgar_automaticamente BOOLEAN NOT NULL DEFAULT FALSE;

-- 3) Vinculación en los reconocimientos otorgados.
ALTER TABLE expediente_reconocimientos
  ADD COLUMN IF NOT EXISTS id_insignia BIGINT REFERENCES insignias(id_insignia) ON DELETE SET NULL;

-- 4) Índice para evitar duplicados por insignia (además del existente por nombre).
CREATE UNIQUE INDEX IF NOT EXISTS uq_expediente_reconocimiento_insignia_usuario
  ON expediente_reconocimientos (id_usuario, id_insignia)
  WHERE id_insignia IS NOT NULL;

-- 5) Migrar insignias manuales existentes al catálogo (una por nombre+imagen).
INSERT INTO insignias (nombre, descripcion, imagen, activa)
SELECT DISTINCT nombre_actividad, NULL, insignia_key, TRUE
  FROM expediente_reconocimientos
 WHERE tipo_actividad = 'manual'
   AND NOT EXISTS (
     SELECT 1 FROM insignias i WHERE i.nombre = expediente_reconocimientos.nombre_actividad
   );
