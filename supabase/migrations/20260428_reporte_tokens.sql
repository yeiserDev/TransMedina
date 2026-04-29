-- Tabla para tokens de acceso público al estado de cuenta
CREATE TABLE IF NOT EXISTS reporte_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token       TEXT        UNIQUE NOT NULL,
  cliente_nombre TEXT     NOT NULL,
  fecha_inicio   DATE,
  fecha_fin      DATE,
  activo      BOOLEAN     NOT NULL DEFAULT true,
  expira_en   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Solo el service_role puede leer/escribir (nunca anon/public)
ALTER TABLE reporte_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON reporte_tokens
  USING (auth.role() = 'service_role');
