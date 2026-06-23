CREATE TABLE IF NOT EXISTS formularios (
    id_formulario SERIAL PRIMARY KEY,
    id_alumno INT NOT NULL,
    id_club INT NOT NULL,
    fecha_envio TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    bloque_asignado CHAR(1) NOT NULL DEFAULT 'E',

    nombre_completo VARCHAR(150) NOT NULL,
    matricula VARCHAR(30) NOT NULL,
    carrera VARCHAR(100) NOT NULL,
    cuatrimestre INT NOT NULL,
    turno VARCHAR(20) NOT NULL,
    telefono_contacto VARCHAR(20) NOT NULL,
    motivo_ingreso TEXT NOT NULL,
    experiencia_previa TEXT DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'Pendiente',

    CONSTRAINT fk_formulario_alumno FOREIGN KEY (id_alumno) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_formulario_club FOREIGN KEY (id_club) REFERENCES clubes(id_club) ON DELETE CASCADE,
    CONSTRAINT chk_bloque CHECK (bloque_asignado IN ('A', 'B', 'E')),
    CONSTRAINT chk_cuatrimestre CHECK (cuatrimestre > 0),
    CONSTRAINT chk_status CHECK (status IN ('Pendiente', 'Aceptado', 'Rechazado'))
);

-- Migración para bases existentes que no tengan la columna status
ALTER TABLE formularios ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'Pendiente';
