import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin';
import { createAdminClient } from '@/lib/externos-server';
import { validId } from '@/lib/externos';

const bucket = 'externos-documentos';
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
export async function GET(req: NextRequest) {
  if (!isAdminEmail((await auth())?.user?.email)) return fail('No autorizado', 401);
  const id = req.nextUrl.searchParams.get('id');
  if (!validId(id)) return fail('Documento no válido');
  const db = await createAdminClient();
  const { data } = await db.from('externos_documentos').select('storage_path,nombre').eq('id', id).single();
  if (!data) return fail('Documento no encontrado', 404);
  const { data: file, error } = await db.storage.from(bucket).download(data.storage_path);
  if (error || !file) return fail('No se pudo abrir el archivo', 502);
  return new NextResponse(file, { headers: { 'Content-Type': file.type, 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(data.nombre)}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) return fail('No autorizado', 401);
  if (req.headers.get('origin') && req.headers.get('origin') !== req.nextUrl.origin) return fail('Origen no permitido', 403);
  const form = await req.formData();
  const file = form.get('file');
  const viajeId = form.get('viaje_id');
  const abonoId = form.get('abono_id');
  const tipo = String(form.get('tipo'));
  if (!(file instanceof File) || !validId(viajeId) || !['guia','factura','detraccion','comprobante','otro'].includes(tipo) || file.size === 0 || file.size > 10485760 || !['application/pdf','image/png','image/jpeg'].includes(file.type) || (abonoId && !validId(abonoId))) return fail('Adjunta un PDF, JPG o PNG de hasta 10 MB.');
  const db = await createAdminClient();
  const { data: viaje } = await db.from('externos_viajes').select('id').eq('id', viajeId).single();
  if (!viaje) return fail('Viaje no encontrado', 404);
  if (abonoId) {
    const { data } = await db.from('externos_abonos').select('id').eq('id', abonoId).eq('viaje_id', viajeId).single();
    if (!data) return fail('El abono no pertenece al viaje.');
  }
  const id = crypto.randomUUID();
  const path = `${viajeId}/${id}`;
  const { error: uploadError } = await db.storage.from(bucket).upload(path, file, { contentType: file.type });
  if (uploadError) return fail('No se pudo subir el documento. Inténtalo de nuevo.', 502);
  const { error } = await db.from('externos_documentos').insert({ id, viaje_id: viajeId, abono_id: abonoId || null, nombre: file.name.slice(0, 250), tipo, storage_path: path, created_by: session!.user!.email });
  if (error) {
    await db.storage.from(bucket).remove([path]);
    return fail('No se pudo vincular el documento. Inténtalo de nuevo.', 500);
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
