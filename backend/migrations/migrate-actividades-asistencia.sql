-- Pase de lista de actividades. Aplicar manualmente después de unificar el
-- catálogo, antes de desplegar la aplicación. No crea accesos ni asistencias.
BEGIN;

CREATE TABLE IF NOT EXISTS actividades_asistencia_accesos (
    id_edicion INT PRIMARY KEY REFERENCES actividades_ediciones(id_edicion) ON DELETE RESTRICT,
    codigo VARCHAR(8) NOT NULL CHECK (codigo ~ '^[A-HJ-NP-Z2-9]{8}$'),
    id_autor INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS actividades_asistencias (
    id_registro INT PRIMARY KEY REFERENCES actividades_registros(id_registro) ON DELETE RESTRICT,
    estado VARCHAR(12) NOT NULL CHECK (estado IN ('presente', 'anulada')),
    registrada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    origen VARCHAR(10) NOT NULL CHECK (origen IN ('qr', 'codigo', 'manual')),
    id_actor INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    motivo_correccion VARCHAR(500),
    actualizada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (origen <> 'manual' OR LENGTH(BTRIM(motivo_correccion)) > 0),
    CHECK (origen <> 'manual' OR motivo_correccion IS NOT NULL)
);

COMMIT;
