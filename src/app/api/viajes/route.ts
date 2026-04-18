import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { ViajeInsert, FiltrosViaje } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabase = await createAdminClient();
  const { searchParams } = new URL(req.url);

  let query = supabase.from('viajes').select('*').order('fecha_traslado', { ascending: false });

  const filtros: FiltrosViaje = {
    mes: searchParams.get('mes') ?? undefined,
    estado: (searchParams.get('estado') as FiltrosViaje['estado']) ?? undefined,
    detraccion: (searchParams.get('detraccion') as FiltrosViaje['detraccion']) ?? undefined,
  };

  if (filtros.mes) query = query.eq('mes', filtros.mes);
  if (filtros.estado) query = query.eq('estado', filtros.estado);
  if (filtros.detraccion) query = query.eq('detraccion', filtros.detraccion);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body: ViajeInsert = await req.json();

  if (body.tipo === 'saldo_anterior') {
    body.fecha_carga = body.fecha_carga || '1900-01-01';
    body.fecha_traslado = body.fecha_traslado || '1900-01-01';
    body.descripcion = 'Saldo anterior';
    body.estado = 'facturado';
    body.detraccion = 'realizado';
  } else if (body.tipo === 'deposito') {
    body.fecha_carga = body.fecha_traslado || '1900-01-01';
    const fecha = new Date((body.fecha_traslado || body.fecha_carga) + 'T12:00:00');
    body.mes = format(fecha, 'MMMM yyyy', { locale: es });
    body.estado = 'facturado';
    body.detraccion = 'realizado';
    body.numero_guia = null;
    body.numero_factura = null;
    body.drive_id_guia = null;
    body.drive_id_factura = null;
  } else {
    const fecha = new Date(body.fecha_traslado + 'T12:00:00');
    body.mes = format(fecha, 'MMMM yyyy', { locale: es });
  }

  const supabase = await createAdminClient();
  const { data, error } = await supabase.from('viajes').insert(body).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
