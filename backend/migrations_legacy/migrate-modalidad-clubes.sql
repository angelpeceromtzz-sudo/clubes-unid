-- Modalidad de clubes: participacion (valor único) + niveles (tabla hija 1:N)
-- Patrones: cat_roles, horarios_club, chk_audiencia

CREATE TABLE IF NOT EXISTS cat_niveles (
    id_nivel SERIAL PRIMARY KEY,
    nombre_nivel VARCHAR(20) UNIQUE NOT NULL
);

INSERT INTO cat_niveles (id_nivel, nombre_nivel) VALUES
    (1, 'principiante'),
    (2, 'intermedio'),
    (3, 'avanzado')
ON CONFLICT (id_nivel) DO UPDATE SET nombre_nivel = EXCLUDED.nombre_nivel;

ALTER TABLE clubes ADD COLUMN IF NOT EXISTS participacion VARCHAR(20) NOT NULL DEFAULT 'mixta'
    CONSTRAINT chk_club_participacion
    CHECK (participacion IN ('masculina', 'femenina', 'mixta'));

CREATE TABLE IF NOT EXISTS clubes_niveles (
    id_club INT NOT NULL,
    id_nivel INT NOT NULL,
    PRIMARY KEY (id_club, id_nivel),
    CONSTRAINT fk_club_nivel_club  FOREIGN KEY (id_club)  REFERENCES clubes(id_club)  ON DELETE CASCADE,
    CONSTRAINT fk_club_nivel_nivel FOREIGN KEY (id_nivel) REFERENCES cat_niveles(id_nivel) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_clubes_niveles_nivel ON clubes_niveles(id_nivel);

-- Backfill: los clubes que ya existan al correr la migración asumen "todos los niveles" (1, 2, 3),
-- mismo espíritu que el DEFAULT 'mixta' de participacion: ningún club queda en estado vacío.
INSERT INTO clubes_niveles (id_club, id_nivel)
SELECT c.id_club, n.id_nivel
FROM clubes c
CROSS JOIN cat_niveles n
ON CONFLICT (id_club, id_nivel) DO NOTHING;
