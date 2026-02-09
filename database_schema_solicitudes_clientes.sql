-- Tabla para almacenar las solicitudes de clientes finales
CREATE TABLE IF NOT EXISTS solicitudes_clientes (
  id BIGSERIAL PRIMARY KEY,
  consecutivo TEXT UNIQUE NOT NULL,
  
  -- Información Personal
  tipo_persona TEXT NOT NULL CHECK (tipo_persona IN ('Persona Natural', 'Persona Jurídica')),
  numero_id TEXT NOT NULL,
  razon_social TEXT NOT NULL,
  persona_contacto TEXT,
  correo TEXT NOT NULL,
  telefono TEXT NOT NULL,
  
  -- Información del Servicio
  ciudad TEXT NOT NULL,
  direccion TEXT NOT NULL,
  punto_referencia TEXT,
  tipo_servicio TEXT NOT NULL,
  
  -- Información del Producto
  grupo TEXT,
  medida TEXT,
  observaciones TEXT,
  
  -- Documentos
  rut_url TEXT,
  factura_url TEXT,
  
  -- Confirmación y Pago
  confirma_recepcion BOOLEAN NOT NULL DEFAULT false,
  valor_pagar NUMERIC(10, 2),
  
  -- Metadata
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices para búsqueda rápida
  CONSTRAINT chk_email CHECK (correo ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_solicitudes_consecutivo ON solicitudes_clientes(consecutivo);
CREATE INDEX IF NOT EXISTS idx_solicitudes_numero_id ON solicitudes_clientes(numero_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_correo ON solicitudes_clientes(correo);
CREATE INDEX IF NOT EXISTS idx_solicitudes_fecha_creacion ON solicitudes_clientes(fecha_creacion DESC);

-- Trigger para actualizar fecha_actualizacion automáticamente
CREATE OR REPLACE FUNCTION update_fecha_actualizacion()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fecha_actualizacion
  BEFORE UPDATE ON solicitudes_clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_fecha_actualizacion();

-- Habilitar Row Level Security (RLS)
ALTER TABLE solicitudes_clientes ENABLE ROW LEVEL SECURITY;

-- Política para permitir INSERT sin autenticación (formulario público)
CREATE POLICY "Allow public insert" ON solicitudes_clientes
  FOR INSERT
  WITH CHECK (true);

-- Política para permitir SELECT solo a usuarios autenticados
CREATE POLICY "Allow authenticated select" ON solicitudes_clientes
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Política para permitir UPDATE solo a usuarios autenticados
CREATE POLICY "Allow authenticated update" ON solicitudes_clientes
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Comentarios para documentación
COMMENT ON TABLE solicitudes_clientes IS 'Almacena las solicitudes de servicio enviadas por clientes finales a través del formulario público';
COMMENT ON COLUMN solicitudes_clientes.consecutivo IS 'Número único de seguimiento de la solicitud';
COMMENT ON COLUMN solicitudes_clientes.tipo_persona IS 'Tipo de persona: Natural o Jurídica';
COMMENT ON COLUMN solicitudes_clientes.rut_url IS 'URL del archivo RUT (obligatorio para personas jurídicas)';
COMMENT ON COLUMN solicitudes_clientes.factura_url IS 'URL del archivo de factura (obligatorio)';
