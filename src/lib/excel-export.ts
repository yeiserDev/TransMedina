import ExcelJS from 'exceljs';
import { Viaje, FiltrosViaje } from '@/types';
import { formatDoc } from '@/lib/documentos';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function esPucallpa(descripcion?: string | null): boolean {
  return descripcion?.toLowerCase().includes('pucallpa') ?? false;
}

function montoDetraccion(descripcion?: string | null): number {
  return esPucallpa(descripcion) ? 80 : 40;
}

function fmtDate(d?: string | null): string {
  if (!d || d.startsWith('1900')) return '—';
  try {
    const parsed = new Date(d + 'T12:00:00');
    if (Number.isNaN(parsed.getTime())) return d;
    return format(parsed, 'dd/MM/yyyy');
  } catch {
    return d ?? '—';
  }
}

export async function generarExcelViajes({
  viajes,
  filtros = {},
  baseUrl = '',
}: {
  viajes: Viaje[];
  filtros?: FiltrosViaje;
  baseUrl?: string;
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TransMedina';
  workbook.lastModifiedBy = 'TransMedina ERP';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet('Viajes y Fletes', {
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9, // A4
      margins: {
        left: 0.4,
        right: 0.4,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2,
      },
    },
    views: [{ state: 'frozen', ySplit: 7 }],
  });

  // ─── Paleta de colores Mastercard / TransMedina ─────────────────────
  const C_INK = '141413';           // Negro tinta
  const C_CANVAS = 'F3F0EE';        // Putty cream
  const C_CANVAS_LIFTED = 'FAF8F6'; // Cream claro para cebra
  const C_WHITE = 'FFFFFF';
  const C_SIGNAL = 'CF4500';        // Naranja óxido (detracciones pend.)
  const C_SIGNAL_BG = 'FFF5F0';
  const C_GREEN_DARK = '166534';    // Verde texto
  const C_GREEN_BG = 'EAF8EF';      // Verde fondo depósitos
  const C_AMBER_DARK = '92400E';    // Ámbar texto facturas pend.
  const C_AMBER_BG = 'FEF9E6';
  const C_BORDER = 'E2DED9';        // Borde fino cálido
  const C_SLATE = '696969';

  const borderThin: Partial<ExcelJS.Border> = {
    style: 'thin',
    color: { argb: C_BORDER },
  };

  const borderAll: Partial<ExcelJS.Borders> = {
    top: borderThin,
    bottom: borderThin,
    left: borderThin,
    right: borderThin,
  };

  // ─── Definición de Columnas ──────────────────────────────────────────
  sheet.columns = [
    { key: 'fecha_carga', width: 13 },      // A: F. Carga
    { key: 'fecha_traslado', width: 14 },   // B: F. Traslado
    { key: 'mes', width: 16 },              // C: Mes
    { key: 'tipo', width: 14 },             // D: Tipo
    { key: 'descripcion', width: 34 },      // E: Descripción
    { key: 'numero_guia', width: 17 },      // F: N° Guía
    { key: 'estado_factura', width: 16 },   // G: Estado Factura
    { key: 'numero_factura', width: 17 },   // H: N° Factura
    { key: 'detraccion', width: 22 },       // I: Detracción (4%)
    { key: 'monto', width: 16 },            // J: Monto (S/)
    { key: 'saldo', width: 16 },            // K: Saldo Acum. (S/)
    { key: 'docs', width: 20 },             // L: Comprobantes
  ];

  // ─── Fila 1-2: Banner Corporativo ───────────────────────────────────
  const row1 = sheet.getRow(1);
  row1.height = 24;
  sheet.mergeCells('A1:E1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'TRANSMEDINA  •  CONTROL DE VIAJES Y FLETES';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: C_INK } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

  sheet.mergeCells('F1:L1');
  const dateCell = sheet.getCell('F1');
  dateCell.value = `Exportado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`;
  dateCell.font = { name: 'Arial', size: 9.5, color: { argb: C_SLATE } };
  dateCell.alignment = { vertical: 'middle', horizontal: 'right' };

  // Subtítulo con filtros
  const row2 = sheet.getRow(2);
  row2.height = 18;
  sheet.mergeCells('A2:L2');
  const filterDescCell = sheet.getCell('A2');

  const partesFiltro: string[] = [];
  if (filtros.fecha_desde && filtros.fecha_hasta) {
    partesFiltro.push(`Rango: ${fmtDate(filtros.fecha_desde)} al ${fmtDate(filtros.fecha_hasta)}`);
  } else if (filtros.fecha_desde) {
    partesFiltro.push(`Desde: ${fmtDate(filtros.fecha_desde)}`);
  } else if (filtros.fecha_hasta) {
    partesFiltro.push(`Hasta: ${fmtDate(filtros.fecha_hasta)}`);
  }
  if (filtros.mes) partesFiltro.push(`Mes: ${filtros.mes}`);
  if (filtros.estado) partesFiltro.push(`Factura: ${filtros.estado === 'facturado' ? 'Facturados' : 'Sin facturar'}`);
  if (filtros.detraccion) partesFiltro.push(`Detracción: ${filtros.detraccion === 'realizado' ? 'Realizadas' : 'Pendientes'}`);

  filterDescCell.value = partesFiltro.length > 0
    ? `Filtros aplicados: ${partesFiltro.join('  |  ')}`
    : 'Mostrando todos los registros del sistema';
  filterDescCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: C_SLATE } };
  filterDescCell.alignment = { vertical: 'middle', horizontal: 'left' };

  // ─── Filas 4-5: Tarjetas KPI de Resumen ───────────────────────────────
  const viajeRows = viajes.filter(v => v.tipo === 'viaje');
  const depositoRows = viajes.filter(v => v.tipo === 'deposito');
  const saldoRows = viajes.filter(v => v.tipo === 'saldo_anterior');

  const totalFletes = viajeRows.reduce((s, v) => s + Number(v.monto || 0), 0);
  const totalDepositos = depositoRows.reduce((s, v) => s + Number(v.monto || 0), 0);
  const totalSaldoAnt = saldoRows.reduce((s, v) => s + Number(v.monto || 0), 0);
  const balancePorCobrar = totalSaldoAnt + totalFletes - totalDepositos;

  const detPendientesList = viajeRows.filter(v => v.detraccion === 'pendiente');
  const importeDetPendiente = detPendientesList.reduce((s, v) => s + montoDetraccion(v.descripcion), 0);

  const factPendientes = viajeRows.filter(v => v.estado === 'pendiente').length;

  const row4 = sheet.getRow(4);
  const row5 = sheet.getRow(5);
  row4.height = 14;
  row5.height = 20;

  interface KpiDef {
    colStart: number;
    colEnd: number;
    titulo: string;
    valor: string | number;
    isMoney?: boolean;
    color: string;
    bg: string;
  }

  const kpis: KpiDef[] = [
    { colStart: 1, colEnd: 2, titulo: 'REGISTROS', valor: viajes.length, color: C_INK, bg: C_CANVAS },
    { colStart: 3, colEnd: 4, titulo: 'TOTAL FLETES', valor: totalFletes, isMoney: true, color: C_INK, bg: C_CANVAS },
    { colStart: 5, colEnd: 6, titulo: 'DEPÓSITOS RECIBIDOS', valor: totalDepositos, isMoney: true, color: C_GREEN_DARK, bg: C_GREEN_BG },
    { colStart: 7, colEnd: 8, titulo: 'SALDO POR COBRAR', valor: balancePorCobrar, isMoney: true, color: balancePorCobrar > 0 ? C_AMBER_DARK : C_GREEN_DARK, bg: balancePorCobrar > 0 ? C_AMBER_BG : C_GREEN_BG },
    { colStart: 9, colEnd: 10, titulo: 'DETRACCIONES PEND.', valor: `${detPendientesList.length} (S/ ${importeDetPendiente.toFixed(2)})`, color: C_SIGNAL, bg: C_SIGNAL_BG },
    { colStart: 11, colEnd: 12, titulo: 'SIN FACTURAR', valor: `${factPendientes} viajes`, color: factPendientes > 0 ? C_AMBER_DARK : C_GREEN_DARK, bg: factPendientes > 0 ? C_AMBER_BG : C_GREEN_BG },
  ];

  for (const kpi of kpis) {
    sheet.mergeCells(4, kpi.colStart, 4, kpi.colEnd);
    sheet.mergeCells(5, kpi.colStart, 5, kpi.colEnd);

    const cTop = sheet.getCell(4, kpi.colStart);
    cTop.value = kpi.titulo;
    cTop.font = { name: 'Arial', size: 7.5, bold: true, color: { argb: C_SLATE } };
    cTop.alignment = { vertical: 'middle', horizontal: 'center' };
    cTop.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kpi.bg } };

    const cVal = sheet.getCell(5, kpi.colStart);
    cVal.value = kpi.valor;
    if (kpi.isMoney) {
      cVal.numFmt = '"S/ "#,##0.00';
    }
    cVal.font = { name: 'Arial', size: 11, bold: true, color: { argb: kpi.color } };
    cVal.alignment = { vertical: 'middle', horizontal: 'center' };
    cVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kpi.bg } };

    // Bordes KPI
    for (let c = kpi.colStart; c <= kpi.colEnd; c++) {
      sheet.getCell(4, c).border = { top: borderThin, left: c === kpi.colStart ? borderThin : undefined, right: c === kpi.colEnd ? borderThin : undefined };
      sheet.getCell(5, c).border = { bottom: borderThin, left: c === kpi.colStart ? borderThin : undefined, right: c === kpi.colEnd ? borderThin : undefined };
    }
  }

  // ─── Fila 7: Cabecera de la Tabla Principal ──────────────────────────
  const headers = [
    'F. CARGA',
    'F. TRASLADO',
    'MES',
    'TIPO',
    'DESCRIPCIÓN / RUTA',
    'N° GUÍA',
    'ESTADO FACTURA',
    'N° FACTURA',
    'DETRACCIÓN (4%)',
    'MONTO (S/)',
    'SALDO ACUM. (S/)',
    'COMPROBANTES',
  ];

  const headerRow = sheet.getRow(7);
  headerRow.height = 26;

  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: C_WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_INK } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: idx === 4 ? 'left' : (idx === 9 || idx === 10 ? 'right' : 'center'),
    };
    cell.border = {
      top: { style: 'medium', color: { argb: C_INK } },
      bottom: { style: 'medium', color: { argb: C_INK } },
      left: { style: 'thin', color: { argb: '333333' } },
      right: { style: 'thin', color: { argb: '333333' } },
    };
  });

  // ─── Ordenamiento cronológico para balance acumulado ─────────────────
  const claveFecha = (f?: string | null) => (!f || f.startsWith('1900') ? '0000-00-00' : f);

  const sorted = [...viajes].sort((a, b) => {
    const da = claveFecha(a.fecha_traslado);
    const db = claveFecha(b.fecha_traslado);
    if (da !== db) return da.localeCompare(db);
    if (a.tipo === 'deposito' && b.tipo !== 'deposito') return 1;
    if (b.tipo === 'deposito' && a.tipo !== 'deposito') return -1;
    return 0;
  });

  // Calcular balance acumulado
  let runningBalance = 0;
  const balancesMap = new Map<string, number>();
  for (const v of sorted) {
    const m = Number(v.monto) || 0;
    if (v.tipo === 'deposito') {
      runningBalance -= m;
    } else {
      runningBalance += m;
    }
    balancesMap.set(v.id, runningBalance);
  }

  // ─── Filas de Datos ──────────────────────────────────────────────────
  sorted.forEach((v, index) => {
    const isDeposito = v.tipo === 'deposito';
    const isSaldo = v.tipo === 'saldo_anterior';
    const isViaje = v.tipo === 'viaje';
    const isZebra = index % 2 === 1;

    let rowBg = isZebra ? C_CANVAS_LIFTED : C_WHITE;
    if (isDeposito) rowBg = C_GREEN_BG;

    const row = sheet.addRow({
      fecha_carga: isDeposito || isSaldo ? '—' : fmtDate(v.fecha_carga),
      fecha_traslado: isSaldo ? '—' : fmtDate(v.fecha_traslado),
      mes: v.mes || '—',
      tipo: isDeposito ? 'DEPÓSITO' : isSaldo ? 'SALDO ANTERIOR' : 'VIAJE',
      descripcion: v.descripcion || '—',
      numero_guia: isViaje ? formatDoc(v.numero_guia) || '—' : '—',
      estado_factura: isViaje ? (v.estado === 'facturado' ? 'Facturado' : 'Pendiente') : '—',
      numero_factura: isViaje ? formatDoc(v.numero_factura) || '—' : '—',
      detraccion: isViaje
        ? (v.detraccion === 'realizado'
            ? `Realizado · S/${montoDetraccion(v.descripcion)}`
            : `Pendiente · S/${montoDetraccion(v.descripcion)}`)
        : '—',
      monto: Number(v.monto),
      saldo: balancesMap.get(v.id) ?? 0,
      docs: [
        v.drive_id_guia ? 'Guía PDF' : '',
        v.drive_id_factura ? 'Factura PDF' : '',
      ].filter(Boolean).join(' + ') || '—',
    });

    row.height = 20;

    // Aplicar estilos a cada celda de la fila
    for (let colIdx = 1; colIdx <= 12; colIdx++) {
      const cell = row.getCell(colIdx);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.border = borderAll;
      cell.font = { name: 'Arial', size: 9.5, color: { argb: C_INK } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colIdx === 5 ? 'left' : (colIdx === 10 || colIdx === 11 ? 'right' : 'center'),
      };
    }

    // Estilos particulares por tipo y estado
    const cTipo = row.getCell(4);
    cTipo.font = {
      name: 'Arial',
      size: 8.5,
      bold: true,
      color: { argb: isDeposito ? C_GREEN_DARK : isSaldo ? C_AMBER_DARK : C_SLATE },
    };

    const cMonto = row.getCell(10);
    cMonto.numFmt = isDeposito ? '"+"S/ "#,##0.00' : '"S/ "#,##0.00';
    cMonto.font = {
      name: 'Arial',
      size: 9.5,
      bold: isDeposito || isSaldo,
      color: { argb: isDeposito ? C_GREEN_DARK : C_INK },
    };

    const cSaldo = row.getCell(11);
    cSaldo.numFmt = '"S/ "#,##0.00';
    const saldoRow = balancesMap.get(v.id) ?? 0;
    cSaldo.font = {
      name: 'Arial',
      size: 9.5,
      bold: true,
      color: { argb: saldoRow > 0 ? C_AMBER_DARK : C_GREEN_DARK },
    };

    if (isViaje) {
      // Estado Factura
      const cEstado = row.getCell(7);
      if (v.estado === 'facturado') {
        cEstado.font = { name: 'Arial', size: 9, bold: true, color: { argb: C_GREEN_DARK } };
      } else {
        cEstado.font = { name: 'Arial', size: 9, bold: true, color: { argb: C_AMBER_DARK } };
      }

      // Detracción
      const cDet = row.getCell(9);
      if (v.detraccion === 'pendiente') {
        cDet.font = { name: 'Arial', size: 9, bold: true, color: { argb: C_SIGNAL } };
        cDet.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_SIGNAL_BG } };
      } else {
        cDet.font = { name: 'Arial', size: 9, bold: true, color: { argb: C_GREEN_DARK } };
      }

      // Links a Drive
      const cDocs = row.getCell(12);
      if (baseUrl && (v.drive_id_guia || v.drive_id_factura)) {
        const targetId = v.drive_id_factura || v.drive_id_guia;
        cellHyperlink(cDocs, `${baseUrl}/api/drive/preview?fileId=${targetId}`);
      }
    }
  });

  // ─── Fila de Totales Finales ──────────────────────────────────────────
  const totalRowIndex = sheet.rowCount + 1;
  const totalRow = sheet.getRow(totalRowIndex);
  totalRow.height = 24;

  sheet.mergeCells(`A${totalRowIndex}:E${totalRowIndex}`);
  const totalLabelCell = sheet.getCell(`A${totalRowIndex}`);
  totalLabelCell.value = `RESUMEN FINAL (${viajes.length} OPERACIONES)`;
  totalLabelCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: C_WHITE } };
  totalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_INK } };
  totalLabelCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  for (let c = 6; c <= 12; c++) {
    const cell = totalRow.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_INK } };
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: C_WHITE } };
    cell.border = {
      top: { style: 'medium', color: { argb: C_INK } },
      bottom: { style: 'double', color: { argb: C_INK } },
    };
  }

  // Celda de Monto total fletes
  const totalMontoCell = totalRow.getCell(10);
  totalMontoCell.value = totalFletes - totalDepositos + totalSaldoAnt;
  totalMontoCell.numFmt = '"S/ "#,##0.00';
  totalMontoCell.alignment = { vertical: 'middle', horizontal: 'right' };

  // Celda de Saldo final
  const totalSaldoCell = totalRow.getCell(11);
  totalSaldoCell.value = runningBalance;
  totalSaldoCell.numFmt = '"S/ "#,##0.00';
  totalSaldoCell.alignment = { vertical: 'middle', horizontal: 'right' };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function cellHyperlink(cell: ExcelJS.Cell, url: string) {
  cell.value = {
    text: cell.value ? String(cell.value) : 'Ver en Drive',
    hyperlink: url,
    tooltip: 'Clic para abrir archivo en navegador',
  };
  cell.font = { name: 'Arial', size: 9, color: { argb: '1D4ED8' }, underline: true };
}
