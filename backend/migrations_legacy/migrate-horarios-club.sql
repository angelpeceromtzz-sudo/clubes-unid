CREATE TABLE IF NOT EXISTS horarios_club (
    id_horario SERIAL PRIMARY KEY,
    id_club INT NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    lugar VARCHAR(255) NOT NULL,
    ubicacion_maps VARCHAR(500) DEFAULT '',
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_horario_club FOREIGN KEY (id_club) REFERENCES clubes(id_club) ON DELETE CASCADE
);
