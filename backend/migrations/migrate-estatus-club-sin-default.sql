-- El estado depende del tipo de recurso: el backend asigna explícitamente
-- 'proximamente' a clubes y NULL a actividades.
-- Sin default, un alta incompleta falla por CHECK en vez de heredar un estado
-- que solo tiene sentido para clubes.
ALTER TABLE clubes ALTER COLUMN id_estatus_club DROP DEFAULT;
