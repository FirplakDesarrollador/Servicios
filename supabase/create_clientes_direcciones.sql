-- ==============================================================================
-- VARIAS DIRECCIONES POR CLIENTE FINAL (tabla clientes_direcciones)
-- ==============================================================================
-- Hasta hoy cada cliente final (tabla "Consumidores") tenía una sola dirección,
-- guardada en sus columnas direccion, descripcion_direccion y ciudad_id
-- (departamento y zona salen de la ciudad). Hay clientes con dos o más casas y
-- productos FIRPLAK en cada una, así que ahora cada cliente puede tener varias.
--
-- Qué hace este script:
--   1. Crea clientes_direcciones: una fila por dirección (alias, dirección,
--      punto de referencia, ciudad, principal, activa).
--   2. Copia la dirección actual de cada cliente como su dirección PRINCIPAL.
--      No borra ni cambia nada de "Consumidores".
--   3. Mantiene "Consumidores" sincronizado con la dirección principal, en los
--      dos sentidos. Así las vistas e informes que hoy leen
--      Consumidores.direccion (query_servicios, query_consumidores, exportes,
--      PDF...) siguen funcionando igual y muestran la principal.
--   4. Agrega direccion_cliente_id (opcional) a "Servicios" y a
--      registro_solicitudes: la dirección que se escogió para ese servicio o
--      radicado. Los registros viejos quedan en NULL y se leen como antes
--      (dirección del cliente).
--   5. Crea la vista query_clientes_direcciones (dirección + ciudad,
--      departamento, zona y coordinador).
--
-- Ejecutar una sola vez en Supabase → SQL Editor. Es idempotente (se puede repetir).
-- La app funciona antes y después de ejecutarlo: mientras la tabla no exista,
-- simplemente no muestra el selector de direcciones.
-- ==============================================================================

BEGIN;

-- 1. Tabla de direcciones ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clientes_direcciones (
    id                     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    consumidor_id          bigint NOT NULL REFERENCES public."Consumidores"(id) ON DELETE CASCADE,
    alias                  text,                -- "Casa", "Casa campestre", "Apartamento Medellín"...
    direccion              text,
    descripcion_direccion  text,                -- punto de referencia
    ciudad_id              bigint REFERENCES public."Ciudades"(id),
    principal              boolean NOT NULL DEFAULT false,
    activa                 boolean NOT NULL DEFAULT true,
    created_at             timestamptz NOT NULL DEFAULT now(),
    created_by             uuid DEFAULT auth.uid(),
    updated_at             timestamptz NOT NULL DEFAULT now(),
    updated_by             uuid DEFAULT auth.uid(),
    -- La principal siempre está activa
    CONSTRAINT clientes_direcciones_principal_activa CHECK (NOT principal OR activa)
);

CREATE INDEX IF NOT EXISTS idx_clientes_direcciones_consumidor
    ON public.clientes_direcciones (consumidor_id);

-- Una sola dirección principal por cliente
CREATE UNIQUE INDEX IF NOT EXISTS uq_clientes_direcciones_principal
    ON public.clientes_direcciones (consumidor_id) WHERE principal;

COMMENT ON TABLE public.clientes_direcciones IS
    'Direcciones de cada cliente final (Consumidores). La principal se replica en Consumidores.direccion/descripcion_direccion/ciudad_id.';

-- 2. Migrar la dirección actual de cada cliente como principal ------------------
INSERT INTO public.clientes_direcciones
    (consumidor_id, alias, direccion, descripcion_direccion, ciudad_id, principal, activa, created_by, updated_by)
SELECT c.id, 'PRINCIPAL', c.direccion, c.descripcion_direccion, c.ciudad_id, true, true, NULL, NULL
FROM public."Consumidores" c
WHERE (NULLIF(btrim(coalesce(c.direccion, '')), '') IS NOT NULL OR c.ciudad_id IS NOT NULL)
  AND NOT EXISTS (
      SELECT 1 FROM public.clientes_direcciones d WHERE d.consumidor_id = c.id
  );

