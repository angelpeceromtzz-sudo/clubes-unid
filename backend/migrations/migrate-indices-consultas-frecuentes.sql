-- Acelera consultas existentes sobre clubes y notificaciones del chat.
CREATE INDEX IF NOT EXISTS idx_clubes_vicepresidente
    ON clubes (id_vicepresidente)
    WHERE id_vicepresidente IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clubes_estatus_publicacion
    ON clubes (id_estatus_club, estado_publicacion);

CREATE INDEX IF NOT EXISTS idx_chat_notificaciones_mensaje_destinatario
    ON club_chat_notificaciones (id_mensaje, id_destinatario);
