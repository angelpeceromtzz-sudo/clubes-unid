-- Preserva las bitácoras cuando una cuenta se elimina físicamente y evita que
-- borrar una postulación destruya su historial de estados.
ALTER TABLE historial_admin ALTER COLUMN id_admin DROP NOT NULL;
DO $$
DECLARE
    v_constraint TEXT;
BEGIN
    -- Las bases históricas pueden tener el nombre automático de PostgreSQL.
    -- Eliminar toda FK hacia usuarios evita dejar una CASCADE junto a la nueva.
    FOR v_constraint IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'historial_admin'::regclass
          AND confrelid = 'usuarios'::regclass
          AND contype = 'f'
          AND conkey = ARRAY[(
              SELECT attnum FROM pg_attribute
              WHERE attrelid = 'historial_admin'::regclass
                AND attname = 'id_admin' AND NOT attisdropped
          )]::SMALLINT[]
          AND confkey = ARRAY[(
              SELECT attnum FROM pg_attribute
              WHERE attrelid = 'usuarios'::regclass
                AND attname = 'id_usuario' AND NOT attisdropped
          )]::SMALLINT[]
    LOOP
        EXECUTE format('ALTER TABLE historial_admin DROP CONSTRAINT %I', v_constraint);
    END LOOP;
END $$;

ALTER TABLE historial_admin
    ADD CONSTRAINT fk_historial_admin
    FOREIGN KEY (id_admin) REFERENCES usuarios(id_usuario) ON DELETE SET NULL;

DO $$
DECLARE
    v_constraint TEXT;
BEGIN
    -- Igual para el historial de estados: reemplaza cualquier acción antigua.
    FOR v_constraint IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'historial_postulacion'::regclass
          AND confrelid = 'formularios'::regclass
          AND contype = 'f'
          AND conkey = ARRAY[(
              SELECT attnum FROM pg_attribute
              WHERE attrelid = 'historial_postulacion'::regclass
                AND attname = 'id_formulario' AND NOT attisdropped
          )]::SMALLINT[]
          AND confkey = ARRAY[(
              SELECT attnum FROM pg_attribute
              WHERE attrelid = 'formularios'::regclass
                AND attname = 'id_formulario' AND NOT attisdropped
          )]::SMALLINT[]
    LOOP
        EXECUTE format('ALTER TABLE historial_postulacion DROP CONSTRAINT %I', v_constraint);
    END LOOP;
END $$;

ALTER TABLE historial_postulacion
    ADD CONSTRAINT fk_historial_formulario
    FOREIGN KEY (id_formulario) REFERENCES formularios(id_formulario) ON DELETE RESTRICT;
