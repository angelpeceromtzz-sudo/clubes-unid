CREATE TABLE IF NOT EXISTS club_chat_reacciones (
    id_mensaje BIGINT NOT NULL REFERENCES club_chat_mensajes(id_mensaje) ON DELETE CASCADE,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    emoji VARCHAR(8) NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id_mensaje, id_usuario, emoji),
    CONSTRAINT chk_club_chat_reaccion_emoji CHECK (emoji IN ('👍', '❤️', '😂', '🎉', '👏', '😮', '😢', '🔥', '🐺', '✨', '💙', '🙌'))
);
CREATE INDEX IF NOT EXISTS idx_club_chat_reacciones_mensaje ON club_chat_reacciones(id_mensaje);
