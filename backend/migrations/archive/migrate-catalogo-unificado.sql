-- Catálogo compacto: ocho tablas nuevas y bitácora compartida.
-- Actualiza las versiones separada, unificada y compacta del módulo.
BEGIN;
LOCK TABLE clubes IN SHARE ROW EXCLUSIVE MODE;
DROP VIEW IF EXISTS clubes_con_estado;
DROP VIEW IF EXISTS clubes_operativos;

ALTER TABLE clubes ADD COLUMN IF NOT EXISTS tipo VARCHAR(12) NOT NULL DEFAULT 'club';
ALTER TABLE clubes ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
ALTER TABLE clubes ADD COLUMN IF NOT EXISTS plantilla VARCHAR(20) NOT NULL DEFAULT 'general';
ALTER TABLE clubes ADD COLUMN IF NOT EXISTS estado_publicacion VARCHAR(20);
ALTER TABLE clubes ADD COLUMN IF NOT EXISTS mostrar_en_oferta BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE clubes ADD COLUMN IF NOT EXISTS id_autor INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL;
ALTER TABLE clubes ADD COLUMN IF NOT EXISTS propuesta JSONB;
ALTER TABLE clubes ADD COLUMN IF NOT EXISTS estado_propuesta VARCHAR(20);
ALTER TABLE clubes ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT;
ALTER TABLE clubes ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW();
DO $$ BEGIN
 IF (SELECT character_maximum_length FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='clubes' AND column_name='nombre_club') IS DISTINCT FROM 160 THEN
  ALTER TABLE clubes ALTER COLUMN nombre_club TYPE VARCHAR(160);
 END IF;
 IF (SELECT character_maximum_length FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='clubes' AND column_name='categoria') IS DISTINCT FROM 80 THEN
  ALTER TABLE clubes ALTER COLUMN categoria TYPE VARCHAR(80);
 END IF;
 IF (SELECT data_type FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='clubes' AND column_name='imagen_portada') IS DISTINCT FROM 'text' THEN
  ALTER TABLE clubes ALTER COLUMN imagen_portada TYPE TEXT;
 END IF;
END $$;
ALTER TABLE clubes ALTER COLUMN cupo_maximo DROP NOT NULL;
ALTER TABLE clubes ALTER COLUMN participacion DROP NOT NULL;
UPDATE clubes SET slug = 'club-' || id_club WHERE slug IS NULL;
UPDATE clubes SET estado_publicacion = CASE WHEN id_estatus_club = 3 THEN 'archivada' ELSE 'publicada' END WHERE estado_publicacion IS NULL;
ALTER TABLE clubes ALTER COLUMN estado_publicacion SET DEFAULT 'borrador';
ALTER TABLE clubes ALTER COLUMN estado_publicacion SET NOT NULL;
ALTER TABLE clubes ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_catalogo_slug ON clubes(slug);
CREATE INDEX IF NOT EXISTS idx_catalogo_tipo_publicacion ON clubes(tipo,estado_publicacion);
DROP INDEX IF EXISTS uq_club_id_responsable_club;
CREATE UNIQUE INDEX uq_club_id_responsable_club ON clubes(id_responsable_club) WHERE tipo='club' AND id_responsable_club IS NOT NULL;
ALTER TABLE clubes DROP CONSTRAINT IF EXISTS chk_catalogo_tipo;
ALTER TABLE clubes ADD CONSTRAINT chk_catalogo_tipo CHECK (tipo IN ('club','actividad'));
ALTER TABLE clubes DROP CONSTRAINT IF EXISTS chk_catalogo_publicacion;
ALTER TABLE clubes ADD CONSTRAINT chk_catalogo_publicacion CHECK (estado_publicacion IN ('borrador','pendiente','publicada','rechazada','archivada'));
ALTER TABLE clubes DROP CONSTRAINT IF EXISTS chk_catalogo_plantilla;
ALTER TABLE clubes ADD CONSTRAINT chk_catalogo_plantilla CHECK (plantilla IN ('general','trineo','misiones') AND (tipo='actividad' OR plantilla='general'));
ALTER TABLE clubes DROP CONSTRAINT IF EXISTS chk_catalogo_revision;
ALTER TABLE clubes ADD CONSTRAINT chk_catalogo_revision CHECK (estado_propuesta IN ('borrador','pendiente','rechazada'));
ALTER TABLE clubes DROP CONSTRAINT IF EXISTS chk_catalogo_datos_club;
ALTER TABLE clubes ADD CONSTRAINT chk_catalogo_datos_club CHECK (tipo <> 'club' OR (cupo_maximo IS NOT NULL AND cupo_maximo IN (10,15,20,25,30,40,50) AND participacion IS NOT NULL));

