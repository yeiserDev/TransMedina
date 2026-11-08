BEGIN;

CREATE TABLE public.externos_viajes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente text NOT NULL CHECK (length(trim(cliente)) BETWEEN 1 AND 160),
  ruta text NOT NULL CHECK (length(trim(ruta)) BETWEEN 1 AND 250),
  fecha date NOT NULL,
  monto numeric(10,2) NOT NULL CHECK (monto > 0),
  estado text NOT NULL DEFAULT 'programado' CHECK (estado IN ('programado','realizado','cancelado')),
  notas text NOT NULL DEFAULT '' CHECK (length(notas) <= 2000),
  detraccion_monto numeric(10,2) NOT NULL DEFAULT 0 CHECK (detraccion_monto >= 0 AND detraccion_monto <= monto),
  detraccion_estado text NOT NULL DEFAULT 'no_aplica' CHECK (detraccion_estado IN ('no_aplica','pendiente','realizado')),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (detraccion_estado <> 'no_aplica' OR detraccion_monto = 0)
);
CREATE TABLE public.externos_abonos (
  id uuid PRIMARY KEY,
  viaje_id uuid NOT NULL REFERENCES public.externos_viajes(id),
  fecha date NOT NULL,
  monto numeric(10,2) NOT NULL CHECK (monto > 0),
  nota text NOT NULL DEFAULT '' CHECK (length(nota) <= 500),
  anulado boolean NOT NULL DEFAULT false,
  motivo_anulacion text,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  anulado_at timestamptz,
  CHECK (NOT anulado OR (motivo_anulacion IS NOT NULL AND length(trim(motivo_anulacion)) BETWEEN 1 AND 500)),
  UNIQUE (id, viaje_id)
);
CREATE TABLE public.externos_documentos (
  id uuid PRIMARY KEY,
  viaje_id uuid NOT NULL REFERENCES public.externos_viajes(id),
  abono_id uuid,
  nombre text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('guia','factura','detraccion','comprobante','otro')),
  storage_path text NOT NULL UNIQUE,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (abono_id, viaje_id) REFERENCES public.externos_abonos(id, viaje_id)
);
CREATE INDEX ON public.externos_viajes(fecha);
CREATE INDEX ON public.externos_abonos(viaje_id);
CREATE INDEX ON public.externos_documentos(viaje_id);

-- NextAuth is checked by the server. Browser roles never access these tables.
ALTER TABLE public.externos_viajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.externos_abonos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.externos_documentos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.externos_viajes, public.externos_abonos, public.externos_documentos FROM anon, authenticated;
GRANT ALL ON public.externos_viajes, public.externos_abonos, public.externos_documentos TO service_role;

CREATE FUNCTION public.externos_validar_abono() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE total numeric; importe numeric; situacion text;
BEGIN
  SELECT monto, estado INTO importe, situacion FROM externos_viajes WHERE id = NEW.viaje_id FOR UPDATE;
  IF TG_OP = 'UPDATE' AND (NEW.viaje_id <> OLD.viaje_id OR NEW.monto <> OLD.monto OR NEW.fecha <> OLD.fecha OR OLD.anulado) THEN
    RAISE EXCEPTION 'Un abono solo puede anularse; registra otro para corregirlo.';
  END IF;
  IF NOT NEW.anulado THEN
    IF situacion = 'cancelado' THEN RAISE EXCEPTION 'No se puede abonar a un viaje cancelado.'; END IF;
    SELECT coalesce(sum(monto),0) INTO total FROM externos_abonos WHERE viaje_id = NEW.viaje_id AND NOT anulado AND id <> NEW.id;
    IF total + NEW.monto > importe THEN RAISE EXCEPTION 'El abono supera el saldo pendiente.'; END IF;
  ELSE
    NEW.anulado_at := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER externos_abono_validar BEFORE INSERT OR UPDATE ON public.externos_abonos FOR EACH ROW EXECUTE FUNCTION public.externos_validar_abono();
CREATE FUNCTION public.externos_validar_viaje() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE total numeric;
BEGIN
  SELECT coalesce(sum(monto),0) INTO total FROM externos_abonos WHERE viaje_id = NEW.id AND NOT anulado;
  IF NEW.monto < total THEN RAISE EXCEPTION 'El importe no puede ser menor que los abonos.'; END IF;
  IF NEW.estado = 'cancelado' AND total > 0 THEN RAISE EXCEPTION 'Anula los abonos antes de cancelar el viaje.'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER externos_viaje_validar BEFORE UPDATE ON public.externos_viajes FOR EACH ROW EXECUTE FUNCTION public.externos_validar_viaje();

INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES ('externos-documentos', 'externos-documentos', false, 10485760, ARRAY['application/pdf','image/jpeg','image/png']);
-- Restrictive policy also blocks any pre-existing broad storage policies.
CREATE POLICY externos_privados ON storage.objects AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (bucket_id <> 'externos-documentos')
  WITH CHECK (bucket_id <> 'externos-documentos');
COMMIT;
