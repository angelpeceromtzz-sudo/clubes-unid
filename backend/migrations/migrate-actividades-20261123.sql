-- Actualización manual de Actividades para la versión del 23 de noviembre de 2026.
-- Requiere el catálogo unificado y las migraciones anteriores de Misiones y Trineo.
-- Ejecutar con respaldo previo en el editor SQL de la base correspondiente.
-- No ejecuta schema.sql ni seed.sql. Toda la actualización es una transacción.
-- Se puede repetir sin reiniciar publicaciones, registros, reservas ni entregas.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $$
BEGIN
  IF to_regclass('catalogo_recursos') IS NULL
    OR to_regclass('actividades_ediciones') IS NULL
    OR to_regclass('publicaciones_oferta') IS NULL
    OR to_regclass('actividades_cartas') IS NULL THEN
    RAISE EXCEPTION 'Faltan migraciones anteriores del catálogo de Actividades. No se aplicó esta actualización.';
  END IF;
END $$;

-- Las ediciones existentes conservan la obligación anterior de elegir una carta.
ALTER TABLE actividades_ediciones
  ADD COLUMN IF NOT EXISTS carta_obligatoria BOOLEAN NOT NULL DEFAULT TRUE;

-- Las publicaciones anteriores permanecen publicadas; se conserva su contenido.
ALTER TABLE publicaciones_oferta
  ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'publicada';
ALTER TABLE publicaciones_oferta
  ADD COLUMN IF NOT EXISTS estado_propuesta VARCHAR(20);
ALTER TABLE publicaciones_oferta
  ADD COLUMN IF NOT EXISTS contenido_pendiente VARCHAR(300);
ALTER TABLE publicaciones_oferta
  ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT;
ALTER TABLE publicaciones_oferta
  ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW();
UPDATE publicaciones_oferta SET estado = 'publicada' WHERE estado IS NULL;

ALTER TABLE publicaciones_oferta DROP CONSTRAINT IF EXISTS chk_publicacion_estado;
ALTER TABLE publicaciones_oferta ADD CONSTRAINT chk_publicacion_estado
  CHECK (estado IN ('borrador', 'pendiente', 'publicada', 'rechazada', 'retirada'));
ALTER TABLE publicaciones_oferta DROP CONSTRAINT IF EXISTS chk_publicacion_estado_propuesta;
ALTER TABLE publicaciones_oferta ADD CONSTRAINT chk_publicacion_estado_propuesta
  CHECK (estado_propuesta IS NULL OR estado_propuesta IN ('borrador', 'pendiente', 'rechazada'));

CREATE TABLE IF NOT EXISTS reacciones_publicacion (
  id_reaccion BIGSERIAL PRIMARY KEY,
  id_publicacion INT NOT NULL REFERENCES publicaciones_oferta(id_publicacion) ON DELETE CASCADE,
  id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  reaccion VARCHAR(10) NOT NULL CHECK (reaccion IN ('like', 'love', 'clap')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id_publicacion, id_usuario)
);
ALTER TABLE reacciones_publicacion ENABLE ROW LEVEL SECURITY;

-- Edad entera: 0 significa menos de un año; 1 a 100 son años cumplidos.
-- Conserva la columna cuando ya tiene años enteros.
-- Para las versiones decimales o en meses, aplica la conversión individual.
DO $$
DECLARE tipo_edad TEXT;
BEGIN
  SELECT data_type INTO tipo_edad
  FROM information_schema.columns
  WHERE table_schema = current_schema()
    AND table_name = 'actividades_cartas' AND column_name = 'edad';

  IF tipo_edad IN ('smallint', 'integer', 'bigint') AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'actividades_cartas' AND column_name = 'edad_meses'
  ) THEN
    ALTER TABLE actividades_cartas DROP CONSTRAINT IF EXISTS actividades_cartas_edad_check;
    ALTER TABLE actividades_cartas DROP CONSTRAINT IF EXISTS chk_carta_edad;
    ALTER TABLE actividades_cartas ADD CONSTRAINT chk_carta_edad CHECK (edad BETWEEN 0 AND 100);
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'actividades_cartas' AND column_name = 'edad_meses'
  ) OR (tipo_edad IS NOT NULL AND (
    tipo_edad = 'numeric'
    OR NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = to_regclass('actividades_cartas') AND conname = 'chk_carta_edad'
    )
  )) THEN
    ALTER TABLE actividades_cartas ADD COLUMN IF NOT EXISTS edad_nueva INT;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'actividades_cartas' AND column_name = 'edad_meses'
    ) THEN
      UPDATE actividades_cartas
        SET edad_nueva = LEAST(100, FLOOR(edad_meses / 12.0)::int)
        WHERE edad_nueva IS NULL;
    END IF;
    IF tipo_edad IS NOT NULL THEN
      UPDATE actividades_cartas
        SET edad_nueva = LEAST(100, FLOOR(edad::numeric)::int)
        WHERE edad_nueva IS NULL;
    END IF;
    ALTER TABLE actividades_cartas DROP CONSTRAINT IF EXISTS actividades_cartas_edad_check;
    ALTER TABLE actividades_cartas DROP CONSTRAINT IF EXISTS actividades_cartas_edad_meses_check;
    ALTER TABLE actividades_cartas DROP CONSTRAINT IF EXISTS chk_carta_edad;
    ALTER TABLE actividades_cartas DROP CONSTRAINT IF EXISTS chk_carta_edad_meses;
    ALTER TABLE actividades_cartas DROP COLUMN IF EXISTS edad;
    ALTER TABLE actividades_cartas DROP COLUMN IF EXISTS edad_meses;
    ALTER TABLE actividades_cartas RENAME COLUMN edad_nueva TO edad;
    ALTER TABLE actividades_cartas ALTER COLUMN edad SET NOT NULL;
    ALTER TABLE actividades_cartas ADD CONSTRAINT chk_carta_edad CHECK (edad BETWEEN 0 AND 100);
  END IF;
END $$;

-- Verifica las consultas que dependen de las columnas y tablas nuevas.
-- Si falta algo, PostgreSQL revierte la transacción completa.
SELECT carta_obligatoria FROM actividades_ediciones LIMIT 0;
SELECT estado, estado_propuesta, contenido_pendiente, motivo_rechazo, actualizado_en
  FROM publicaciones_oferta LIMIT 0;
SELECT id_publicacion, id_usuario, reaccion FROM reacciones_publicacion LIMIT 0;
SELECT edad FROM actividades_cartas LIMIT 0;

COMMIT;

SELECT 'Actualización de Actividades del 23/11/2026 completada' AS resultado;
