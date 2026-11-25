-- Reacciones seleccionables en los avisos del club.
BEGIN;
CREATE TABLE IF NOT EXISTS avisos_reacciones (
    id_aviso INT NOT NULL REFERENCES avisos_clubes(id_aviso) ON DELETE CASCADE,
    id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    reaccion VARCHAR(10) NOT NULL CHECK (reaccion IN ('like', 'love', 'clap')),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_aviso, id_usuario)
);
COMMIT;
