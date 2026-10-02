CREATE TABLE IF NOT EXISTS notificaciones_eliminadas (
    id_notificacion INT NOT NULL,
    id_usuario INT NOT NULL,
    fecha_eliminacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_notificacion, id_usuario),
    CONSTRAINT fk_eliminada_notif FOREIGN KEY (id_notificacion) REFERENCES notificaciones(id_notificacion) ON DELETE CASCADE,
    CONSTRAINT fk_eliminada_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_eliminadas_usuario ON notificaciones_eliminadas(id_usuario);
