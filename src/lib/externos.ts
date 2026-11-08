export interface AbonoExterno {
  id: string; viaje_id: string; fecha: string; monto: number; nota: string;
  anulado: boolean; motivo_anulacion: string | null;
}
export interface DocumentoExterno {
  id: string; viaje_id: string; nombre: string; tipo: string; abono_id: string | null;
}
export interface ViajeExterno {
  id: string; cliente: string; ruta: string; fecha: string; monto: number;
  cliente_ruc?: string | null;
  pago_completo?: boolean;
  igv_modalidad?: 'total' | 'incluido' | 'adicional';
  estado: 'programado' | 'realizado' | 'cancelado'; notas: string;
  detraccion_monto: number; detraccion_estado: 'no_aplica' | 'pendiente' | 'realizado';
  externos_abonos: AbonoExterno[]; externos_documentos: DocumentoExterno[];
}
export const soles = (n: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);
export const centimos = (n: number) => Math.round(Number(n) * 100);
export function importePorCobrar(v: Pick<ViajeExterno, 'monto' | 'igv_modalidad'>) {
  const importe = centimos(v.monto);
  if (v.igv_modalidad === 'incluido') return 0;
  if (v.igv_modalidad === 'adicional') return Math.round(importe * 18 / 100) / 100;
  return importe / 100; // Existing records keep their original accounting.
}
export function resumenCobros(viajes: ViajeExterno[]) {
  return viajes.filter(v => v.estado !== 'cancelado').reduce((s, v) => {
    const balance = saldoViaje(v);
    const igv = v.igv_modalidad === 'adicional';
    return {
      pendiente: s.pendiente + centimos(balance.pendiente),
      igvPendiente: s.igvPendiente + (igv ? centimos(balance.pendiente) : 0),
      igvCobrado: s.igvCobrado + (igv ? centimos(balance.cobrado) : 0),
      viajesIgvPendiente: s.viajesIgvPendiente + (igv && balance.pendiente > 0 ? 1 : 0),
      sinClasificar: s.sinClasificar + (!v.igv_modalidad || v.igv_modalidad === 'total' ? 1 : 0),
    };
  }, { pendiente: 0, igvPendiente: 0, igvCobrado: 0, viajesIgvPendiente: 0, sinClasificar: 0 });
}
export function saldoViaje(v: ViajeExterno) {
  const cobrado = v.externos_abonos.filter(a => !a.anulado).reduce((s, a) => s + centimos(a.monto), 0);
  return { cobrado: cobrado / 100, pendiente: v.pago_completo ? 0 : (centimos(importePorCobrar(v)) - cobrado) / 100 };
}
export function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function validMoney(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 99999999.99 && Math.abs(value * 100 - Math.round(value * 100)) < 0.00001;
}
export const validId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