CREATE TABLE IF NOT EXISTS migraciones_catalogo (
  id_migracion BIGSERIAL PRIMARY KEY,
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('equivalencia_actividad','traslado_club')),
  id_actividad_anterior INT,
  id_club_origen INT REFERENCES clubes(id_club) ON DELETE RESTRICT,
  id_club_destino INT NOT NULL REFERENCES clubes(id_club) ON DELETE RESTRICT,
  id_edicion_destino INT,
  datos_originales JSONB NOT NULL DEFAULT '{}'::jsonb,
  resumen JSONB NOT NULL DEFAULT '{}'::jsonb,
  migrado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (tipo='equivalencia_actividad' AND id_actividad_anterior IS NOT NULL AND id_club_origen IS NULL AND id_edicion_destino IS NULL)
    OR (tipo='traslado_club' AND id_actividad_anterior IS NULL AND id_club_origen IS NOT NULL AND id_edicion_destino IS NOT NULL)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_migracion_actividad_anterior ON migraciones_catalogo(id_actividad_anterior) WHERE tipo='equivalencia_actividad';
CREATE UNIQUE INDEX IF NOT EXISTS uq_migracion_actividad_destino ON migraciones_catalogo(id_club_destino) WHERE tipo='equivalencia_actividad';
CREATE UNIQUE INDEX IF NOT EXISTS uq_migracion_club_origen ON migraciones_catalogo(id_club_origen) WHERE tipo='traslado_club';
CREATE OR REPLACE FUNCTION fn_migracion_catalogo_destino() RETURNS trigger AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM clubes WHERE id_club=NEW.id_club_destino AND tipo='actividad')
    OR (NEW.tipo='traslado_club' AND NOT EXISTS(SELECT 1 FROM clubes WHERE id_club=NEW.id_club_origen AND tipo='club')) THEN
  RAISE EXCEPTION 'Revisa el origen y el destino de la migración del catálogo' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_migracion_catalogo_destino ON migraciones_catalogo;
CREATE TRIGGER trg_migracion_catalogo_destino BEFORE INSERT OR UPDATE ON migraciones_catalogo FOR EACH ROW EXECUTE FUNCTION fn_migracion_catalogo_destino();

-- Incorpora las equivalencias de la versión con once tablas antes de retirarla.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('catalogo_equivalencias_actividades') AND relkind='r') THEN
  LOCK TABLE catalogo_equivalencias_actividades IN ACCESS EXCLUSIVE MODE;
  INSERT INTO migraciones_catalogo(tipo,id_actividad_anterior,id_club_destino,datos_originales,migrado_en)
   SELECT 'equivalencia_actividad',id_actividad_anterior,id_club,datos_originales,migrado_en FROM catalogo_equivalencias_actividades
   ON CONFLICT DO NOTHING;
  IF EXISTS(
   SELECT 1 FROM catalogo_equivalencias_actividades a LEFT JOIN migraciones_catalogo m
    ON m.tipo='equivalencia_actividad' AND m.id_actividad_anterior=a.id_actividad_anterior
   WHERE m.id_migracion IS NULL OR m.id_club_destino IS DISTINCT FROM a.id_club
    OR m.datos_originales IS DISTINCT FROM a.datos_originales OR m.migrado_en IS DISTINCT FROM a.migrado_en
  ) THEN RAISE EXCEPTION 'Hay equivalencias incompatibles; la migración se revierte'; END IF;
  DROP TABLE catalogo_equivalencias_actividades;
 END IF;
END $$;
CREATE OR REPLACE VIEW catalogo_equivalencias_actividades AS
 SELECT id_actividad_anterior,id_club_destino AS id_club,datos_originales,migrado_en
 FROM migraciones_catalogo WHERE tipo='equivalencia_actividad';
DO $$
DECLARE secuencia TEXT; ultimo BIGINT; usado BOOLEAN; maximo BIGINT;
BEGIN
 secuencia:=pg_get_serial_sequence('clubes','id_club');
 SELECT COALESCE(MAX(id_club),0) INTO maximo FROM clubes;
 EXECUTE format('SELECT last_value,is_called FROM %s',secuencia) INTO ultimo,usado;
 PERFORM setval(secuencia,GREATEST(ultimo,maximo),usado OR maximo>=ultimo);
END $$;

CREATE TABLE IF NOT EXISTS actividades_ediciones (
  id_edicion SERIAL PRIMARY KEY,
  id_actividad INT NOT NULL CONSTRAINT fk_edicion_catalogo REFERENCES clubes(id_club) ON DELETE RESTRICT,
  nombre VARCHAR(160) NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  lugar VARCHAR(240) NOT NULL DEFAULT '',
  fecha_inicio DATE,
  fecha_fin DATE,
  hora_inicio VARCHAR(5) NOT NULL DEFAULT '',
  requiere_registro BOOLEAN NOT NULL DEFAULT FALSE,
  campos_registro JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(campos_registro) = 'array'),
  requiere_aportacion BOOLEAN NOT NULL DEFAULT FALSE,
  inscripcion_desde DATE,
  inscripcion_hasta DATE,
  inscripciones_habilitadas BOOLEAN NOT NULL DEFAULT TRUE,
  destacable BOOLEAN NOT NULL DEFAULT FALSE,
  destacada_desde DATE,
  destacada_hasta DATE,
  estado VARCHAR(20) NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','pendiente','publicada','rechazada','archivada')),
  propuesta JSONB,
  estado_propuesta VARCHAR(20) CHECK (estado_propuesta IN ('borrador','pendiente','rechazada')),
  motivo_rechazo TEXT,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio),
  CHECK (inscripcion_hasta IS NULL OR inscripcion_desde IS NULL OR inscripcion_hasta >= inscripcion_desde),
  CHECK (destacada_hasta IS NULL OR destacada_desde IS NULL OR destacada_hasta >= destacada_desde)
);

