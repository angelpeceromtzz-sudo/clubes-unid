-- Evita que dos periodos de actividad se empalmen. Primero se revisa el estado
-- actual y se aborta sin cambios si hay fechas inválidas o traslapes heredados.
DO $$
DECLARE
    v_periodo_a INT;
    v_periodo_b INT;
BEGIN
    IF EXISTS (
        SELECT 1 FROM periodos_actividad WHERE fecha_fin < fecha_inicio
    ) THEN
        RAISE EXCEPTION 'Migración detenida: hay periodos cuya fecha final precede a la inicial';
    END IF;

    SELECT a.id_periodo, b.id_periodo
      INTO v_periodo_a, v_periodo_b
    FROM periodos_actividad a
    JOIN periodos_actividad b ON a.id_periodo < b.id_periodo
    WHERE daterange(a.fecha_inicio, a.fecha_fin, '[]')
       && daterange(b.fecha_inicio, b.fecha_fin, '[]')
    ORDER BY a.fecha_inicio, b.fecha_inicio
    LIMIT 1;

    IF v_periodo_a IS NOT NULL THEN
        RAISE EXCEPTION 'Migración detenida: los periodos % y % se traslapan', v_periodo_a, v_periodo_b;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_periodos_fechas' AND conrelid = 'periodos_actividad'::regclass
    ) THEN
        ALTER TABLE periodos_actividad
            ADD CONSTRAINT chk_periodos_fechas CHECK (fecha_fin >= fecha_inicio);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ex_periodos_actividad_sin_traslape' AND conrelid = 'periodos_actividad'::regclass
    ) THEN
        ALTER TABLE periodos_actividad
            ADD CONSTRAINT ex_periodos_actividad_sin_traslape
            EXCLUDE USING gist (daterange(fecha_inicio, fecha_fin, '[]') WITH &&);
    END IF;
END $$;
