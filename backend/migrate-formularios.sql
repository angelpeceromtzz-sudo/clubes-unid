CREATE TABLE IF NOT EXISTS formularios (
    id_formulario SERIAL PRIMARY KEY,
    id_alumno INT NOT NULL,
    id_club INT NOT NULL,
    id_convocatoria INT,
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
    status VARCHAR(20) NOT NULL DEFAULT 'En revisión',
    fecha_oferta TIMESTAMPTZ,
    fecha_expiracion TIMESTAMPTZ,
    fecha_respuesta TIMESTAMPTZ,
    motivo_rechazo VARCHAR(100),

    CONSTRAINT fk_formulario_alumno FOREIGN KEY (id_alumno) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_formulario_club FOREIGN KEY (id_club) REFERENCES clubes(id_club) ON DELETE CASCADE,
    CONSTRAINT fk_formulario_convocatoria FOREIGN KEY (id_convocatoria) REFERENCES convocatorias(id_convocatoria) ON DELETE SET NULL,
    CONSTRAINT chk_bloque CHECK (bloque_asignado IN ('A', 'B', 'E')),
    CONSTRAINT chk_cuatrimestre CHECK (cuatrimestre > 0),
    CONSTRAINT chk_status CHECK (status IN ('En revisión', 'Preseleccionado', 'Convocado', 'Oferta enviada', 'Miembro oficial', 'Rechazado'))
);