-- No empareja por nombre ni reutiliza IDs que puedan pertenecer a otro club.
DO $$
DECLARE fila RECORD; nuevo_id INT; nueva_slug TEXT; restriccion RECORD; contador INT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE oid=to_regclass('actividades') AND relkind='r') THEN
    FOR fila IN SELECT * FROM actividades ORDER BY id_actividad LOOP
      IF NOT EXISTS (SELECT 1 FROM migraciones_catalogo WHERE tipo='equivalencia_actividad' AND id_actividad_anterior=fila.id_actividad) THEN
        nueva_slug := fila.slug;
        contador:=0;
        WHILE EXISTS (SELECT 1 FROM clubes WHERE slug=nueva_slug) LOOP
          contador:=contador+1;
          nueva_slug := left(fila.slug,65) || '-actividad-' || fila.id_actividad || CASE WHEN contador=1 THEN '' ELSE '-' || contador END;
        END LOOP;
        INSERT INTO clubes (nombre_club,descripcion,categoria,imagen_portada,tipo,slug,plantilla,estado_publicacion,mostrar_en_oferta,id_autor,id_responsable_club,propuesta,estado_propuesta,motivo_rechazo,actualizado_en,cupo_maximo,participacion)
        VALUES (fila.nombre,fila.descripcion,fila.categoria,fila.url_imagen,'actividad',nueva_slug,fila.plantilla,fila.estado,fila.mostrar_en_oferta,fila.id_autor,fila.id_responsable,fila.propuesta,fila.estado_propuesta,fila.motivo_rechazo,fila.actualizado_en,NULL,NULL)
        RETURNING id_club INTO nuevo_id;
        INSERT INTO migraciones_catalogo(tipo,id_actividad_anterior,id_club_destino,datos_originales) VALUES ('equivalencia_actividad',fila.id_actividad,nuevo_id,to_jsonb(fila));
      END IF;
    END LOOP;
    FOR restriccion IN SELECT conname FROM pg_constraint WHERE conrelid=to_regclass('actividades_ediciones') AND confrelid=to_regclass('actividades') LOOP
      EXECUTE format('ALTER TABLE actividades_ediciones DROP CONSTRAINT %I',restriccion.conname);
    END LOOP;
    UPDATE actividades_ediciones e SET id_actividad=m.id_club_destino FROM migraciones_catalogo m WHERE m.tipo='equivalencia_actividad' AND e.id_actividad=m.id_actividad_anterior;
    ALTER TABLE actividades RENAME TO actividades_catalogo_anterior;
  END IF;
END $$;
ALTER TABLE actividades_ediciones DROP CONSTRAINT IF EXISTS fk_edicion_catalogo;
ALTER TABLE actividades_ediciones ADD CONSTRAINT fk_edicion_catalogo FOREIGN KEY (id_actividad) REFERENCES clubes(id_club) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_edicion_propietario ON actividades_ediciones(id_edicion,id_actividad);
ALTER TABLE migraciones_catalogo DROP CONSTRAINT IF EXISTS fk_migracion_edicion;
ALTER TABLE migraciones_catalogo ADD CONSTRAINT fk_migracion_edicion FOREIGN KEY(id_edicion_destino,id_club_destino) REFERENCES actividades_ediciones(id_edicion,id_actividad) ON DELETE RESTRICT;

DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('actividades_legado_clubes') AND relkind='r') THEN
  LOCK TABLE actividades_legado_clubes IN ACCESS EXCLUSIVE MODE;
  INSERT INTO migraciones_catalogo(tipo,id_club_origen,id_club_destino,id_edicion_destino,resumen,migrado_en)
   SELECT 'traslado_club',l.id_club,e.id_actividad,l.id_edicion,l.resumen,l.migrado_en
   FROM actividades_legado_clubes l JOIN actividades_ediciones e ON e.id_edicion=l.id_edicion
   ON CONFLICT DO NOTHING;
  IF EXISTS(
   SELECT 1 FROM actividades_legado_clubes l LEFT JOIN migraciones_catalogo m
    ON m.tipo='traslado_club' AND m.id_club_origen=l.id_club
   WHERE m.id_migracion IS NULL OR m.id_edicion_destino IS DISTINCT FROM l.id_edicion
    OR m.resumen IS DISTINCT FROM l.resumen OR m.migrado_en IS DISTINCT FROM l.migrado_en
  ) THEN RAISE EXCEPTION 'Hay traslados incompatibles; la migración se revierte'; END IF;
  DROP TABLE actividades_legado_clubes;
 END IF;
