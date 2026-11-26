-- Migración Fase 1: roles Coordinación y renombre Presidente -> Responsable del club.
-- No ejecuta cambios sobre producción automáticamente; aplicar manualmente.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cat_roles WHERE id_rol = 7 AND nombre_rol <> 'coordinacion') THEN
    RAISE EXCEPTION 'El rol ID 7 ya existe con otro significado: %', (SELECT nombre_rol FROM cat_roles WHERE id_rol = 7);
  END IF;
END $$;

INSERT INTO cat_roles (id_rol, nombre_rol) VALUES (7, 'coordinacion')
ON CONFLICT (id_rol) DO UPDATE SET nombre_rol = EXCLUDED.nombre_rol;

UPDATE cat_roles SET nombre_rol = 'responsable_club' WHERE id_rol = 2;
