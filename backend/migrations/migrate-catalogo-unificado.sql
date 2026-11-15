-- Opción 2. Aplicar después de migrate-actividades.sql, con respaldo previo.
-- Una sola fuente operativa: clubes. Los catálogos anteriores quedan como vistas.
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

CREATE TABLE IF NOT EXISTS catalogo_equivalencias_actividades (
  id_actividad_anterior INT PRIMARY KEY,
  id_club INT NOT NULL UNIQUE REFERENCES clubes(id_club) ON DELETE RESTRICT,
  datos_originales JSONB NOT NULL,
  migrado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DO $$
DECLARE secuencia TEXT; ultimo BIGINT; usado BOOLEAN; maximo BIGINT;
BEGIN
 secuencia:=pg_get_serial_sequence('clubes','id_club');
 SELECT COALESCE(MAX(id_club),0) INTO maximo FROM clubes;
 EXECUTE format('SELECT last_value,is_called FROM %s',secuencia) INTO ultimo,usado;
 PERFORM setval(secuencia,GREATEST(ultimo,maximo),usado OR maximo>=ultimo);
END $$;

-- No empareja por nombre ni reutiliza IDs que puedan pertenecer a otro club.
DO $$
DECLARE fila RECORD; nuevo_id INT; nueva_slug TEXT; restriccion RECORD; contador INT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE oid=to_regclass('actividades') AND relkind='r') THEN
    FOR fila IN SELECT * FROM actividades ORDER BY id_actividad LOOP
      IF NOT EXISTS (SELECT 1 FROM catalogo_equivalencias_actividades WHERE id_actividad_anterior=fila.id_actividad) THEN
        nueva_slug := fila.slug;
        contador:=0;
        WHILE EXISTS (SELECT 1 FROM clubes WHERE slug=nueva_slug) LOOP
          contador:=contador+1;
          nueva_slug := left(fila.slug,65) || '-actividad-' || fila.id_actividad || CASE WHEN contador=1 THEN '' ELSE '-' || contador END;
        END LOOP;
        INSERT INTO clubes (nombre_club,descripcion,categoria,imagen_portada,tipo,slug,plantilla,estado_publicacion,mostrar_en_oferta,id_autor,id_responsable_club,propuesta,estado_propuesta,motivo_rechazo,actualizado_en,cupo_maximo,participacion)
        VALUES (fila.nombre,fila.descripcion,fila.categoria,fila.url_imagen,'actividad',nueva_slug,fila.plantilla,fila.estado,fila.mostrar_en_oferta,fila.id_autor,fila.id_responsable,fila.propuesta,fila.estado_propuesta,fila.motivo_rechazo,fila.actualizado_en,NULL,NULL)
        RETURNING id_club INTO nuevo_id;
        INSERT INTO catalogo_equivalencias_actividades VALUES (fila.id_actividad,nuevo_id,to_jsonb(fila),NOW());
      END IF;
    END LOOP;
    FOR restriccion IN SELECT conname FROM pg_constraint WHERE conrelid=to_regclass('actividades_ediciones') AND confrelid=to_regclass('actividades') LOOP
      EXECUTE format('ALTER TABLE actividades_ediciones DROP CONSTRAINT %I',restriccion.conname);
    END LOOP;
    UPDATE actividades_ediciones e SET id_actividad=m.id_club FROM catalogo_equivalencias_actividades m WHERE e.id_actividad=m.id_actividad_anterior;
    ALTER TABLE actividades RENAME TO actividades_catalogo_anterior;
  END IF;
END $$;
ALTER TABLE actividades_ediciones DROP CONSTRAINT IF EXISTS fk_edicion_catalogo;
ALTER TABLE actividades_ediciones ADD CONSTRAINT fk_edicion_catalogo FOREIGN KEY (id_actividad) REFERENCES clubes(id_club) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_edicion_propietario ON actividades_ediciones(id_edicion,id_actividad);

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
CREATE OR REPLACE VIEW actividades_fotos AS
 SELECT i.id_foto,p.id_edicion,p.id_club,p.id_publicacion,i.url_imagen,p.contenido AS pie,
        i.estado,p.id_autor,p.creado_en,i.orden,i.public_id
 FROM publicaciones_imagenes i JOIN publicaciones_oferta p ON p.id_publicacion=i.id_publicacion;
CREATE INDEX IF NOT EXISTS idx_publicaciones_oferta_dueno ON publicaciones_oferta(id_club,id_edicion,creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_publicaciones_imagenes_publicacion ON publicaciones_imagenes(id_publicacion,estado,orden);
CREATE TABLE IF NOT EXISTS clubes_reacciones (
 id_club INT NOT NULL REFERENCES clubes(id_club) ON DELETE RESTRICT,
 id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
 reaccion VARCHAR(10) NOT NULL CHECK (reaccion IN ('like','love','clap')),
 PRIMARY KEY(id_club,id_usuario)
);

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
 FOREACH tabla IN ARRAY ARRAY['inscripciones','formularios','horarios_club','convocatorias','convocatorias_inscripcion','solicitudes_horario','solicitudes_convocatoria','clubes_niveles','clubes_reacciones'] LOOP
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
COMMIT;
