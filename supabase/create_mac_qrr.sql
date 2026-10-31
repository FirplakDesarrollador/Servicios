-- ==============================================================================
-- QRR DE INDICADORES MAC: tabla compartida + histórico de cambios
-- ==============================================================================
-- Antes los QRR se guardaban solo en el navegador de cada persona (localStorage):
-- se perdían al borrar el historial o cambiar de equipo y nadie más los veía.
-- Con esta tabla quedan compartidos por todo el equipo y cada cambio queda en
-- mac_qrr_historial (quién, cuándo y cómo quedó el registro).
--
-- Ejecutar una sola vez en Supabase → SQL Editor. Es idempotente (se puede repetir).
-- La app sube automáticamente los QRR que cada usuario tenga en su navegador
-- la primera vez que abra Indicadores MAC después de crear la tabla.
-- ==============================================================================

-- 1. Tabla principal: un registro QRR por fila (el contenido completo va en "data")
CREATE TABLE IF NOT EXISTS public.mac_qrr (
    id          text PRIMARY KEY,
    data        jsonb NOT NULL,
    estado      text GENERATED ALWAYS AS (data->>'estado') STORED,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    created_by  uuid DEFAULT auth.uid(),
    updated_by  uuid DEFAULT auth.uid()
);

CREATE INDEX IF NOT EXISTS idx_mac_qrr_estado ON public.mac_qrr (estado);

-- 2. Histórico: una fila por cada creación, cambio o eliminación
CREATE TABLE IF NOT EXISTS public.mac_qrr_historial (
    id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    qrr_id    text NOT NULL,
    accion    text NOT NULL CHECK (accion IN ('CREADO', 'ACTUALIZADO', 'ELIMINADO')),
    data      jsonb,
    usuario   uuid DEFAULT auth.uid(),
    fecha     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mac_qrr_historial_qrr ON public.mac_qrr_historial (qrr_id, fecha DESC);

-- 3. Trigger: sella fecha/usuario de modificación y registra el histórico
CREATE OR REPLACE FUNCTION public.mac_qrr_registrar_cambio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.mac_qrr_historial (qrr_id, accion, data) VALUES (OLD.id, 'ELIMINADO', OLD.data);
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.data IS NOT DISTINCT FROM OLD.data THEN
            RETURN NEW; -- sin cambios reales, no ensuciar el histórico
        END IF;
        NEW.updated_at := now();
        NEW.updated_by := auth.uid();
        INSERT INTO public.mac_qrr_historial (qrr_id, accion, data) VALUES (NEW.id, 'ACTUALIZADO', NEW.data);
        RETURN NEW;
    END IF;

    INSERT INTO public.mac_qrr_historial (qrr_id, accion, data) VALUES (NEW.id, 'CREADO', NEW.data);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mac_qrr_cambio ON public.mac_qrr;
CREATE TRIGGER trg_mac_qrr_cambio
    BEFORE INSERT OR UPDATE OR DELETE ON public.mac_qrr
    FOR EACH ROW EXECUTE FUNCTION public.mac_qrr_registrar_cambio();

-- 4. Seguridad (RLS): solo usuarios con sesión iniciada
ALTER TABLE public.mac_qrr ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mac_qrr_historial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mac_qrr lectura" ON public.mac_qrr;
DROP POLICY IF EXISTS "mac_qrr escritura" ON public.mac_qrr;
DROP POLICY IF EXISTS "mac_qrr_historial lectura" ON public.mac_qrr_historial;

CREATE POLICY "mac_qrr lectura" ON public.mac_qrr
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "mac_qrr escritura" ON public.mac_qrr
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- El histórico solo se lee desde la app; lo escribe el trigger
CREATE POLICY "mac_qrr_historial lectura" ON public.mac_qrr_historial
    FOR SELECT TO authenticated USING (true);