-- 3a. Antes de guardar una dirección: una sola principal y fechas de modificación
CREATE OR REPLACE FUNCTION public.clientes_direcciones_antes_de_guardar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at := now();
        NEW.updated_by := auth.uid();
    END IF;

    -- Cambios hechos por otro trigger (quitar la marca a la principal anterior,
    -- o copiar la dirección desde "Consumidores"): no repetir las reglas
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF NEW.consumidor_id IS DISTINCT FROM OLD.consumidor_id THEN
            RAISE EXCEPTION 'Una dirección no se puede pasar a otro cliente';
        END IF;
        -- No dejar al cliente sin principal desactivándola o quitándole la marca
        IF OLD.principal AND NOT NEW.principal
           AND NOT EXISTS (SELECT 1 FROM public.clientes_direcciones
                           WHERE consumidor_id = NEW.consumidor_id AND id <> NEW.id AND principal) THEN
            RAISE EXCEPTION 'Marque otra dirección como principal antes de quitarle la marca o desactivar esta';
        END IF;
    END IF;

    -- La primera dirección activa de un cliente queda como principal
    IF NEW.activa AND NOT NEW.principal
       AND NOT EXISTS (SELECT 1 FROM public.clientes_direcciones
                       WHERE consumidor_id = NEW.consumidor_id AND id IS DISTINCT FROM NEW.id AND principal) THEN
        NEW.principal := true;
    END IF;

    -- Al marcar esta como principal, las demás dejan de serlo
    IF NEW.principal THEN
        UPDATE public.clientes_direcciones
           SET principal = false
         WHERE consumidor_id = NEW.consumidor_id
           AND id IS DISTINCT FROM NEW.id
           AND principal;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clientes_direcciones_antes ON public.clientes_direcciones;
CREATE TRIGGER trg_clientes_direcciones_antes
    BEFORE INSERT OR UPDATE ON public.clientes_direcciones
    FOR EACH ROW EXECUTE FUNCTION public.clientes_direcciones_antes_de_guardar();

-- 3b. Después de guardar la principal: copiarla a "Consumidores"
CREATE OR REPLACE FUNCTION public.clientes_direcciones_sincronizar_consumidor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Evita el ciclo con el trigger de Consumidores (3c)
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;
    IF NEW.principal THEN
        UPDATE public."Consumidores"
           SET direccion = NEW.direccion,
               descripcion_direccion = NEW.descripcion_direccion,
               ciudad_id = NEW.ciudad_id
         WHERE id = NEW.consumidor_id
           AND (direccion IS DISTINCT FROM NEW.direccion
                OR descripcion_direccion IS DISTINCT FROM NEW.descripcion_direccion
                OR ciudad_id IS DISTINCT FROM NEW.ciudad_id);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clientes_direcciones_despues ON public.clientes_direcciones;
CREATE TRIGGER trg_clientes_direcciones_despues
    AFTER INSERT OR UPDATE ON public.clientes_direcciones
    FOR EACH ROW EXECUTE FUNCTION public.clientes_direcciones_sincronizar_consumidor();

-- 3c. Cuando se crea o edita un cliente con la dirección en "Consumidores"
--     (formulario de cliente final, upsert_consumidor_with_return, etc.),
--     esa dirección actualiza (o crea) su dirección principal.
CREATE OR REPLACE FUNCTION public.consumidores_sincronizar_direccion_principal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;
    IF TG_OP = 'UPDATE'
       AND NEW.direccion IS NOT DISTINCT FROM OLD.direccion
       AND NEW.descripcion_direccion IS NOT DISTINCT FROM OLD.descripcion_direccion
       AND NEW.ciudad_id IS NOT DISTINCT FROM OLD.ciudad_id THEN
        RETURN NEW;
    END IF;

    UPDATE public.clientes_direcciones
       SET direccion = NEW.direccion,
           descripcion_direccion = NEW.descripcion_direccion,
           ciudad_id = NEW.ciudad_id
     WHERE consumidor_id = NEW.id AND principal;

    IF NOT FOUND
       AND (NULLIF(btrim(coalesce(NEW.direccion, '')), '') IS NOT NULL OR NEW.ciudad_id IS NOT NULL) THEN
        INSERT INTO public.clientes_direcciones
            (consumidor_id, alias, direccion, descripcion_direccion, ciudad_id, principal, activa)
        VALUES (NEW.id, 'PRINCIPAL', NEW.direccion, NEW.descripcion_direccion, NEW.ciudad_id, true, true);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_consumidores_direccion_principal ON public."Consumidores";