END $$;
CREATE OR REPLACE VIEW actividades_legado_clubes AS
 SELECT id_club_origen AS id_club,id_edicion_destino AS id_edicion,resumen,migrado_en
 FROM migraciones_catalogo WHERE tipo='traslado_club';

CREATE OR REPLACE VIEW catalogo_recursos AS
SELECT id_club AS id_actividad,id_club,tipo,slug,nombre_club AS nombre,descripcion,categoria,
       imagen_portada AS url_imagen,plantilla,mostrar_en_oferta,estado_publicacion AS estado,
       id_autor,id_responsable_club AS id_responsable,propuesta,estado_propuesta,motivo_rechazo,
       actualizado_en,cupo_maximo,participacion,lugar_actividades,id_vicepresidente,id_estatus_club
FROM clubes;
CREATE OR REPLACE VIEW actividades AS SELECT id_actividad,slug,nombre,descripcion,categoria,url_imagen,
       plantilla,mostrar_en_oferta,estado,id_autor,id_responsable,propuesta,estado_propuesta,
       motivo_rechazo,actualizado_en FROM catalogo_recursos WHERE tipo='actividad';
CREATE OR REPLACE VIEW clubes_operativos AS SELECT * FROM clubes WHERE tipo='club' WITH LOCAL CHECK OPTION;
CREATE VIEW clubes_con_estado AS
SELECT cl.*,COUNT(f.id_formulario)::int AS formularios_recibidos,
 CASE WHEN cl.cerrada_manualmente THEN 'cerrado'
      WHEN cl.fecha_apertura_programada IS NOT NULL AND NOW()<cl.fecha_apertura_programada THEN 'proximo'
      WHEN cl.max_postulaciones IS NOT NULL AND COUNT(f.id_formulario)>=cl.max_postulaciones THEN 'lleno'
      WHEN cl.fecha_limite_cierre IS NOT NULL AND NOW()>cl.fecha_limite_cierre THEN 'cerrado'
      WHEN cl.fecha_apertura_programada IS NULL THEN 'cerrado' ELSE 'abierto' END AS estado_calculado
FROM clubes cl LEFT JOIN formularios f ON f.id_club=cl.id_club AND f.id_convocatoria_inscripcion=cl.id_convocatoria_inscripcion_actual
WHERE cl.tipo='club' GROUP BY cl.id_club;

CREATE TABLE IF NOT EXISTS actividades_aportes_catalogo (
  id_opcion SERIAL PRIMARY KEY,
  id_edicion INT NOT NULL REFERENCES actividades_ediciones(id_edicion) ON DELETE RESTRICT,
  nombre VARCHAR(160) NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  unidad VARCHAR(60) NOT NULL,
  cantidad_minima NUMERIC(12,3) NOT NULL CHECK (cantidad_minima > 0),
  activa BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS actividades_registros (
  id_registro SERIAL PRIMARY KEY,
  id_edicion INT NOT NULL REFERENCES actividades_ediciones(id_edicion) ON DELETE RESTRICT,
  id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
  nombre_completo VARCHAR(150) NOT NULL,
  matricula VARCHAR(50) NOT NULL,
  respuestas JSONB NOT NULL DEFAULT '{}'::jsonb,
  formulario_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  estado VARCHAR(30) NOT NULL DEFAULT 'confirmado' CHECK (estado IN ('confirmado','cancelado','pendiente_completar')),
  origen_legacy JSONB,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id_edicion, id_usuario),
  UNIQUE (id_edicion, matricula)
);

CREATE TABLE IF NOT EXISTS actividades_aportaciones (
  id_aportacion SERIAL PRIMARY KEY,
  id_registro INT NOT NULL REFERENCES actividades_registros(id_registro) ON DELETE RESTRICT,
  id_opcion INT NOT NULL REFERENCES actividades_aportes_catalogo(id_opcion) ON DELETE RESTRICT,
  nombre VARCHAR(160) NOT NULL,
  unidad VARCHAR(60) NOT NULL,
  cantidad NUMERIC(12,3) NOT NULL CHECK (cantidad > 0),
  cantidad_minima NUMERIC(12,3) NOT NULL CHECK (cantidad_minima > 0),
  estado VARCHAR(20) NOT NULL DEFAULT 'comprometida' CHECK (estado IN ('comprometida','recibida','cancelada')),
  recibida_por INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  recibida_en TIMESTAMPTZ,
  UNIQUE (id_registro, id_opcion)
);

