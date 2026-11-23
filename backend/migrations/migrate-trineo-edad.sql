-- Amplía la edad de las cartas del Trineo: de 1 mes a 100 años.
-- El valor se guarda en años con un decimal: 0.1 representa aproximadamente 1 mes
-- y 1.5 se presenta como 1 año y 6 meses.
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='actividades_cartas' AND column_name='edad') THEN
    ALTER TABLE actividades_cartas DROP CONSTRAINT IF EXISTS actividades_cartas_edad_check;
    ALTER TABLE actividades_cartas DROP CONSTRAINT IF EXISTS chk_carta_edad;
    ALTER TABLE actividades_cartas ALTER COLUMN edad TYPE NUMERIC(5,1) USING edad::numeric;
    ALTER TABLE actividades_cartas ADD CONSTRAINT chk_carta_edad CHECK (edad BETWEEN 0.1 AND 100);
  END IF;
END $$;
COMMIT;
