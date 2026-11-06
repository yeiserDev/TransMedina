import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAdminAccessToken } from '@/lib/admin-drive';

export async function GET() {
  const session = await auth();
  if (session?.user?.email !== 'yeiseravilamedina48@gmail.com') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  try {
    const token = await getAdminAccessToken() || session.accessToken;
    if (!token) return NextResponse.json({ error: 'Vuelve a iniciar sesión con Google.' }, { status: 401 });
    const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Consulta no disponible');
    const { storageQuota } = await response.json();
    const used = Number(storageQuota?.usage);
    const limit = storageQuota?.limit == null ? null : Number(storageQuota.limit);
    if (!Number.isFinite(used) || used < 0 || (limit !== null && (!Number.isFinite(limit) || limit < 0))) {
      throw new Error('Cuota no disponible');
    }
    return NextResponse.json({ used, limit }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'No se pudo consultar Google Drive.' }, { status: 502 });
  }
}