CREATE INDEX IF NOT EXISTS idx_actividades_ediciones_actividad ON actividades_ediciones(id_actividad);
CREATE INDEX IF NOT EXISTS idx_actividades_registros_usuario ON actividades_registros(id_usuario);
CREATE INDEX IF NOT EXISTS idx_actividades_aportes_edicion ON actividades_aportes_catalogo(id_edicion);

-- Publicaciones e imágenes compartidas. El identificador de cada foto se conserva.
CREATE TABLE IF NOT EXISTS publicaciones_oferta (
 id_publicacion SERIAL PRIMARY KEY,
 id_club INT NOT NULL REFERENCES clubes(id_club) ON DELETE RESTRICT,
 id_edicion INT,
 contenido VARCHAR(300) NOT NULL DEFAULT '',
 id_autor INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
 creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 FOREIGN KEY (id_edicion,id_club) REFERENCES actividades_ediciones(id_edicion,id_actividad) ON DELETE RESTRICT
);
DO $$
DECLARE foto RECORD; publicacion INT;
BEGIN
 IF EXISTS (SELECT 1 FROM pg_class WHERE oid=to_regclass('actividades_fotos') AND relkind='r') THEN
   ALTER TABLE actividades_fotos RENAME TO publicaciones_imagenes;
   ALTER TABLE publicaciones_imagenes ADD COLUMN id_publicacion INT REFERENCES publicaciones_oferta(id_publicacion) ON DELETE RESTRICT;
   ALTER TABLE publicaciones_imagenes ADD COLUMN orden INT NOT NULL DEFAULT 0;
   ALTER TABLE publicaciones_imagenes ADD COLUMN public_id TEXT;
   FOR foto IN SELECT f.*,e.id_actividad AS id_propietario FROM publicaciones_imagenes f JOIN actividades_ediciones e ON e.id_edicion=f.id_edicion LOOP
     INSERT INTO publicaciones_oferta(id_club,id_edicion,contenido,id_autor,creado_en)
     VALUES(foto.id_propietario,foto.id_edicion,foto.pie,foto.id_autor,foto.creado_en) RETURNING id_publicacion INTO publicacion;
     UPDATE publicaciones_imagenes SET id_publicacion=publicacion WHERE id_foto=foto.id_foto;
   END LOOP;
   ALTER TABLE publicaciones_imagenes ALTER COLUMN id_publicacion SET NOT NULL;
   ALTER TABLE publicaciones_imagenes DROP COLUMN id_edicion;
   ALTER TABLE publicaciones_imagenes DROP COLUMN pie;
   ALTER TABLE publicaciones_imagenes DROP COLUMN id_autor;
   ALTER TABLE publicaciones_imagenes DROP COLUMN creado_en;
   ALTER TABLE publicaciones_imagenes DROP COLUMN IF EXISTS etapa;
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS publicaciones_imagenes (
 id_foto SERIAL PRIMARY KEY,
 id_publicacion INT NOT NULL REFERENCES publicaciones_oferta(id_publicacion) ON DELETE RESTRICT,
 url_imagen TEXT NOT NULL,
 estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','publicada','rechazada','eliminada')),
 orden INT NOT NULL DEFAULT 0,
 public_id TEXT
);

CREATE OR REPLACE VIEW actividades_fotos AS
 SELECT i.id_foto,p.id_edicion,p.id_club,p.id_publicacion,i.url_imagen,p.contenido AS pie,
        i.estado,p.id_autor,p.creado_en,i.orden,i.public_id
 FROM publicaciones_imagenes i JOIN publicaciones_oferta p ON p.id_publicacion=i.id_publicacion;
CREATE INDEX IF NOT EXISTS idx_publicaciones_oferta_dueno ON publicaciones_oferta(id_club,id_edicion,creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_publicaciones_imagenes_publicacion ON publicaciones_imagenes(id_publicacion,estado,orden);
CREATE TABLE IF NOT EXISTS reacciones_catalogo (
 id_reaccion BIGSERIAL PRIMARY KEY,
 id_club INT NOT NULL REFERENCES clubes(id_club) ON DELETE RESTRICT,
 id_edicion INT,
 id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
 reaccion VARCHAR(10) NOT NULL CHECK (reaccion IN ('like','love','clap')),
 FOREIGN KEY(id_edicion,id_club) REFERENCES actividades_ediciones(id_edicion,id_actividad) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_reaccion_club_usuario ON reacciones_catalogo(id_club,id_usuario) WHERE id_edicion IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_reaccion_edicion_usuario ON reacciones_catalogo(id_edicion,id_usuario) WHERE id_edicion IS NOT NULL;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('actividades_reacciones') AND relkind='r') THEN
  LOCK TABLE actividades_reacciones IN ACCESS EXCLUSIVE MODE;
  INSERT INTO reacciones_catalogo(id_club,id_edicion,id_usuario,reaccion)
   SELECT e.id_actividad,r.id_edicion,r.id_usuario,r.reaccion FROM actividades_reacciones r JOIN actividades_ediciones e USING(id_edicion)
   ON CONFLICT DO NOTHING;
  IF EXISTS(
   SELECT 1 FROM actividades_reacciones a LEFT JOIN reacciones_catalogo r
    ON r.id_edicion=a.id_edicion AND r.id_usuario=a.id_usuario
   WHERE r.id_reaccion IS NULL OR r.reaccion IS DISTINCT FROM a.reaccion
  ) THEN RAISE EXCEPTION 'Hay reacciones de edición incompatibles; la migración se revierte'; END IF;
  DROP TABLE actividades_reacciones;
 END IF;
 IF EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('clubes_reacciones') AND relkind='r') THEN
  LOCK TABLE clubes_reacciones IN ACCESS EXCLUSIVE MODE;
  INSERT INTO reacciones_catalogo(id_club,id_usuario,reaccion)
   SELECT id_club,id_usuario,reaccion FROM clubes_reacciones ON CONFLICT DO NOTHING;
  IF EXISTS(
   SELECT 1 FROM clubes_reacciones a LEFT JOIN reacciones_catalogo r
    ON r.id_club=a.id_club AND r.id_usuario=a.id_usuario AND r.id_edicion IS NULL
   WHERE r.id_reaccion IS NULL OR r.reaccion IS DISTINCT FROM a.reaccion
  ) THEN RAISE EXCEPTION 'Hay reacciones de club incompatibles; la migración se revierte'; END IF;
  DROP TABLE clubes_reacciones;
 END IF;
