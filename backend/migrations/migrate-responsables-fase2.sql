-- Migración Fase 2: unicidad de responsable por club.
-- Un mismo usuario no puede ser responsable de más de un club.
CREATE UNIQUE INDEX IF NOT EXISTS uq_club_id_responsable_club
    ON clubes (id_responsable_club) WHERE id_responsable_club IS NOT NULL;
