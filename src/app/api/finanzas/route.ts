import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

function esPucallpa(descripcion: string): boolean {
  return descripcion?.toLowerCase().includes('pucallpa') ?? false;
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('viajes')
    .select('tipo, estado, detraccion, monto, descripcion');

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

  // Pendientes: cualquier viaje con detraccion pendiente (facturado o no)
  const pendientes = rows.filter(
    v => v.tipo === 'viaje' && v.detraccion === 'pendiente'
  );
  const pendientesHyo = pendientes.filter(v => !esPucallpa(v.descripcion ?? ''));
  const pendientesPuc = pendientes.filter(v =>  esPucallpa(v.descripcion ?? ''));
  const detPendienteImporte = pendientesHyo.length * 40 + pendientesPuc.length * 80;

  // Pagadas: cualquier viaje con detraccion realizado
  const pagadas = rows.filter(
    v => v.tipo === 'viaje' && v.detraccion === 'realizado'
  );
  const pagadasHyo = pagadas.filter(v => !esPucallpa(v.descripcion ?? ''));
  const pagadasPuc = pagadas.filter(v =>  esPucallpa(v.descripcion ?? ''));
  const detPagadaImporte = pagadasHyo.length * 40 + pagadasPuc.length * 80;

  return NextResponse.json({
    total_fletes: totalFletes,
    depositos_recibidos: depositosRecibidos,
    saldo_anterior: saldoAnterior,
    balance_por_cobrar: saldoAnterior + totalFletes - depositosRecibidos,
    // Detracción pendiente
    detraccion_pendiente_importe: detPendienteImporte,
    viajes_hyo_sin_det: pendientesHyo.length,
    viajes_puc_sin_det: pendientesPuc.length,
    viajes_sin_detraccion: pendientes.length,
    // Detracción pagada
    detraccion_pagada_importe: detPagadaImporte,
  });
}