END $$;
CREATE OR REPLACE VIEW actividades_reacciones AS
 SELECT id_edicion,id_usuario,reaccion FROM reacciones_catalogo WHERE id_edicion IS NOT NULL;
CREATE OR REPLACE VIEW clubes_reacciones AS
 SELECT id_club,id_usuario,reaccion FROM reacciones_catalogo WHERE id_edicion IS NULL;

-- La bitácora existente también recibe las acciones del catálogo y las ediciones.
DO $$ BEGIN
 IF (SELECT character_maximum_length FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='actividad_clubes' AND column_name='tipo_evento') IS DISTINCT FROM 80 THEN
  ALTER TABLE actividad_clubes ALTER COLUMN tipo_evento TYPE VARCHAR(80);
 END IF;
END $$;
ALTER TABLE actividad_clubes ADD COLUMN IF NOT EXISTS id_edicion INT;
ALTER TABLE actividad_clubes ADD COLUMN IF NOT EXISTS origen VARCHAR(20) NOT NULL DEFAULT 'club';
ALTER TABLE actividad_clubes ADD COLUMN IF NOT EXISTS id_historial_actividad_anterior INT;
ALTER TABLE actividad_clubes DROP CONSTRAINT IF EXISTS chk_actividad_origen;
ALTER TABLE actividad_clubes ADD CONSTRAINT chk_actividad_origen CHECK(origen IN ('club','catalogo'));
ALTER TABLE actividad_clubes DROP CONSTRAINT IF EXISTS chk_actividad_edicion;
ALTER TABLE actividad_clubes ADD CONSTRAINT chk_actividad_edicion CHECK(id_edicion IS NULL OR id_club IS NOT NULL);
ALTER TABLE actividad_clubes DROP CONSTRAINT IF EXISTS fk_actividad_edicion;
ALTER TABLE actividad_clubes ADD CONSTRAINT fk_actividad_edicion FOREIGN KEY(id_edicion,id_club) REFERENCES actividades_ediciones(id_edicion,id_actividad) ON DELETE RESTRICT;
DO $$
DECLARE restriccion RECORD;
BEGIN
 FOR restriccion IN SELECT conname FROM pg_constraint
  WHERE conrelid=to_regclass('actividad_clubes') AND contype='f' AND confrelid=to_regclass('usuarios')
    AND conkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid=to_regclass('actividad_clubes') AND attname='id_actor')]::smallint[]
 LOOP EXECUTE format('ALTER TABLE actividad_clubes DROP CONSTRAINT %I',restriccion.conname); END LOOP;
 ALTER TABLE actividad_clubes ADD CONSTRAINT fk_actividad_actor FOREIGN KEY(id_actor) REFERENCES usuarios(id_usuario) ON DELETE SET NULL;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_actividad_historial_anterior ON actividad_clubes(id_historial_actividad_anterior) WHERE id_historial_actividad_anterior IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_actividad_clubes_edicion ON actividad_clubes(id_edicion);
