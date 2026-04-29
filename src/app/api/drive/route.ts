import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadFileToDrive } from '@/lib/drive';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Sesión expirada — vuelve a iniciar sesión' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File;
  const viajeId = formData.get('viajeId') as string;
  const tipo = formData.get('tipo') as 'guias' | 'facturas';

  if (!file || !viajeId || !tipo) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
  }

  if (!process.env.GOOGLE_DRIVE_FOLDER_ID) {
    return NextResponse.json({ error: 'GOOGLE_DRIVE_FOLDER_ID no configurado' }, { status: 500 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const driveId = await uploadFileToDrive(
      session.accessToken,
      buffer,
      file.name,
      file.type,
      tipo
    );

    const supabase = await createAdminClient();
    const campo = tipo === 'guias' ? 'drive_id_guia' : 'drive_id_factura';
    const { error: dbError } = await supabase
      .from('viajes')
      .update({ [campo]: driveId })
      .eq('id', viajeId);

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

    return NextResponse.json({ driveId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[drive upload]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
