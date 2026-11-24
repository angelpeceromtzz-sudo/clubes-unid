-- Eventos propios por club, gestionados por presidencia/vicepresidencia.
-- Ejecutar manualmente en la base de datos del proyecto.
CREATE TABLE IF NOT EXISTS eventos_clubes (
    id_evento_club SERIAL PRIMARY KEY,
    id_club INT NOT NULL REFERENCES clubes(id_club) ON DELETE CASCADE,
    id_autor INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    fecha_evento DATE NOT NULL,
    fecha_fin_evento DATE,
    hora_evento TIME,
    lugar_evento VARCHAR(200),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_evento_club_titulo CHECK (char_length(trim(titulo)) > 0),
    CONSTRAINT chk_evento_club_descripcion CHECK (char_length(trim(descripcion)) > 0),
    CONSTRAINT chk_evento_club_fechas CHECK (fecha_fin_evento IS NULL OR fecha_fin_evento >= fecha_evento)
);
ALTER TABLE eventos_clubes ADD COLUMN IF NOT EXISTS fecha_fin_evento DATE;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_evento_club_fechas' AND conrelid = 'eventos_clubes'::regclass) THEN
        ALTER TABLE eventos_clubes ADD CONSTRAINT chk_evento_club_fechas
            CHECK (fecha_fin_evento IS NULL OR fecha_fin_evento >= fecha_evento);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_eventos_clubes_fecha
    ON eventos_clubes (id_club, fecha_evento, hora_evento, id_evento_club);
