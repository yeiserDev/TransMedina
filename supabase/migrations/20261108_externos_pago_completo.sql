BEGIN;
ALTER TABLE public.externos_viajes
  ADD COLUMN IF NOT EXISTS pago_completo boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.externos_viajes.pago_completo IS
  'Admin confirmation of full payment. Closes outstanding balance without creating or modifying payment entries.';

CREATE OR REPLACE FUNCTION public.externos_validar_abono() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE total numeric; importe numeric; situacion text; completo boolean;
BEGIN
  SELECT CASE igv_modalidad
    WHEN 'incluido' THEN 0
    WHEN 'adicional' THEN round(monto * 0.18, 2)
    ELSE monto END, estado, pago_completo
  INTO importe, situacion, completo FROM externos_viajes WHERE id = NEW.viaje_id FOR UPDATE;
  IF TG_OP = 'UPDATE' AND (NEW.viaje_id <> OLD.viaje_id OR NEW.monto <> OLD.monto OR NEW.fecha <> OLD.fecha OR OLD.anulado) THEN
    RAISE EXCEPTION 'Un abono solo puede anularse; registra otro para corregirlo.';
  END IF;
  IF NOT NEW.anulado THEN
    IF completo THEN RAISE EXCEPTION 'Este viaje ya está marcado como pagado completo.'; END IF;
    IF situacion = 'cancelado' THEN RAISE EXCEPTION 'No se puede abonar a un viaje cancelado.'; END IF;
    SELECT coalesce(sum(monto),0) INTO total FROM externos_abonos
      WHERE viaje_id = NEW.viaje_id AND NOT anulado AND id <> NEW.id;
    IF total + NEW.monto > importe THEN RAISE EXCEPTION 'El abono supera el saldo pendiente.'; END IF;
  ELSE
    NEW.anulado_at := now();
  END IF;
  RETURN NEW;
END $$;


NOTIFY pgrst, 'reload schema';
COMMIT;
