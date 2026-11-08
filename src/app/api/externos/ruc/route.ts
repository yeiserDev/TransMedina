import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';
import { consultarRuc, ConsultaRucError, esRuc } from '@/lib/ruc';

const cache = new Map<string, { nombre: string; expires: number }>();
let windowStart = 0;
let requests = 0;
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });

export async function GET(req: NextRequest) {
  if (!isAdminEmail((await auth())?.user?.email)) return reply({ error: 'No autorizado' }, 401);
  const ruc = req.nextUrl.searchParams.get('numero');
  if (!esRuc(ruc)) return reply({ error: 'El RUC debe tener 11 dígitos.' }, 400);
  const now = Date.now();
  const cached = cache.get(ruc);
  if (cached && cached.expires > now) return reply({ ruc, razon_social: cached.nombre });
  if (now - windowStart >= 60_000) { windowStart = now; requests = 0; }
  if (requests >= 20) return reply({ error: 'Espera un minuto antes de realizar más consultas.' }, 429);
  requests++;
  try {
    const data = await consultarRuc(ruc, process.env.DECOLECTA_API_TOKEN);
    for (const [key, value] of cache) if (value.expires <= now) cache.delete(key);
    if (cache.size >= 500) cache.clear();
    cache.set(ruc, { nombre: data.razon_social, expires: now + 6 * 60 * 60 * 1000 });
    return reply(data);
  } catch (error) {
    return reply({ error: error instanceof ConsultaRucError ? error.message : 'No se pudo consultar el RUC.' }, error instanceof ConsultaRucError ? error.status : 502);
  }
}
