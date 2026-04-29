import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('reporte_tokens')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();
  const { cliente_nombre, fecha_inicio, fecha_fin, expira_en } = body;

  if (!cliente_nombre?.trim()) {
    return NextResponse.json({ error: 'cliente_nombre es requerido' }, { status: 400 });
  }

  const token = randomBytes(20).toString('hex');

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('reporte_tokens')
    .insert({
      token,
      cliente_nombre: cliente_nombre.trim(),
      fecha_inicio: fecha_inicio || null,
      fecha_fin: fecha_fin || null,
      activo: true,
      expira_en: expira_en ? new Date(expira_en + 'T23:59:59').toISOString() : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const baseUrl = req.headers.get('origin') ?? process.env.NEXTAUTH_URL ?? '';
  const url = `${baseUrl}/reporte-cliente?token=${token}`;

  return NextResponse.json({ ...data, url }, { status: 201 });
}
