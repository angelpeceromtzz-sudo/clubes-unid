-- Confirma también en los registros históricos el límite de 70 caracteres.
-- PostgreSQL aborta sin cambiar respuestas si encuentra alguna fuera del límite.
ALTER TABLE detalle_respuestas
    VALIDATE CONSTRAINT chk_detalle_texto_otro;
