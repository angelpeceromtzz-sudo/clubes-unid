-- Simplifica la edad de las cartas: 0 = menos de 1 año, 1 a 100 = años enteros.
-- Convierte cartas antiguas en años y la versión intermedia almacenada en meses.
BEGIN;
DO $$
DECLARE tipo_edad TEXT;
BEGIN
  SELECT data_type INTO tipo_edad
  FROM information_schema.columns
  WHERE table_schema=current_schema() AND table_name='actividades_cartas' AND column_name='edad';

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='actividades_cartas' AND column_name='edad_meses')
    OR (tipo_edad IS NOT NULL AND (
    tipo_edad = 'numeric'
    OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('actividades_cartas') AND conname='chk_carta_edad')
    )) THEN
    ALTER TABLE actividades_cartas ADD COLUMN IF NOT EXISTS edad_nueva INT;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='actividades_cartas' AND column_name='edad_meses') THEN
      UPDATE actividades_cartas SET edad_nueva=LEAST(100,FLOOR(edad_meses / 12.0)::int) WHERE edad_nueva IS NULL;
    END IF;
    IF tipo_edad IS NOT NULL THEN
      UPDATE actividades_cartas SET edad_nueva=LEAST(100,FLOOR(edad::numeric)::int) WHERE edad_nueva IS NULL;
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
COMMIT;
