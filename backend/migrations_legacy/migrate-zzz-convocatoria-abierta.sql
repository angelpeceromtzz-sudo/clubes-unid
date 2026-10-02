-- ============================================================
-- MIGRACIÓN: Control de apertura/cierre de convocatorias
-- Agrega columnas para gestionar el periodo de reclutamiento
-- estado_convocatoria: 'abierta', 'cerrada_manual', 'cerrada_por_limite'
-- ============================================================

ALTER TABLE clubes
  ADD COLUMN IF NOT EXISTS estado_convocatoria VARCHAR(20) DEFAULT 'cerrada_manual',
  ADD COLUMN IF NOT EXISTS max_postulaciones INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS postulaciones_actuales INTEGER DEFAULT 0;

-- Si existía la columna booleana previa, migrar datos y eliminarla
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'clubes' AND column_name = 'convocatoria_abierta') THEN
    UPDATE clubes
      SET estado_convocatoria = CASE WHEN convocatoria_abierta THEN 'abierta' ELSE 'cerrada_manual' END
      WHERE estado_convocatoria = 'cerrada_manual';
    ALTER TABLE clubes DROP COLUMN convocatoria_abierta;
  END IF;
END $$;
