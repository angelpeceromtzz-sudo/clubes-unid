-- Refuerza dos reglas ya aplicadas por la API y las protege ante concurrencia.
-- No modifica ni elimina filas. Si existen duplicados heredados, aborta toda la
-- transacción para que puedan revisarse sin perder información.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM usuarios
        GROUP BY lower(btrim(correo_institucional))
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Migración detenida: hay correos duplicados ignorando mayúsculas/espacios en usuarios';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM formularios
        WHERE id_convocatoria_inscripcion IS NOT NULL
        GROUP BY id_alumno, id_club, id_convocatoria_inscripcion
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Migración detenida: hay postulaciones duplicadas por alumno, club y ciclo';
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_correo_normalizado
    ON usuarios (lower(btrim(correo_institucional)));

CREATE UNIQUE INDEX IF NOT EXISTS uq_formulario_alumno_club_ciclo
    ON formularios (id_alumno, id_club, id_convocatoria_inscripcion)
    WHERE id_convocatoria_inscripcion IS NOT NULL;