CREATE TRIGGER trg_consumidores_direccion_principal
    AFTER INSERT OR UPDATE ON public."Consumidores"
    FOR EACH ROW EXECUTE FUNCTION public.consumidores_sincronizar_direccion_principal();

-- 4. Dirección escogida en servicios y radicados ------------------------------
ALTER TABLE public."Servicios"
    ADD COLUMN IF NOT EXISTS direccion_cliente_id bigint
    REFERENCES public.clientes_direcciones(id) ON DELETE SET NULL;

ALTER TABLE public.registro_solicitudes
    ADD COLUMN IF NOT EXISTS direccion_cliente_id bigint
    REFERENCES public.clientes_direcciones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_servicios_direccion_cliente
    ON public."Servicios" (direccion_cliente_id) WHERE direccion_cliente_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_registro_solicitudes_direccion_cliente
    ON public.registro_solicitudes (direccion_cliente_id) WHERE direccion_cliente_id IS NOT NULL;

COMMENT ON COLUMN public."Servicios".direccion_cliente_id IS
    'Dirección del cliente final donde se presta el servicio. NULL = dirección del cliente (registros anteriores).';
COMMENT ON COLUMN public.registro_solicitudes.direccion_cliente_id IS
    'Dirección del cliente final a la que aplica el radicado. NULL = dirección del cliente (registros anteriores).';

-- 5. Vista con ciudad, departamento, zona y coordinador --------------------------
CREATE OR REPLACE VIEW public.query_clientes_direcciones
WITH (security_invoker = true) AS
SELECT
    d.id,
    d.consumidor_id,
    d.alias,
    d.direccion,
    d.descripcion_direccion,
    d.ciudad_id,
    d.principal,
    d.activa,
    d.created_at,
    d.updated_at,
    c.ciudad,
    c.departamento,
    c.pais,
    c.zona,
    c.zona_id,
    c.coordinador_id
FROM public.clientes_direcciones d
LEFT JOIN public.query_ciudades c ON c.id = d.ciudad_id;

-- 6. Seguridad (RLS): solo usuarios con sesión iniciada -------------------------
ALTER TABLE public.clientes_direcciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clientes_direcciones lectura" ON public.clientes_direcciones;
DROP POLICY IF EXISTS "clientes_direcciones escritura" ON public.clientes_direcciones;

CREATE POLICY "clientes_direcciones lectura" ON public.clientes_direcciones
    FOR SELECT TO authenticated USING (true);

-- Sin DELETE: las direcciones se desactivan, no se borran (los servicios viejos las siguen usando)
CREATE POLICY "clientes_direcciones escritura" ON public.clientes_direcciones
    FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "clientes_direcciones edicion" ON public.clientes_direcciones;
CREATE POLICY "clientes_direcciones edicion" ON public.clientes_direcciones
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.clientes_direcciones TO authenticated;
GRANT SELECT ON public.query_clientes_direcciones TO authenticated;

COMMIT;

-- ==============================================================================
-- Verificación (opcional, después de ejecutar):
--   SELECT count(*) FROM public."Consumidores";                       -- clientes
--   SELECT count(*) FROM public.clientes_direcciones WHERE principal; -- ≈ clientes con dirección o ciudad
--   SELECT consumidor_id, count(*) FROM public.clientes_direcciones
--    WHERE principal GROUP BY 1 HAVING count(*) > 1;                  -- debe salir vacío
-- ==============================================================================
