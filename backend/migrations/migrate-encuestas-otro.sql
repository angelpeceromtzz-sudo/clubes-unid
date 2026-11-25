-- Archivo histórico retirado. La antigua versión ampliaba el límite a 200
-- caracteres y no debe volver a ejecutarse sobre una base actualizada.
-- Usa migrate-encuestas-otro-reglas.sql mediante el ejecutor administrado.
DO $$
BEGIN
    RAISE EXCEPTION
      'Migración retirada: no la ejecutes. Usa migrate-encuestas-otro-reglas.sql mediante el ejecutor administrado.';
END $$;
