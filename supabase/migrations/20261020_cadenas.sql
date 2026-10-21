-- FART sigue siendo la contraparte de cobro; cadena identifica la carga.
-- El historial existente corresponde a Ripley, según la operación anterior.
BEGIN;
ALTER TABLE public.viajes ADD COLUMN IF NOT EXISTS cadena TEXT DEFAULT 'ripley';
-- Los nuevos registros deben elegir cadena; null permite abonos/saldos generales.
ALTER TABLE public.viajes ALTER COLUMN cadena DROP DEFAULT;
ALTER TABLE public.viajes ADD CONSTRAINT viajes_cadena_valida
  CHECK (cadena IS NULL OR cadena IN ('ripley', 'oechsle'));
ALTER TABLE public.viajes ADD CONSTRAINT viajes_carga_con_cadena
  CHECK (tipo <> 'viaje' OR cadena IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_viajes_cadena ON public.viajes(cadena);
COMMIT;
