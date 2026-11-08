import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';
import { createAdminClient } from '@/lib/externos-server';
import { validDate, validId, validMoney } from '@/lib/externos';
import { esRuc } from '@/lib/ruc';

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
export async function GET() {
  if (!isAdminEmail((await auth())?.user?.email)) return reply({ error: 'No autorizado' }, 401);
  const db = await createAdminClient();
  const { data, error } = await db.from('externos_viajes').select('*, externos_abonos(*), externos_documentos(id,viaje_id,nombre,tipo,abono_id)').order('fecha', { ascending: false });
  if (error) return reply({ error: 'No se pudieron cargar los viajes externos. Comprueba que su migración esté aplicada.' }, 503);
  return reply(data);
}
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) return reply({ error: 'No autorizado' }, 401);
  if (req.headers.get('origin') && req.headers.get('origin') !== req.nextUrl.origin) return reply({ error: 'Origen no permitido' }, 403);
  let b;
  try { b = await req.json(); } catch { return reply({ error: 'Solicitud inválida' }, 400); }
  if (!b || typeof b !== 'object') return reply({ error: 'Solicitud inválida' }, 400);
  const db = await createAdminClient();
  if (b.action === 'viaje') {
    if (b.pago_completo !== undefined && typeof b.pago_completo !== 'boolean') return reply({ error: 'Selecciona el estado del cobro.' }, 400);
    if (b.cliente_ruc != null && b.cliente_ruc !== '' && !esRuc(b.cliente_ruc)) return reply({ error: 'El RUC debe tener 11 dígitos.' }, 400);
    if (!['total', 'incluido', 'adicional'].includes(b.igv_modalidad)) return reply({ error: 'Selecciona IGV incluido o + IGV.' }, 400);
    if ((b.id && !validId(b.id)) || typeof b.cliente !== 'string' || !b.cliente.trim() || b.cliente.length > 160 || typeof b.ruta !== 'string' || !b.ruta.trim() || b.ruta.length > 250 || !validDate(b.fecha) || !validMoney(b.monto) || b.monto <= 0 || !['programado','realizado','cancelado'].includes(b.estado) || typeof b.notas !== 'string' || b.notas.length > 2000 || !validMoney(b.detraccion_monto) || b.detraccion_monto > b.monto || !['no_aplica','pendiente','realizado'].includes(b.detraccion_estado) || (b.detraccion_estado === 'no_aplica' && b.detraccion_monto !== 0)) return reply({ error: 'Revisa cliente, ruta, fecha e importes del viaje.' }, 400);
    const row = { ...(b.pago_completo !== undefined ? { pago_completo: b.pago_completo } : {}), cliente: b.cliente.trim(), ...(b.cliente_ruc !== undefined ? { cliente_ruc: b.cliente_ruc || null } : {}), ruta: b.ruta.trim(), fecha: b.fecha, monto: b.monto, igv_modalidad: b.igv_modalidad, estado: b.estado, notas: b.notas, detraccion_monto: b.detraccion_monto, detraccion_estado: b.detraccion_estado };
    const { error } = b.id ? await db.from('externos_viajes').update(row).eq('id', b.id).select('id').single() : await db.from('externos_viajes').insert({ ...row, created_by: session!.user!.email });
    if (error?.code === 'PGRST204') return reply({ error: error.message.includes('pago_completo') ? 'Falta aplicar la migración 20261108_externos_pago_completo.sql en Supabase.' : error.message.includes('cliente_ruc') ? 'Falta aplicar la migración 20261106_externos_ruc.sql en Supabase.' : 'Falta aplicar la migración 20261106_externos_igv.sql en Supabase.' }, 503);
    return error ? reply({ error: error.code === 'P0001' ? error.message : 'No se pudo guardar el viaje.' }, 400) : reply({ ok: true });
  }
  if (b.action === 'abono') {
    if (!validId(b.id) || !validId(b.viaje_id) || !validDate(b.fecha) || !validMoney(b.monto) || b.monto <= 0 || typeof b.nota !== 'string' || b.nota.length > 500) return reply({ error: 'Revisa la fecha y el importe del abono.' }, 400);
    const { error } = await db.from('externos_abonos').insert({ id: b.id, viaje_id: b.viaje_id, fecha: b.fecha, monto: b.monto, nota: b.nota, created_by: session!.user!.email });
    if (error?.code === '23505') return reply({ ok: true }); // retry of the same submission
    return error ? reply({ error: error.code === 'P0001' ? error.message : 'No se pudo registrar el abono.' }, 400) : reply({ ok: true });
  }
  if (b.action === 'anular') {
    if (!validId(b.id) || typeof b.motivo !== 'string' || !b.motivo.trim() || b.motivo.length > 500) return reply({ error: 'Indica el motivo de la anulación.' }, 400);
    const { error } = await db.from('externos_abonos').update({ anulado: true, motivo_anulacion: b.motivo.trim() }).eq('id', b.id).eq('anulado', false).select('id').single();
    return error ? reply({ error: 'No se pudo anular el abono. Actualiza e inténtalo de nuevo.' }, 400) : reply({ ok: true });
  }
  return reply({ error: 'Operación no válida' }, 400);
}
