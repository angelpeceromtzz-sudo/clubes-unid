-- Adopción única del historial de cuatro migraciones ya verificadas en
-- clubsunid-develop. No ejecuta migraciones ni toca tablas de encuestas.
-- Antes de correrlo, confirma visualmente que Supabase está en clubsunid-develop.
-- Los checksums deben actualizarse si cambia el contenido de los archivos.

BEGIN;

LOCK TABLE usuarios, formularios, cat_estatus_postulacion, clubes,
           convocatorias_inscripcion IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
    v_def TEXT;
BEGIN
    IF to_regclass('schema_migrations') IS NOT NULL THEN
        RAISE EXCEPTION 'Adopción detenida: ya existe schema_migrations; no se modificó el ledger';
    END IF;

    IF EXISTS (
        SELECT 1 FROM usuarios
        GROUP BY lower(btrim(correo_institucional)) HAVING count(*) > 1
    ) OR EXISTS (
        SELECT 1 FROM formularios
        WHERE id_convocatoria_inscripcion IS NOT NULL
        GROUP BY id_alumno, id_club, id_convocatoria_inscripcion HAVING count(*) > 1
    ) OR EXISTS (
        SELECT 1 FROM formularios f
        LEFT JOIN cat_estatus_postulacion c ON c.nombre = f.status
        WHERE c.id_estatus IS NULL
    ) OR EXISTS (
        SELECT 1 FROM formularios f
        LEFT JOIN convocatorias_inscripcion ci
          ON ci.id_convocatoria_inscripcion = f.id_convocatoria_inscripcion
         AND ci.id_club = f.id_club
        WHERE f.id_convocatoria_inscripcion IS NOT NULL
          AND ci.id_convocatoria_inscripcion IS NULL
    ) OR EXISTS (
        SELECT 1 FROM clubes cl
        LEFT JOIN convocatorias_inscripcion ci
          ON ci.id_convocatoria_inscripcion = cl.id_convocatoria_inscripcion_actual
         AND ci.id_club = cl.id_club
        WHERE cl.id_convocatoria_inscripcion_actual IS NOT NULL
          AND ci.id_convocatoria_inscripcion IS NULL
    ) OR EXISTS (
        SELECT 1 FROM clubes
        WHERE ((tipo = 'club' AND cupo_maximo IS NOT NULL
                AND cupo_maximo IN (10,15,20,25,30,40,50)
                AND participacion IS NOT NULL)
            OR (tipo = 'actividad' AND cupo_maximo IS NULL
                AND participacion IS NULL)) IS NOT TRUE
    ) THEN
        RAISE EXCEPTION 'Adopción detenida: hay datos que no cumplen las reglas que se van a registrar';
    END IF;

    SELECT pg_get_constraintdef(oid) INTO v_def
    FROM pg_constraint
    WHERE conrelid = 'clubes'::regclass
      AND conname = 'chk_catalogo_datos_club'
      AND convalidated;
    IF v_def IS NULL
       OR regexp_replace(lower(v_def), '\s+', '', 'g') <>
          'check(((((tipo)::text=''club''::text)and(cupo_maximoisnotnull)and(cupo_maximo=any(array[10,15,20,25,30,40,50]))and(participacionisnotnull))or(((tipo)::text=''actividad''::text)and(cupo_maximoisnull)and(participacionisnull))))' THEN
        RAISE EXCEPTION 'Adopción detenida: la regla validada de clubes/actividades no coincide';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_index i
        JOIN pg_class x ON x.oid = i.indexrelid
        JOIN pg_namespace n ON n.oid = x.relnamespace
        WHERE n.nspname = current_schema()
          AND x.relname = 'uq_usuarios_correo_normalizado'
          AND i.indisunique AND i.indisvalid AND i.indisready
          AND pg_get_indexdef(i.indexrelid) ILIKE '%lower(btrim%correo_institucional%'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_index i
        JOIN pg_class x ON x.oid = i.indexrelid
        JOIN pg_namespace n ON n.oid = x.relnamespace
        WHERE n.nspname = current_schema()
          AND x.relname = 'uq_formulario_alumno_club_ciclo'
          AND i.indisunique AND i.indisvalid AND i.indisready
          AND pg_get_indexdef(i.indexrelid) ILIKE '%(id_alumno, id_club, id_convocatoria_inscripcion)%'
          AND pg_get_expr(i.indpred, i.indrelid) ILIKE '%id_convocatoria_inscripcion IS NOT NULL%'
    ) THEN
        RAISE EXCEPTION 'Adopción detenida: faltan índices únicos válidos de correo o postulación';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'formularios'::regclass AND conname = 'chk_status'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'formularios'::regclass
          AND conname = 'fk_formulario_estatus'
          AND contype = 'f' AND confdeltype = 'r' AND convalidated
          AND pg_get_constraintdef(oid) ILIKE '%FOREIGN KEY (status) REFERENCES cat_estatus_postulacion(nombre) ON DELETE RESTRICT%'
    ) THEN
        RAISE EXCEPTION 'Adopción detenida: la relación validada con el catálogo de estados no coincide';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'clubes'::regclass
          AND conname = 'fk_club_ciclo_actual_mismo_club'
          AND contype = 'f' AND confdeltype = 'n' AND convalidated
          AND pg_get_constraintdef(oid) ILIKE '%FOREIGN KEY (id_convocatoria_inscripcion_actual, id_club) REFERENCES convocatorias_inscripcion(id_convocatoria_inscripcion, id_club) ON DELETE SET NULL (id_convocatoria_inscripcion_actual)%'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'formularios'::regclass
          AND conname = 'fk_formulario_ciclo_mismo_club'
          AND contype = 'f' AND confdeltype = 'r' AND convalidated
          AND pg_get_constraintdef(oid) ILIKE '%FOREIGN KEY (id_convocatoria_inscripcion, id_club) REFERENCES convocatorias_inscripcion(id_convocatoria_inscripcion, id_club) ON DELETE RESTRICT%'
    ) THEN
        RAISE EXCEPTION 'Adopción detenida: faltan claves foráneas validadas entre club y ciclo';
    END IF;
