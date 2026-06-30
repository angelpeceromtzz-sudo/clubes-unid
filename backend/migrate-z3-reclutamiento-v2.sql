-- ============================================================
-- MIGRACIÓN: Historial de postulación y catálogo de estatus
-- ============================================================

-- 1. Catálogo de estados de postulación (referencia)
CREATE TABLE IF NOT EXISTS cat_estatus_postulacion (
    id_estatus SERIAL PRIMARY KEY,
    nombre VARCHAR(20) UNIQUE NOT NULL,
    orden INT NOT NULL DEFAULT 0,
    es_final BOOLEAN DEFAULT FALSE
);

INSERT INTO cat_estatus_postulacion (nombre, orden, es_final) VALUES
    ('En revisión', 1, FALSE),
    ('Preseleccionado', 2, FALSE),
    ('Convocado', 3, FALSE),
    ('Oferta enviada', 4, FALSE),
    ('Miembro oficial', 5, TRUE),
    ('Rechazado', 6, TRUE)
ON CONFLICT (nombre) DO NOTHING;

-- 2. Tabla de historial de postulación para la línea de tiempo
CREATE TABLE IF NOT EXISTS historial_postulacion (
    id_historial SERIAL PRIMARY KEY,
    id_formulario INT NOT NULL,
    status_anterior VARCHAR(20),
    status_nuevo VARCHAR(20) NOT NULL,
    fecha_cambio TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_historial_formulario
        FOREIGN KEY (id_formulario) REFERENCES formularios(id_formulario) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_historial_formulario ON historial_postulacion(id_formulario);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial_postulacion(fecha_cambio DESC);

-- 3. Trigger function para historial automático
CREATE OR REPLACE FUNCTION fn_historial_postulacion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO historial_postulacion (id_formulario, status_anterior, status_nuevo)
        VALUES (NEW.id_formulario, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_historial_postulacion ON formularios;
CREATE TRIGGER trg_historial_postulacion
    AFTER UPDATE OF status ON formularios
    FOR EACH ROW
    EXECUTE FUNCTION fn_historial_postulacion();
