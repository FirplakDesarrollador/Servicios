-- ==============================================================================
-- MIGRACIÓN: AGREGAR COLUMNA MERCADO A LA TABLA CLIENTES
-- ==============================================================================
-- Esta migración agrega la columna 'mercado' a la tabla Clientes.
-- Es 100% compatible con registros históricos existentes (permite NULL).
-- ==============================================================================

-- 1. Agregar columna mercado (si no existe)
ALTER TABLE public."Clientes" 
ADD COLUMN IF NOT EXISTS "mercado" text;

-- 2. Restricción de verificación para valores válidos (permite NULL o vacíos para registros históricos)
ALTER TABLE public."Clientes" 
DROP CONSTRAINT IF EXISTS check_clientes_mercado;

ALTER TABLE public."Clientes" 
ADD CONSTRAINT check_clientes_mercado 
CHECK (mercado IS NULL OR mercado = '' OR mercado IN ('Nacional', 'Internacional'));

-- 3. Crear índice para acelerar los filtros por mercado y depuración
CREATE INDEX IF NOT EXISTS idx_clientes_mercado ON public."Clientes" (mercado);

-- 4. Comentario explicativo en la columna
COMMENT ON COLUMN public."Clientes".mercado IS 'Clasificación comercial de mercado: Nacional o Internacional. Es NULL para registros históricos sin clasificar.';