END $$;

CREATE TABLE schema_migrations (
    nombre TEXT PRIMARY KEY,
    checksum CHAR(64) NOT NULL,
    orden INTEGER NOT NULL,
    aplicada_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    origen TEXT NOT NULL DEFAULT 'ejecutor'
        CONSTRAINT chk_schema_migrations_origen
        CHECK (origen IN ('ejecutor', 'adopcion_verificada', 'aplicacion_manual'))
);
CREATE UNIQUE INDEX uq_schema_migrations_checksum ON schema_migrations (checksum);
CREATE UNIQUE INDEX uq_schema_migrations_orden ON schema_migrations (orden);

INSERT INTO schema_migrations (nombre, checksum, orden, origen) VALUES
    ('migrate-catalogo-tipo-datos.sql', '26969f34f5618c10329fb7e28f3b1efee143f6cf65e5625a07864f1858f2bf37', 1, 'adopcion_verificada'),
    ('migrate-integridad-correos-postulaciones.sql', '741088fc526889c9e2043d28b5c8eebf5cc082bbe9afce4e4470f109e6be8a33', 2, 'adopcion_verificada'),
    ('migrate-estatus-postulacion-catalogo.sql', 'c91cc0fd25a1f7a1076dcfb34ae27eefc79e0ef510e5fb03d5f8f947b5306c75', 3, 'adopcion_verificada'),
    ('migrate-ciclo-inscripcion-mismo-club.sql', 'cbd5a1df9678480cdd21b1ba61fab451e6f89011cd952b3267b54a9dbe3a8e89', 4, 'adopcion_verificada');

COMMIT;