DO $$
DECLARE fila RECORD; destino INT; edicion INT; referencia INT;
BEGIN
 IF EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('actividades_historial') AND relkind='r') THEN
  LOCK TABLE actividades_historial IN ACCESS EXCLUSIVE MODE;
  FOR fila IN SELECT * FROM actividades_historial ORDER BY id LOOP
   destino:=NULL; edicion:=NULL;
   -- Las referencias a hijos mantienen su identidad aunque cambie el ID del catálogo.
   BEGIN
    SELECT e.id_edicion,e.id_actividad INTO edicion,destino FROM actividades_ediciones e
    WHERE e.id_edicion=COALESCE(
     (fila.detalle->>'id_edicion')::int,
     (SELECT id_edicion FROM actividades_registros WHERE id_registro=(fila.detalle->>'id_registro')::int),
     (SELECT id_edicion FROM actividades_aportes_catalogo WHERE id_opcion=(fila.detalle->>'id_opcion')::int),
     (SELECT r.id_edicion FROM actividades_aportaciones a JOIN actividades_registros r USING(id_registro) WHERE a.id_aportacion=(fila.detalle->>'id_aportacion')::int),
     (SELECT id_edicion FROM actividades_fotos WHERE id_foto=(fila.detalle->>'id_foto')::int)
    );
    IF destino IS NULL THEN
     referencia:=COALESCE((fila.detalle->>'id_actividad')::int,(fila.detalle->>'id_club')::int,
      (SELECT id_club FROM actividades_fotos WHERE id_foto=(fila.detalle->>'id_foto')::int));
     SELECT id_club_destino INTO destino FROM migraciones_catalogo
      WHERE tipo='equivalencia_actividad' AND id_actividad_anterior=referencia AND fila.creado_en<=migrado_en;
     IF destino IS NULL THEN SELECT id_club INTO destino FROM clubes WHERE id_club=referencia; END IF;
    END IF;
   EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN destino:=NULL; edicion:=NULL;
   END;
   INSERT INTO actividad_clubes(tipo_evento,id_club,id_edicion,id_actor,descripcion,detalles,fecha_creacion,origen,id_historial_actividad_anterior)
    VALUES(fila.accion,destino,edicion,fila.id_usuario,'Acción anterior: '||replace(fila.accion,'_',' '),fila.detalle,fila.creado_en,'catalogo',fila.id)
    ON CONFLICT DO NOTHING;
   IF NOT EXISTS(SELECT 1 FROM actividad_clubes WHERE id_historial_actividad_anterior=fila.id
     AND tipo_evento=fila.accion AND id_actor IS NOT DISTINCT FROM fila.id_usuario
     AND detalles IS NOT DISTINCT FROM fila.detalle AND fecha_creacion=fila.creado_en) THEN
    RAISE EXCEPTION 'Hay entradas de historial incompatibles; la migración se revierte';
   END IF;
  END LOOP;
  DROP TABLE actividades_historial;
 END IF;
END $$;
CREATE OR REPLACE VIEW actividades_historial AS
 SELECT id_evento AS id,id_actor AS id_usuario,tipo_evento AS accion,COALESCE(detalles,'{}'::jsonb) AS detalle,
        fecha_creacion AS creado_en,id_historial_actividad_anterior AS id_anterior
 FROM actividad_clubes WHERE origen='catalogo';

-- Las restricciones se aplican también a llamadas directas y conservan los estados históricos cerrados.
CREATE OR REPLACE FUNCTION fn_catalogo_destino_club() RETURNS trigger AS $$
DECLARE clase TEXT;
BEGIN
 SELECT tipo INTO clase FROM clubes WHERE id_club=NEW.id_club FOR KEY SHARE;
 IF clase IS DISTINCT FROM 'club' THEN
   RAISE EXCEPTION 'Este proceso requiere un club' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$ LANGUAGE plpgsql;
DO $$
DECLARE tabla TEXT;
BEGIN
 FOREACH tabla IN ARRAY ARRAY['inscripciones','formularios','horarios_club','convocatorias','convocatorias_inscripcion','solicitudes_horario','solicitudes_convocatoria','clubes_niveles'] LOOP
   IF to_regclass(tabla) IS NOT NULL THEN
     EXECUTE format('DROP TRIGGER IF EXISTS trg_catalogo_solo_club ON %I',tabla);
     EXECUTE format('CREATE TRIGGER trg_catalogo_solo_club BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fn_catalogo_destino_club()',tabla);
   END IF;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION fn_catalogo_edicion_actividad() RETURNS trigger AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM clubes WHERE id_club=NEW.id_actividad AND tipo='actividad') THEN
  RAISE EXCEPTION 'Una edición requiere una actividad' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_catalogo_edicion_actividad ON actividades_ediciones;
CREATE TRIGGER trg_catalogo_edicion_actividad BEFORE INSERT OR UPDATE ON actividades_ediciones FOR EACH ROW EXECUTE FUNCTION fn_catalogo_edicion_actividad();
CREATE OR REPLACE FUNCTION fn_catalogo_tipo_estable() RETURNS trigger AS $$
BEGIN
 IF NEW.tipo IS DISTINCT FROM OLD.tipo THEN
  RAISE EXCEPTION 'El tipo se conserva; utiliza un traslado revisado para los registros anteriores' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_catalogo_tipo_estable ON clubes;
