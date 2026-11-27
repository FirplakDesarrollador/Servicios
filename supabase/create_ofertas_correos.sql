-- ==============================================================================
-- OFERTAS DE VENTA: tiempos desde el correo del asesor (buzón cotizaciones@)
-- ==============================================================================
-- La hoja Ofertas de Indicadores MAC lee los Enviados de cotizaciones@firplak.com
-- (botón "Sincronizar correos"), busca las respuestas "Oferta de venta n° ####" y
-- guarda aquí una fila por oferta respondida: cuándo escribió el asesor y cuándo
-- se le respondió. La hoja cruza el número con la oferta en SAP.
--
-- Ejecutar una sola vez en Supabase → SQL Editor. Es idempotente (se puede repetir).
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ofertas_correos (
    message_id            text NOT NULL,           -- id del correo de respuesta en Outlook
    numero_oferta         integer NOT NULL,        -- DocNum de la oferta de venta en SAP
    fecha_respuesta       timestamptz NOT NULL,    -- cuándo se respondió "Oferta de venta n° ####"
    fecha_correo_asesor   timestamptz,             -- cuándo envió el asesor el correo citado (null si no se pudo leer)
    asesor                text,                    -- quién envió el correo original (línea "De:")
    asunto                text,
    sincronizado_at       timestamptz NOT NULL DEFAULT now(),
    sincronizado_por      uuid DEFAULT auth.uid(),
    PRIMARY KEY (message_id, numero_oferta)
);

CREATE INDEX IF NOT EXISTS idx_ofertas_correos_numero ON public.ofertas_correos (numero_oferta);
CREATE INDEX IF NOT EXISTS idx_ofertas_correos_respuesta ON public.ofertas_correos (fecha_respuesta);

ALTER TABLE public.ofertas_correos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ofertas_correos lectura" ON public.ofertas_correos;
DROP POLICY IF EXISTS "ofertas_correos escritura" ON public.ofertas_correos;

CREATE POLICY "ofertas_correos lectura" ON public.ofertas_correos
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "ofertas_correos escritura" ON public.ofertas_correos
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
