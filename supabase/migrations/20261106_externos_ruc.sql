BEGIN;
ALTER TABLE public.externos_viajes
  ADD COLUMN IF NOT EXISTS cliente_ruc text
  CHECK (cliente_ruc IS NULL OR cliente_ruc ~ '^[0-9]{11}$');
-- Preserve the existing client text. Names are only replaced after review/save.
UPDATE public.externos_viajes SET cliente_ruc = cliente
  WHERE cliente_ruc IS NULL AND cliente ~ '^[0-9]{11}$';
CREATE INDEX IF NOT EXISTS externos_viajes_cliente_ruc_idx ON public.externos_viajes(cliente_ruc);
NOTIFY pgrst, 'reload schema';
COMMIT;
