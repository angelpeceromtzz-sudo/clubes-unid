-- Acelera la búsqueda de postulaciones por bloque de entrevista y la revisión
-- de la FK cuando se retira una convocatoria. No modifica filas.
CREATE INDEX IF NOT EXISTS idx_formularios_convocatoria
    ON formularios (id_convocatoria)
    WHERE id_convocatoria IS NOT NULL;
