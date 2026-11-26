-- id_estatus_club solo describe clubes. Actividades usan estado_publicacion.
-- Se limpian únicamente los valores placeholder 'proximamente'; cualquier otro
-- valor inesperado detiene la migración antes de modificar datos.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM clubes c
      LEFT JOIN cat_estatus_clubes e ON e.id_estatus_club = c.id_estatus_club
     WHERE c.tipo = 'actividad'
       AND c.id_estatus_club IS NOT NULL
       AND e.nombre_estatus IS DISTINCT FROM 'proximamente'
  ) THEN
    RAISE EXCEPTION 'Migración detenida: hay actividades con un estatus distinto de proximamente; revisa esas filas antes de continuar';
  END IF;
END $$;

ALTER TABLE clubes ALTER COLUMN id_estatus_club DROP NOT NULL;
UPDATE clubes c
   SET id_estatus_club = NULL
  FROM cat_estatus_clubes e
 WHERE c.tipo = 'actividad'
   AND c.id_estatus_club = e.id_estatus_club
   AND e.nombre_estatus = 'proximamente';

ALTER TABLE clubes DROP CONSTRAINT IF EXISTS chk_catalogo_datos_club;
ALTER TABLE clubes ADD CONSTRAINT chk_catalogo_datos_club CHECK (
  (tipo = 'club' AND id_estatus_club IS NOT NULL AND cupo_maximo IS NOT NULL AND cupo_maximo IN (10,15,20,25,30,40,50) AND participacion IS NOT NULL)
  OR (tipo = 'actividad' AND id_estatus_club IS NULL AND cupo_maximo IS NULL AND participacion IS NULL)
);
