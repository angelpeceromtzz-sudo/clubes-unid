-- ============================================================
-- Migración: tabla de diapositivas del hero (carrusel principal)
-- ============================================================

CREATE TABLE IF NOT EXISTS diapositivas_hero (
    id_diapositiva      SERIAL PRIMARY KEY,
    titulo              VARCHAR(200) NOT NULL,
    subtitulo           VARCHAR(300),
    url_imagen          VARCHAR(500) NOT NULL,
    alineacion          VARCHAR(10) NOT NULL DEFAULT 'izquierda',
    orden               INT NOT NULL DEFAULT 0,
    activa              BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_alineacion CHECK (alineacion IN ('izquierda', 'centro', 'derecha'))
);

-- ============================================================
-- Trigger: auto-actualizar fecha_actualizacion al modificar
-- ============================================================

CREATE OR REPLACE FUNCTION fn_actualizar_fecha_diapositiva()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_actualizar_fecha_diapositiva ON diapositivas_hero;

CREATE TRIGGER trg_actualizar_fecha_diapositiva
    BEFORE UPDATE ON diapositivas_hero
    FOR EACH ROW
    EXECUTE FUNCTION fn_actualizar_fecha_diapositiva();

-- ============================================================
-- Trigger: impedir desactivar la última diapositiva activa
-- ============================================================

CREATE OR REPLACE FUNCTION fn_proteger_ultima_diapositiva_activa()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo aplica al desactivar (UPDATE activa=true→false) o eliminar una activa
    IF (TG_OP = 'UPDATE' AND OLD.activa = TRUE AND NEW.activa = FALSE)
       OR (TG_OP = 'DELETE' AND OLD.activa = TRUE) THEN
        IF NOT EXISTS (
            SELECT 1 FROM diapositivas_hero
            WHERE activa = TRUE
              AND id_diapositiva != CASE WHEN TG_OP = 'DELETE'
                                          THEN OLD.id_diapositiva
                                          ELSE NEW.id_diapositiva END
        ) THEN
            RAISE EXCEPTION 'Debe existir al menos una diapositiva activa';
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proteger_ultima_diapositiva ON diapositivas_hero;

CREATE TRIGGER trg_proteger_ultima_diapositiva
    BEFORE UPDATE OR DELETE ON diapositivas_hero
    FOR EACH ROW
    EXECUTE FUNCTION fn_proteger_ultima_diapositiva_activa();

-- ============================================================
-- Seed: migrar las 4 diapositivas actuales (Heroe.jsx)
-- Solo inserta si la tabla está vacía (idempotente)
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM diapositivas_hero LIMIT 1) THEN
        INSERT INTO diapositivas_hero (titulo, subtitulo, url_imagen, alineacion, orden, activa) VALUES
            ('Bienvenidos a la manada',           NULL, 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?q=80&w=1470&auto=format&fit=crop', 'derecha',   1, TRUE),
            ('Gala Cultural — Auditorio Principal', NULL, 'https://images.unsplash.com/photo-1526470608269-f658cec19927?q=80&w=1470&auto=format&fit=crop', 'izquierda', 2, TRUE),
            ('Exposición Anual de Artes Plásticas', NULL, 'https://images.unsplash.com/photo-1529543544282-eaaf510c6c15?q=80&w=1470&auto=format&fit=crop', 'derecha',   3, TRUE),
            ('Torneo Nacional de Esports 2025',    NULL, 'https://images.unsplash.com/photo-1575361204480-a430a8e7eae0?q=80&w=1471&auto=format&fit=crop', 'izquierda', 4, TRUE);
    END IF;
END $$;
