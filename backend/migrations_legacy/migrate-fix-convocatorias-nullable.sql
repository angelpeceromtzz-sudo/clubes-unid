-- ============================================================
-- MIGRACIÓN: Hacer NULLable columnas que no corresponden al diseño actual
-- El código agrupa N formularios en 1 convocatoria (por bloque)
-- La relación va de formularios -> convocatorias, no al revés
-- ============================================================

-- id_formulario no pertenece aquí (la relación es formularios.id_convocatoria)
ALTER TABLE convocatorias DROP COLUMN IF EXISTS id_formulario;

-- fecha y hora son opcionales (se asignan después por el presidente)
ALTER TABLE convocatorias ALTER COLUMN fecha DROP NOT NULL;
ALTER TABLE convocatorias ALTER COLUMN hora DROP NOT NULL;

-- id_presidente es derivable desde clubes
ALTER TABLE convocatorias ALTER COLUMN id_presidente DROP NOT NULL;
