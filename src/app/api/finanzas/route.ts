import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('viajes')
    .select('tipo, estado, detraccion, monto');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];

  const totalFletes = rows
    .filter(v => v.tipo === 'viaje')
    .reduce((s, v) => s + Number(v.monto), 0);

  const depositosRecibidos = rows
    .filter(v => v.tipo === 'deposito')
    .reduce((s, v) => s + Number(v.monto), 0);

  const saldoAnterior = rows
    .filter(v => v.tipo === 'saldo_anterior')
    .reduce((s, v) => s + Number(v.monto), 0);

  const detPendienteRows = rows.filter(
    v => v.tipo === 'viaje' && v.estado === 'facturado' && v.detraccion === 'pendiente'
  );
  const detPendienteMonto = detPendienteRows.reduce((s, v) => s + Number(v.monto), 0);

  const detPagadaMonto = rows
    .filter(v => v.tipo === 'viaje' && v.estado === 'facturado' && v.detraccion === 'realizado')
    .reduce((s, v) => s + Number(v.monto), 0);

  return NextResponse.json({
    total_fletes: totalFletes,
    depositos_recibidos: depositosRecibidos,
    saldo_anterior: saldoAnterior,
    balance_por_cobrar: saldoAnterior + totalFletes - depositosRecibidos,
    detraccion_pendiente_monto: detPendienteMonto,
    detraccion_pendiente_importe: Math.round(detPendienteMonto * 0.04 * 100) / 100,
    detraccion_pagada_monto: detPagadaMonto,
    detraccion_pagada_importe: Math.round(detPagadaMonto * 0.04 * 100) / 100,
    viajes_sin_detraccion: detPendienteRows.length,
  });
}
