-- Migración: renombra id_presidente -> id_responsable_club en clubes y convocatorias
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clubes' AND column_name = 'id_presidente') THEN
    ALTER TABLE clubes RENAME COLUMN id_presidente TO id_responsable_club;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'convocatorias' AND column_name = 'id_presidente') THEN
    ALTER TABLE convocatorias RENAME COLUMN id_presidente TO id_responsable_club;
  END IF;
END $$;

-- Renombrar índices/constraints si existen
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_club_presidente') THEN
    ALTER TABLE clubes RENAME CONSTRAINT fk_club_presidente TO fk_club_responsable;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_club_id_responsable_club
  ON clubes (id_responsable_club) WHERE id_responsable_club IS NOT NULL;
