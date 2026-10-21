import type { Viaje } from '@/types';

export const MESES_DEPOSITOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function fechaDeposito(viaje: Pick<Viaje, 'fecha_traslado' | 'fecha_carga'>): string | null {
  for (const fecha of [viaje.fecha_traslado, viaje.fecha_carga]) {
    if (!fecha || fecha.startsWith('1900')) continue;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
    const timestamp = Date.parse(`${fecha}T12:00:00Z`);
    if (match && Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === fecha && Number(match[1]) > 1900) {
      return fecha;
    }
  }
  return null;
}

export function periodoDeposito(viaje: Pick<Viaje, 'fecha_traslado' | 'fecha_carga' | 'mes'>): { year: number; month: number } | null {
  const fecha = fechaDeposito(viaje);
  if (fecha) return { year: Number(fecha.slice(0, 4)), month: Number(fecha.slice(5, 7)) - 1 };
  const match = /^(\S+)\s+(\d{4})$/.exec(viaje.mes?.trim().toLowerCase() ?? '');
  const month = match ? MESES_DEPOSITOS.findIndex(m => m.toLowerCase() === match[1].replace('setiembre', 'septiembre')) : -1;
  return match && month >= 0 && Number(match[2]) > 1900 ? { year: Number(match[2]), month } : null;
}

export function agruparDepositos(viajes: Viaje[], year: number) {
  const meses = MESES_DEPOSITOS.map((nombre, month) => ({ nombre, month, centimos: 0, depositos: [] as Viaje[] }));
  const sinFecha: Viaje[] = [];
  for (const viaje of viajes) {
    if (viaje.tipo !== 'deposito') continue;
    const periodo = periodoDeposito(viaje);
    if (!periodo) { sinFecha.push(viaje); continue; }
    if (periodo.year !== year) continue;
    const monto = Number(viaje.monto);
    meses[periodo.month].centimos += Number.isFinite(monto) ? Math.round(monto * 100) : 0;
    meses[periodo.month].depositos.push(viaje);
  }
  for (const mes of meses) mes.depositos.sort((a, b) => (b.fecha_traslado || '').localeCompare(a.fecha_traslado || '') || b.id.localeCompare(a.id));
  const conDepositos = meses.filter(m => m.depositos.length > 0);
  const mayor = conDepositos.length ? Math.max(...conDepositos.map(m => m.centimos)) : null;
  const menor = conDepositos.length ? Math.min(...conDepositos.map(m => m.centimos)) : null;
  return {
    meses, sinFecha,
    totalCentimos: meses.reduce((s, m) => s + m.centimos, 0),
    cantidad: meses.reduce((s, m) => s + m.depositos.length, 0),
    mayor, menor,
  };
}
