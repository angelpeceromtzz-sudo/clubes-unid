-- Chat de texto por club: mensajes, menciones, presencia, fijados y moderación.
BEGIN;
CREATE TABLE IF NOT EXISTS club_chat_mensajes (
    id_mensaje BIGSERIAL PRIMARY KEY,
    id_club INT NOT NULL REFERENCES clubes(id_club) ON DELETE CASCADE,
    id_autor INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    contenido VARCHAR(400) NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    editado_en TIMESTAMPTZ,
    eliminado BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_club_chat_mensajes_lista ON club_chat_mensajes(id_club, id_mensaje DESC);
CREATE INDEX IF NOT EXISTS idx_club_chat_mensajes_autor ON club_chat_mensajes(id_club, id_autor, creado_en DESC);

CREATE TABLE IF NOT EXISTS club_chat_menciones (
    id_mensaje BIGINT NOT NULL REFERENCES club_chat_mensajes(id_mensaje) ON DELETE CASCADE,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    PRIMARY KEY (id_mensaje, id_usuario)
);
CREATE TABLE IF NOT EXISTS club_chat_fijados (
    id_mensaje BIGINT PRIMARY KEY REFERENCES club_chat_mensajes(id_mensaje) ON DELETE CASCADE,
    id_fijado_por INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS club_chat_silencios (
    id_club INT NOT NULL REFERENCES clubes(id_club) ON DELETE CASCADE,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_moderador INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    silenciado_hasta TIMESTAMPTZ,
    PRIMARY KEY (id_club, id_usuario)
);
ALTER TABLE club_chat_silencios ADD COLUMN IF NOT EXISTS silenciado_hasta TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS club_chat_presencia (
    id_club INT NOT NULL REFERENCES clubes(id_club) ON DELETE CASCADE,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    ultima_actividad TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    escribiendo_hasta TIMESTAMPTZ,
    PRIMARY KEY (id_club, id_usuario)
);
CREATE INDEX IF NOT EXISTS idx_club_chat_presencia_actividad ON club_chat_presencia(id_club, ultima_actividad DESC);
CREATE TABLE IF NOT EXISTS club_chat_lecturas (
    id_club INT NOT NULL REFERENCES clubes(id_club) ON DELETE CASCADE,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    ultimo_mensaje_id BIGINT NOT NULL DEFAULT 0,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id_club, id_usuario)
);
CREATE TABLE IF NOT EXISTS club_chat_notificaciones (
    id_notificacion INT PRIMARY KEY REFERENCES notificaciones(id_notificacion) ON DELETE CASCADE,
    id_mensaje BIGINT NOT NULL REFERENCES club_chat_mensajes(id_mensaje) ON DELETE CASCADE,
    id_destinatario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);
COMMIT;
