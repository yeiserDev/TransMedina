BEGIN;

-- Existing balances are preserved until the administrator classifies each trip.
ALTER TABLE public.externos_viajes
  ADD COLUMN IF NOT EXISTS igv_modalidad text NOT NULL DEFAULT 'total'
  CHECK (igv_modalidad IN ('total', 'incluido', 'adicional'));

COMMENT ON COLUMN public.externos_viajes.igv_modalidad IS
  'total: legacy full-fare balance; incluido: fare paid, no additional amount; adicional: fare paid, only 18% IGV collectible';

CREATE OR REPLACE FUNCTION public.externos_validar_abono() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE total numeric; importe numeric; situacion text;
BEGIN
  SELECT CASE igv_modalidad
    WHEN 'incluido' THEN 0
    WHEN 'adicional' THEN round(monto * 0.18, 2)
    ELSE monto END, estado
  INTO importe, situacion FROM externos_viajes WHERE id = NEW.viaje_id FOR UPDATE;
  IF TG_OP = 'UPDATE' AND (NEW.viaje_id <> OLD.viaje_id OR NEW.monto <> OLD.monto OR NEW.fecha <> OLD.fecha OR OLD.anulado) THEN
    RAISE EXCEPTION 'Un abono solo puede anularse; registra otro para corregirlo.';
  END IF;
  IF NOT NEW.anulado THEN
    IF situacion = 'cancelado' THEN RAISE EXCEPTION 'No se puede abonar a un viaje cancelado.'; END IF;
    SELECT coalesce(sum(monto),0) INTO total FROM externos_abonos
      WHERE viaje_id = NEW.viaje_id AND NOT anulado AND id <> NEW.id;
    IF total + NEW.monto > importe THEN RAISE EXCEPTION 'El abono supera el saldo pendiente.'; END IF;
  ELSE
    NEW.anulado_at := now();
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.externos_validar_viaje() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE total numeric; importe numeric;
BEGIN
  SELECT coalesce(sum(monto),0) INTO total FROM externos_abonos WHERE viaje_id = NEW.id AND NOT anulado;
  IF NEW.igv_modalidad <> OLD.igv_modalidad AND total > 0 THEN
    RAISE EXCEPTION 'Este viaje tiene abonos vigentes. Anúlalos con un motivo antes de cambiar la modalidad; luego registra solo los cobros que correspondan.';
  END IF;
  importe := CASE NEW.igv_modalidad
    WHEN 'incluido' THEN 0
    WHEN 'adicional' THEN round(NEW.monto * 0.18, 2)
    ELSE NEW.monto END;
  IF importe < total THEN RAISE EXCEPTION 'El importe por cobrar no puede ser menor que los abonos vigentes.'; END IF;
  IF NEW.estado = 'cancelado' AND total > 0 THEN RAISE EXCEPTION 'Anula los abonos antes de cancelar el viaje.'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;
