-- Un club necesita cupo y tipo de participación; una actividad no debe
-- almacenar esos atributos exclusivos de clubes. No corrige filas por sí sola.
DO $$
DECLARE
    v_id_club INTEGER;
BEGIN
    SELECT id_club
      INTO v_id_club
    FROM clubes
    WHERE tipo = 'actividad'
      AND (cupo_maximo IS NOT NULL OR participacion IS NOT NULL)
    ORDER BY id_club
    LIMIT 1;

    IF v_id_club IS NOT NULL THEN
        RAISE EXCEPTION
          'Migración detenida: la actividad % tiene cupo o participación de club; revisa la fila sin borrar datos',
          v_id_club;
    END IF;
END $$;

ALTER TABLE clubes DROP CONSTRAINT IF EXISTS chk_catalogo_datos_club;
ALTER TABLE clubes ADD CONSTRAINT chk_catalogo_datos_club CHECK (
  (tipo = 'club' AND cupo_maximo IS NOT NULL AND cupo_maximo IN (10,15,20,25,30,40,50) AND participacion IS NOT NULL)
  OR (tipo = 'actividad' AND cupo_maximo IS NULL AND participacion IS NULL)
);
