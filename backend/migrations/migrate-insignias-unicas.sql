-- Evita otorgar la misma insignia (mismo nombre e imagen) dos veces al mismo usuario.
CREATE UNIQUE INDEX IF NOT EXISTS uq_expediente_reconocimiento_manual_usuario
  ON expediente_reconocimientos (id_usuario, lower(nombre_actividad), COALESCE(insignia_key, ''))
  WHERE tipo_actividad = 'manual';
