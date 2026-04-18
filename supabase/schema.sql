-- Tabla principal de viajes
CREATE TABLE IF NOT EXISTS viajes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha_carga DATE NOT NULL,
  fecha_traslado DATE NOT NULL,
  mes VARCHAR(20) NOT NULL,
  descripcion VARCHAR(255) NOT NULL DEFAULT 'Lima - Huancayo',
  numero_guia VARCHAR(50),
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'facturado')),
  numero_factura VARCHAR(50),
  detraccion VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (detraccion IN ('pendiente', 'realizado')),
  monto DECIMAL(10, 2) NOT NULL,
  -- Google Drive file IDs
  drive_id_guia VARCHAR(255),
  drive_id_factura VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER viajes_updated_at
  BEFORE UPDATE ON viajes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Índices para filtros frecuentes
CREATE INDEX IF NOT EXISTS idx_viajes_mes ON viajes(mes);
CREATE INDEX IF NOT EXISTS idx_viajes_estado ON viajes(estado);
CREATE INDEX IF NOT EXISTS idx_viajes_detraccion ON viajes(detraccion);
CREATE INDEX IF NOT EXISTS idx_viajes_fecha_traslado ON viajes(fecha_traslado);

-- Row Level Security (app de un solo usuario, simplificado)
ALTER TABLE viajes ENABLE ROW LEVEL SECURITY;

-- Política: solo usuarios autenticados pueden acceder
CREATE POLICY "Acceso solo autenticado" ON viajes
  FOR ALL USING (auth.role() = 'authenticated');
