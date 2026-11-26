-- Evita otorgar la misma insignia (mismo nombre e imagen) dos veces al mismo usuario.
CREATE UNIQUE INDEX IF NOT EXISTS uq_expediente_reconocimiento_insignia_usuario
  ON expediente_reconocimientos (id_usuario, id_insignia)
  WHERE id_insignia IS NOT NULL;
