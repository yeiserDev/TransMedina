export type EstadoViaje = 'pendiente' | 'facturado';
export type EstadoDetraccion = 'pendiente' | 'realizado';
export type TipoRegistro = 'viaje' | 'saldo_anterior' | 'deposito';

export interface Viaje {
  id: string;
  tipo: TipoRegistro;
  fecha_carga: string;
  fecha_traslado: string;
  mes: string;
  descripcion: string;
  numero_guia: string | null;
  estado: EstadoViaje;
  numero_factura: string | null;
  detraccion: EstadoDetraccion;
  monto: number;
  drive_id_guia: string | null;
  drive_id_factura: string | null;
  created_at: string;
  updated_at: string;
}

export type ViajeInsert = Omit<Viaje, 'id' | 'created_at' | 'updated_at'>;
export type ViajeUpdate = Partial<ViajeInsert>;

export interface FiltrosViaje {
  mes?: string;
  estado?: EstadoViaje;
  detraccion?: EstadoDetraccion;
  descripcion?: string;
}

export interface ResumenMensual {
  mes: string;
  total_viajes: number;
  monto_total: number;
  facturados: number;
  pendientes: number;
  detracciones_pendientes: number;
}
