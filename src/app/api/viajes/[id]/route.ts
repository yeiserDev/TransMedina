import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { ViajeUpdate } from '@/types';
import { esCadena } from '@/lib/cadenas';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body: ViajeUpdate = await req.json();
  if ('cadena' in body && body.cadena !== null && !esCadena(body.cadena)) {
    return NextResponse.json({ error: 'Cadena no válida.' }, { status: 400 });
  }
  if (body.tipo === 'viaje' && body.cadena === null) {
    return NextResponse.json({ error: 'El viaje debe tener una cadena de carga.' }, { status: 400 });
  }

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('viajes')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error?.code === 'PGRST204' && error.message.includes('cadena')) {
    return NextResponse.json({ error: 'Falta aplicar la migración de cadenas en Supabase antes de guardar.' }, { status: 503 });
  }
  if (error?.code === '23514') return NextResponse.json({ error: 'El viaje debe tener una cadena de carga válida.' }, { status: 400 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const supabase = await createAdminClient();
  const { error } = await supabase.from('viajes').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
