import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { generarExcelViajes } from '@/lib/excel-export';
import { FiltrosViaje, Viaje } from '@/types';
import { format } from 'date-fns';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mes = searchParams.get('mes');
  const tipo = searchParams.get('tipo') ?? 'excel'; // 'excel' | 'resumen'
  const estado = searchParams.get('estado') as FiltrosViaje['estado'];
  const detraccion = searchParams.get('detraccion') as FiltrosViaje['detraccion'];
  const fechaDesde = searchParams.get('fecha_desde');
  const fechaHasta = searchParams.get('fecha_hasta');

  const supabase = await createAdminClient();
  let query = supabase.from('viajes').select('*').order('fecha_traslado', { ascending: true });

  if (mes) query = query.eq('mes', mes);
  if (estado) query = query.eq('estado', estado);
  if (detraccion) query = query.eq('detraccion', detraccion);
  if (fechaDesde) query = query.gte('fecha_traslado', fechaDesde);
  if (fechaHasta) query = query.lte('fecha_traslado', fechaHasta);

  const { data: viajes, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (tipo === 'resumen') {
    const resumen = calcularResumen(viajes ?? []);
    return NextResponse.json(resumen);
  }

  const baseUrl = req.headers.get('origin') ?? process.env.NEXTAUTH_URL ?? '';
  const buffer = await generarExcelViajes({
    viajes: (viajes ?? []) as Viaje[],
    filtros: {
      mes: mes ?? undefined,
      estado: estado ?? undefined,
      detraccion: detraccion ?? undefined,
      fecha_desde: fechaDesde ?? undefined,
      fecha_hasta: fechaHasta ?? undefined,
    },
    baseUrl,
  });

  const filename = generarNombreArchivo({
    mes: mes ?? undefined,
    fecha_desde: fechaDesde ?? undefined,
    fecha_hasta: fechaHasta ?? undefined,
  });

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const viajes: Viaje[] = body.viajes ?? [];
    const filtros: FiltrosViaje = body.filtros ?? {};

    const baseUrl = req.headers.get('origin') ?? process.env.NEXTAUTH_URL ?? '';
    const buffer = await generarExcelViajes({
      viajes,
      filtros,
      baseUrl,
    });

    const filename = generarNombreArchivo(filtros);

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al generar Excel';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function generarNombreArchivo(filtros: FiltrosViaje = {}): string {
  if (filtros.fecha_desde && filtros.fecha_hasta) {
    return `TransMedina_${filtros.fecha_desde}_al_${filtros.fecha_hasta}.xlsx`;
  }
  if (filtros.fecha_desde) {
    return `TransMedina_desde_${filtros.fecha_desde}.xlsx`;
  }
  if (filtros.fecha_hasta) {
    return `TransMedina_hasta_${filtros.fecha_hasta}.xlsx`;
  }
  if (filtros.mes) {
    return `TransMedina_${filtros.mes.replace(/\s+/g, '_')}.xlsx`;
  }
  return `TransMedina_Viajes_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
}

function calcularResumen(viajes: Record<string, unknown>[]) {
  const porMes: Record<string, { mes: string; total: number; monto: number; facturados: number; det_pendientes: number }> = {};

  for (const v of viajes) {
    const mes = v.mes as string;
    if (!porMes[mes]) {
      porMes[mes] = { mes, total: 0, monto: 0, facturados: 0, det_pendientes: 0 };
    }
    porMes[mes].total++;
    porMes[mes].monto += Number(v.monto);
    if (v.estado === 'facturado') porMes[mes].facturados++;
    if (v.detraccion === 'pendiente') porMes[mes].det_pendientes++;
  }

  return Object.values(porMes);
}
