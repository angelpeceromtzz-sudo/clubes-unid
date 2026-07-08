-- ============================================================
-- MIGRACIÓN: Asegurar columna id_destinatario en notificaciones
-- ============================================================

ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS id_destinatario INT;
CREATE INDEX IF NOT EXISTS idx_notif_destinatario ON notificaciones(id_destinatario);
