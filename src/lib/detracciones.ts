import { Viaje, FiltroCadena } from '@/types';
import { coincideCadena } from './cadenas';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function esPucallpa(descripcion?: string | null): boolean {
  return descripcion?.toLowerCase().includes('pucallpa') ?? false;
}

export function baseFacturacion(descripcion?: string | null): number {
  return esPucallpa(descripcion) ? 2000 : 1000;
}

export function montoDetraccion(descripcion?: string | null): number {
  return esPucallpa(descripcion) ? 80 : 40;
}

export interface ResumenDetracciones {
  totalViajes: number;
  pendientesCount: number;
  pendientesMonto: number;
  pendientesHyoCount: number;
  pendientesPucCount: number;
  pagadasCount: number;
  pagadasMonto: number;
  pagadasHyoCount: number;
  pagadasPucCount: number;
  totalMontoSPOT: number;
}

export function calcularResumenDetracciones(
  viajes: Viaje[],
  filtroCadena?: FiltroCadena
): ResumenDetracciones {
  const soloViajes = viajes.filter(
    v => v.tipo === 'viaje' && coincideCadena(v, filtroCadena)
  );

  let pendientesMonto = 0;
  let pendientesCount = 0;
  let pendientesHyoCount = 0;
  let pendientesPucCount = 0;

  let pagadasMonto = 0;
  let pagadasCount = 0;
  let pagadasHyoCount = 0;
  let pagadasPucCount = 0;

  for (const v of soloViajes) {
    const det = montoDetraccion(v.descripcion);
    const esPuc = esPucallpa(v.descripcion);

    if (v.detraccion === 'pendiente') {
      pendientesCount++;
      pendientesMonto += det;
      if (esPuc) pendientesPucCount++;
      else pendientesHyoCount++;
    } else {
      pagadasCount++;
      pagadasMonto += det;
      if (esPuc) pagadasPucCount++;
      else pagadasHyoCount++;
    }
  }

  return {
    totalViajes: soloViajes.length,
    pendientesCount,
    pendientesMonto,
    pendientesHyoCount,
    pendientesPucCount,
    pagadasCount,
    pagadasMonto,
    pagadasHyoCount,
    pagadasPucCount,
    totalMontoSPOT: pendientesMonto + pagadasMonto,
  };
}

export function formatearDetraccionTexto(v: Viaje): string {
  const esPuc = esPucallpa(v.descripcion);
  const destino = esPuc ? 'Pucallpa' : 'Huancayo';
  const detMonto = montoDetraccion(v.descripcion);
  const guia = v.numero_guia || 'Sin guía';
  const factura = v.numero_factura || 'Por facturar';
  const fecha = v.fecha_traslado && !v.fecha_traslado.startsWith('1900')
    ? format(new Date(v.fecha_traslado + 'T12:00:00'), 'dd/MM/yyyy', { locale: es })
    : '—';

  return `• ${fecha} | Destino: ${destino} | Factura: ${factura} | Guía: ${guia} | Detracción 4%: S/ ${detMonto.toFixed(2)}`;
}

export function formatearListaDetraccionesTexto(viajes: Viaje[]): string {
  const pendientes = viajes.filter(v => v.tipo === 'viaje' && v.detraccion === 'pendiente');
  if (pendientes.length === 0) return 'No hay detracciones pendientes.';

  const total = pendientes.reduce((acc, v) => acc + montoDetraccion(v.descripcion), 0);
  const lineas = pendientes.map(v => formatearDetraccionTexto(v)).join('\n');

  return `*DETRACCIONES PENDIENTES - FART (4%)*\n` +
    `Total a depositar en Banco de la Nación: S/ ${total.toFixed(2)} (${pendientes.length} viajes)\n` +
    `Servicio: 027 Transporte de carga terrestre\n\n` +
    `${lineas}`;
}
