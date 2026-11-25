-- Convierte el contenido de noticias a un documento JSON sencillo.
-- Cada texto previo se guarda íntegro en un bloque de párrafo.
DO $$
DECLARE
    tipo_columna TEXT;
BEGIN
    SELECT data_type INTO tipo_columna
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'noticias'
      AND column_name = 'contenido';

    IF tipo_columna IS NULL THEN
        RAISE EXCEPTION 'No existe noticias.contenido; no se modificó ninguna fila';
    ELSIF tipo_columna = 'text' THEN
        ALTER TABLE noticias
            ALTER COLUMN contenido TYPE JSONB
            USING jsonb_build_object(
                'version', 1,
                'blocks', jsonb_build_array(
                    jsonb_build_object('type', 'paragraph', 'text', contenido)
                )
            );
    ELSIF tipo_columna <> 'jsonb' THEN
        RAISE EXCEPTION 'noticias.contenido tiene tipo % no compatible; no se modificó ninguna fila', tipo_columna;
    END IF;

    IF EXISTS (
        SELECT 1 FROM noticias
        WHERE jsonb_typeof(contenido) IS DISTINCT FROM 'object'
           OR contenido->>'version' IS DISTINCT FROM '1'
           OR jsonb_typeof(contenido->'blocks') IS DISTINCT FROM 'array'
    ) THEN
        RAISE EXCEPTION 'Hay documentos de noticias con formato desconocido; no se modificaron filas';
    END IF;
END $$;

ALTER TABLE noticias ALTER COLUMN contenido SET NOT NULL;
ALTER TABLE noticias DROP CONSTRAINT IF EXISTS chk_noticia_contenido_documento;
ALTER TABLE noticias ADD CONSTRAINT chk_noticia_contenido_documento CHECK (
    jsonb_typeof(contenido) = 'object'
    AND contenido->>'version' = '1'
    AND jsonb_typeof(contenido->'blocks') = 'array'
);

CREATE OR REPLACE FUNCTION fn_noticia_texto_plano(documento JSONB)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT COALESCE(string_agg(bloque->>'text', E'\n' ORDER BY posicion), '')
    FROM jsonb_array_elements(documento->'blocks') WITH ORDINALITY AS b(bloque, posicion)
    WHERE bloque->>'type' IN ('paragraph', 'heading');
$$;

COMMENT ON COLUMN noticias.contenido IS
    'Documento JSON versión 1. blocks admite párrafos, títulos e imágenes HTTPS de Cloudinary; el backend valida cada bloque.';
COMMENT ON TABLE noticias IS
    'Contenido editorial institucional en documento JSON; url_imagen conserva la imagen de portada.';
