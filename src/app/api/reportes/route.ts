import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export async function GET(req: NextRequest) {

  const { searchParams } = new URL(req.url);
  const mes = searchParams.get('mes');
  const tipo = searchParams.get('tipo') ?? 'excel'; // 'excel' | 'resumen'

  const supabase = await createAdminClient();
  let query = supabase.from('viajes').select('*').order('fecha_traslado', { ascending: true });
  if (mes) query = query.eq('mes', mes);

  const { data: viajes, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (tipo === 'resumen') {
    const resumen = calcularResumen(viajes ?? []);
    return NextResponse.json(resumen);
  }

  // Generar Excel
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TransMedina';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Viajes', {
    pageSetup: { orientation: 'landscape', fitToPage: true },
  });

  // Estilo de cabecera
  sheet.columns = [
    { header: 'F. Carga', key: 'fecha_carga', width: 12 },
    { header: 'F. Traslado', key: 'fecha_traslado', width: 12 },
    { header: 'Mes', key: 'mes', width: 16 },
    { header: 'Descripción', key: 'descripcion', width: 20 },
    { header: 'N° Guía', key: 'numero_guia', width: 16 },
    { header: 'Estado', key: 'estado', width: 12 },
    { header: 'N° Factura', key: 'numero_factura', width: 14 },
    { header: 'Detracción', key: 'detraccion', width: 14 },
    { header: 'Monto (S/)', key: 'monto', width: 14 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1D4ED8' } };
    cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FFFFFF' } },
    };
  });
  headerRow.height = 24;

  (viajes ?? []).forEach((v, i) => {
    const row = sheet.addRow({
      fecha_carga: v.fecha_carga,
      fecha_traslado: v.fecha_traslado,
      mes: v.mes,
      descripcion: v.descripcion,
      numero_guia: v.numero_guia ?? '',
      estado: v.estado === 'facturado' ? 'Facturado' : 'Pendiente',
      numero_factura: v.numero_factura ?? '',
      detraccion: v.detraccion === 'realizado' ? 'Realizado' : 'Pendiente',
      monto: Number(v.monto),
    });

    if (i % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EFF6FF' } };
      });
    }

    // Colorear detracción pendiente
    const detCell = row.getCell('detraccion');
    if (v.detraccion === 'pendiente') {
      detCell.font = { color: { argb: 'C2410C' }, bold: true };
    }

    const montoCell = row.getCell('monto');
    montoCell.numFmt = '"S/ "#,##0.00';
    montoCell.alignment = { horizontal: 'right' };
  });

  // Fila de totales
  const totalRow = sheet.addRow({
    descripcion: 'TOTAL',
    monto: (viajes ?? []).reduce((s, v) => s + Number(v.monto), 0),
  });
  totalRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } };
  });
  totalRow.getCell('monto').numFmt = '"S/ "#,##0.00';

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = mes
    ? `TransMedina_${mes.replace(' ', '_')}.xlsx`
    : `TransMedina_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
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
