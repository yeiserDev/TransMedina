import type { Viaje } from '@/types';

export function fechaRegistro(viaje: Pick<Viaje, 'fecha_traslado' | 'fecha_carga'>): string | null {
  for (const fecha of [viaje.fecha_traslado, viaje.fecha_carga]) {
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha.startsWith('1900')) continue;
    const timestamp = Date.parse(`${fecha}T12:00:00Z`);
    if (Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === fecha) return fecha;
  }
  return null;
}

export function mesInicial(viajes: Viaje[]): string {
  const fechasViajes = viajes.filter(v => v.tipo === 'viaje').flatMap(v => fechaRegistro(v) ?? []);
  const fechas = fechasViajes.length ? fechasViajes : viajes.flatMap(v => fechaRegistro(v) ?? []);
  return fechas.sort().at(-1)?.slice(0, 7) ?? new Date().toLocaleDateString('sv-SE').slice(0, 7);
}

export function agruparCalendario(viajes: Viaje[], mes: string) {
  const dias = new Map<string, Viaje[]>();
  const sinFecha: Viaje[] = [];
  let totalViajes = 0;
  let depositos = 0;
  for (const viaje of viajes) {
    const fecha = fechaRegistro(viaje);
    if (!fecha) { sinFecha.push(viaje); continue; }
    if (!fecha.startsWith(`${mes}-`)) continue;
    const registros = dias.get(fecha) ?? [];
    registros.push(viaje);
    dias.set(fecha, registros);
    if (viaje.tipo === 'viaje') totalViajes++;
    if (viaje.tipo === 'deposito') depositos++;
  }
  return { dias, sinFecha, totalViajes, depositos };
}
