import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
  }

  const supabase = await createAdminClient();

  // Validate token
  const { data: tokenData, error: tokenError } = await supabase
    .from('reporte_tokens')
    .select('*')
    .eq('token', token)
    .eq('activo', true)
    .single();

  if (tokenError || !tokenData) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 404 });
  }

  if (tokenData.expira_en && new Date(tokenData.expira_en) < new Date()) {
    return NextResponse.json({ error: 'Token expirado' }, { status: 410 });
  }

  // Fetch viajes applying date filters if set
  let query = supabase.from('viajes').select('*').order('fecha_traslado', { ascending: true });

  if (tokenData.fecha_inicio) {
    query = query.gte('fecha_traslado', tokenData.fecha_inicio);
  }
  if (tokenData.fecha_fin) {
    query = query.lte('fecha_traslado', tokenData.fecha_fin);
  }

  const { data: viajes, error: viajesError } = await query;
  if (viajesError) {
    return NextResponse.json({ error: viajesError.message }, { status: 500 });
  }

  return NextResponse.json({
    cliente_nombre: tokenData.cliente_nombre,
    fecha_inicio: tokenData.fecha_inicio,
    fecha_fin: tokenData.fecha_fin,
    viajes: viajes ?? [],
  });
}
