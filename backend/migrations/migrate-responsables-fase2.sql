-- Migración Fase 2: unicidad de responsable por club.
-- Un mismo usuario no puede ser responsable de más de un club.
CREATE UNIQUE INDEX IF NOT EXISTS uq_club_id_presidente
    ON clubes (id_presidente) WHERE id_presidente IS NOT NULL;
