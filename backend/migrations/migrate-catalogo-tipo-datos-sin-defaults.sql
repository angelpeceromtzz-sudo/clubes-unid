-- Los valores por defecto de club no deben rellenar atributos en actividades.
-- Las rutas de clubes envían cupo y participación explícitamente.
ALTER TABLE clubes ALTER COLUMN cupo_maximo DROP DEFAULT;
ALTER TABLE clubes ALTER COLUMN participacion DROP DEFAULT;
