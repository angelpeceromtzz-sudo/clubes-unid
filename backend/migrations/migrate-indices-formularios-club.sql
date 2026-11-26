-- Acelera el listado de postulaciones por club y su orden cronológico.
-- El primer campo también permite localizar las filas al validar la FK del club.
CREATE INDEX IF NOT EXISTS idx_formularios_club_fecha
    ON formularios (id_club, fecha_envio DESC);
