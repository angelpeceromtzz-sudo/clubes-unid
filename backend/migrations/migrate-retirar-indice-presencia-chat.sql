-- Las rutas consultan presencia por la PK (id_club, id_usuario).
-- Este índice por actividad se reescribía en cada latido y no lo usan esas consultas.
DROP INDEX IF EXISTS idx_club_chat_presencia_actividad;
