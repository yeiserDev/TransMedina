-- Agregar columna para el comprobante / constancia de detracción de Google Drive
BEGIN;
ALTER TABLE public.viajes ADD COLUMN IF NOT EXISTS drive_id_detraccion VARCHAR(255);
COMMIT;