CREATE TRIGGER trg_catalogo_tipo_estable BEFORE UPDATE OF tipo ON clubes FOR EACH ROW EXECUTE FUNCTION fn_catalogo_tipo_estable();
CREATE OR REPLACE FUNCTION fn_publicacion_destino() RETURNS trigger AS $$
DECLARE clase TEXT;
BEGIN
 SELECT tipo INTO clase FROM clubes WHERE id_club=NEW.id_club FOR KEY SHARE;
 IF (clase='club' AND NEW.id_edicion IS NOT NULL) OR (clase='actividad' AND NEW.id_edicion IS NULL) THEN
  RAISE EXCEPTION 'La publicación debe corresponder al club o a una edición de la actividad' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_publicacion_destino ON publicaciones_oferta;
CREATE TRIGGER trg_publicacion_destino BEFORE INSERT OR UPDATE ON publicaciones_oferta FOR EACH ROW EXECUTE FUNCTION fn_publicacion_destino();
DROP TRIGGER IF EXISTS trg_reaccion_destino ON reacciones_catalogo;
CREATE TRIGGER trg_reaccion_destino BEFORE INSERT OR UPDATE ON reacciones_catalogo FOR EACH ROW EXECUTE FUNCTION fn_publicacion_destino();

-- Impide que el catálogo retirado vuelva a ser una fuente de escritura.
CREATE OR REPLACE FUNCTION fn_catalogo_anterior_lectura() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'Usa el catálogo unificado' USING ERRCODE='55000'; END $$ LANGUAGE plpgsql;
DO $$ BEGIN
 IF to_regclass('actividades_catalogo_anterior') IS NOT NULL THEN
  DROP TRIGGER IF EXISTS trg_catalogo_anterior_lectura ON actividades_catalogo_anterior;
  CREATE TRIGGER trg_catalogo_anterior_lectura BEFORE INSERT OR UPDATE OR DELETE ON actividades_catalogo_anterior FOR EACH ROW EXECUTE FUNCTION fn_catalogo_anterior_lectura();
 END IF;
END $$;
DROP TRIGGER IF EXISTS trg_actividades_compat_lectura ON actividades;
CREATE TRIGGER trg_actividades_compat_lectura INSTEAD OF INSERT OR UPDATE OR DELETE ON actividades FOR EACH ROW EXECUTE FUNCTION fn_catalogo_anterior_lectura();
DO $$
DECLARE vista TEXT;
BEGIN
 FOREACH vista IN ARRAY ARRAY['catalogo_equivalencias_actividades','actividades_legado_clubes','actividades_reacciones','clubes_reacciones','actividades_historial'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS trg_compat_catalogo_lectura ON %I',vista);
  EXECUTE format('CREATE TRIGGER trg_compat_catalogo_lectura INSTEAD OF INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION fn_catalogo_anterior_lectura()',vista);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION fn_catalogo_slug() RETURNS trigger AS $$
DECLARE base TEXT; contador INT:=0;
BEGIN
 IF NEW.slug IS NULL OR NEW.slug='' THEN
  base:=NEW.tipo || '-' || NEW.id_club;
  NEW.slug:=base;
  WHILE EXISTS(SELECT 1 FROM clubes WHERE slug=NEW.slug) LOOP
   contador:=contador+1; NEW.slug:=base || '-' || contador;
  END LOOP;
 END IF;
 RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_catalogo_slug ON clubes;
CREATE TRIGGER trg_catalogo_slug BEFORE INSERT ON clubes FOR EACH ROW EXECUTE FUNCTION fn_catalogo_slug();


-- Información institucional; las fechas, preguntas y aportaciones se configuran en el panel.
-- Se reconoce por plantilla, conserva los datos publicados y evita duplicar un catálogo importado.
DO $$
DECLARE actividad RECORD; direccion TEXT; contador INT;
BEGIN
 FOR actividad IN SELECT * FROM (VALUES
  ('trineo-de-los-suenos','Trineo de los Sueños','Integración con valores de solidaridad y amor al prójimo en comunidad.','/actividades/trineo-suenos-1.jpg','trineo'),
  ('misiones','Misiones','Espacios de servicio y encuentro que fortalecen la vida en comunidad.','/actividades/misiones-3.jpg','misiones')
 ) AS datos(slug,nombre,descripcion,imagen,plantilla) LOOP
  IF NOT EXISTS(SELECT 1 FROM clubes WHERE tipo='actividad' AND plantilla=actividad.plantilla) THEN
   direccion:=actividad.slug; contador:=0;
   WHILE EXISTS(SELECT 1 FROM clubes WHERE slug=direccion) LOOP
    contador:=contador+1; direccion:=actividad.slug || '-actividad-' || contador;
   END LOOP;
   INSERT INTO clubes(tipo,slug,nombre_club,descripcion,categoria,imagen_portada,plantilla,estado_publicacion,cupo_maximo,participacion)
   VALUES('actividad',direccion,actividad.nombre,actividad.descripcion,'Servicio',actividad.imagen,actividad.plantilla,'publicada',NULL,NULL);
  END IF;
 END LOOP;
END $$;

COMMIT;
