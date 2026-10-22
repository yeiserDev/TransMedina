import type { Viaje } from '@/types';
import { formatDoc } from './documentos';

export interface ViajeDocumentado {
  viaje: Viaje;
  fecha: string | null;
  archivos: number;
}

export interface MesDocumentos {
  key: string;
  viajes: ViajeDocumentado[];
  archivos: number;
}

export interface AnioDocumentos {
  key: string;
  meses: MesDocumentos[];
  archivos: number;
}

function normalizar(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function fechaValida(value: string | null | undefined): string | null {
  if (!value || value.startsWith('1900') || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const fecha = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === value ? value : null;
}

/** Mantiene juntos los archivos de cada viaje; solo incluye carpetas con PDF. */
export function agruparDocumentos(viajes: Viaje[], busqueda = ''): AnioDocumentos[] {
  const terminos = normalizar(busqueda).trim().split(/\s+/).filter(Boolean);
  const meses = new Map<string, MesDocumentos>();

  for (const viaje of viajes) {
    const archivos = Number(Boolean(viaje.drive_id_guia)) + Number(Boolean(viaje.drive_id_factura)) + Number(Boolean(viaje.drive_id_detraccion));
    if (viaje.tipo !== 'viaje' || !archivos) continue;
    const fecha = fechaValida(viaje.fecha_traslado) ?? fechaValida(viaje.fecha_carga);
    const texto = normalizar([
      viaje.descripcion, formatDoc(viaje.numero_guia), formatDoc(viaje.numero_factura),
      fecha, viaje.cadena,
    ].filter(Boolean).join(' '));
    if (!terminos.every(termino => texto.includes(termino))) continue;

    const key = fecha?.slice(0, 7) ?? 'sin-fecha';
    if (!meses.has(key)) meses.set(key, { key, viajes: [], archivos: 0 });
    const mes = meses.get(key)!;
    mes.viajes.push({ viaje, fecha, archivos });
    mes.archivos += archivos;
  }

  const anios = new Map<string, AnioDocumentos>();
  const ordenados = [...meses.values()].sort((a, b) => {
    if (a.key === 'sin-fecha') return 1;
    if (b.key === 'sin-fecha') return -1;
    return b.key.localeCompare(a.key);
  });
  for (const mes of ordenados) {
    mes.viajes.sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? '') ||
      (b.viaje.created_at ?? '').localeCompare(a.viaje.created_at ?? '') || a.viaje.id.localeCompare(b.viaje.id));
    const key = mes.key === 'sin-fecha' ? 'sin-fecha' : mes.key.slice(0, 4);
    if (!anios.has(key)) anios.set(key, { key, meses: [], archivos: 0 });
    const anio = anios.get(key)!;
    anio.meses.push(mes);
    anio.archivos += mes.archivos;
  }
  return [...anios.values()];
}
