import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadFileToDrive } from '@/lib/drive';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File;
  const viajeId = formData.get('viajeId') as string;
  const tipo = formData.get('tipo') as 'guias' | 'facturas';

  if (!file || !viajeId || !tipo) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const driveId = await uploadFileToDrive(
    session.accessToken,
    buffer,
    file.name,
    file.type,
    tipo
  );

  // Actualizar el viaje con el ID del archivo en Drive
  const supabase = await createAdminClient();
  const campo = tipo === 'guias' ? 'drive_id_guia' : 'drive_id_factura';
  const { error } = await supabase.from('viajes').update({ [campo]: driveId }).eq('id', viajeId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ driveId });
}
