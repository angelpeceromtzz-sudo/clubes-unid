-- ============================================================
-- MIGRACIÓN: Corregir DEFAULT de status en formularios
-- La BD de producción tenía DEFAULT 'Pendiente' en vez de 'En revisión'
-- El INSERT no especifica status, confía en el DEFAULT
-- ============================================================

ALTER TABLE formularios ALTER COLUMN status SET DEFAULT 'En revisión';
