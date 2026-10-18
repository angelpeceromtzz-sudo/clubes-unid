-- Migración aditiva: imagen exclusiva para móvil en diapositivas del hero.
--
-- Cada diapositiva puede tener una segunda imagen (url_imagen_movil) que se
-- muestra en pantallas pequeñas; si es NULL, el frontend usa la imagen de
-- escritorio (url_imagen) como hoy. La columna es opcional: no afecta a las
-- filas existentes ni a las consultas que no la mencionen.
--
-- Esta migración NO se ejecuta automáticamente en el arranque. Aplicarla es un
-- paso manual/planificado sobre la base de datos (Supabase/Render), después de
-- confirmar el estado real de la tabla diapositivas_hero.

ALTER TABLE diapositivas_hero
    ADD COLUMN IF NOT EXISTS url_imagen_movil VARCHAR(500);
