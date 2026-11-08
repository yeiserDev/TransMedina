// Read-only deployment check. Never prints credentials or customer records.
require('@next/env').loadEnvConfig(process.cwd());
const { createClient } = require('@supabase/supabase-js');
async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  for (const table of ['viajes', 'externos_viajes', 'externos_abonos', 'externos_documentos']) {
    const { error, status } = await db.from(table).select('id').limit(1);
    console.log(`${table}: ${error ? `unavailable (${error.code})` : `OK (HTTP ${status})`}`);
  }
  const { data, error } = await db.storage.getBucket('externos-documentos');
  console.log(`Private documents bucket: ${error ? 'unavailable' : data.public ? 'ERROR: public' : 'OK: private'}`);
  const { error: igvError } = await db.from('externos_viajes').select('igv_modalidad').limit(1);
  console.log(`IGV column: ${igvError ? `unavailable (${igvError.code})` : 'OK (column accessible; SQL functions not checked)'}`);
  const { error: rucError } = await db.from('externos_viajes').select('cliente_ruc').limit(1);
  console.log(`RUC column: ${rucError ? `unavailable (${rucError.code})` : 'OK'}`);
}
main().catch(() => { console.error('Cannot connect to configured Supabase.'); process.exitCode = 1; });
