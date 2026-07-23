CREATE TABLE IF NOT EXISTS historial_admin (
    id_historial SERIAL PRIMARY KEY,
    id_admin INT NOT NULL,
    admin_nombre VARCHAR(150) NOT NULL,
    accion VARCHAR(50) NOT NULL,
    descripcion TEXT NOT NULL,
    entidad_tipo VARCHAR(50),
    entidad_id INT,
    detalles JSONB,
    fecha TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_historial_admin FOREIGN KEY (id_admin) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial_admin(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_historial_admin ON historial_admin(id_admin);
