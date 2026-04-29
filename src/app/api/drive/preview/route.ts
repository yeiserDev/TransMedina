import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { getAdminAccessToken } from '@/lib/admin-drive';

export async function GET(req: NextRequest) {
  const fileId = req.nextUrl.searchParams.get('fileId');
  if (!fileId) return new NextResponse('Missing fileId', { status: 400 });

  // Admin: usar el token OAuth de su sesión activa
  const session = await auth();
  if (session?.accessToken) {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
      { headers: { Authorization: `Bearer ${session.accessToken}` } }
    );
    if (res.ok) {
      const ct = res.headers.get('content-type') ?? 'application/octet-stream';
      return new NextResponse(res.body, {
        headers: {
          'Content-Type': ct,
          'Content-Disposition': 'inline',
          'Cache-Control': 'private, max-age=300',
        },
      });
    }
  }

  // Secretaria con token: validar antes de servir
  const secretToken = req.nextUrl.searchParams.get('t');
  if (secretToken) {
    const supabase = await createAdminClient();
    const { data } = await supabase
      .from('reporte_tokens')
      .select('activo, expira_en')
      .eq('token', secretToken)
      .eq('activo', true)
      .single();

    if (!data) return new NextResponse('Unauthorized', { status: 401 });
    if (data.expira_en && new Date(data.expira_en) < new Date()) {
      return new NextResponse('Token expired', { status: 401 });
    }
  }

  // Visitante público o secretaria válida: usar token del admin almacenado en Supabase
  const adminToken = await getAdminAccessToken();
  if (adminToken) {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    if (res.ok) {
      const ct = res.headers.get('content-type') ?? 'application/octet-stream';
      return new NextResponse(res.body, {
        headers: {
          'Content-Type': ct,
          'Content-Disposition': 'inline',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }
  }

  return new NextResponse('File not accessible', { status: 403 });
}
