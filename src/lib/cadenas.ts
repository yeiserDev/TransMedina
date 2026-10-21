import type { Cadena, FiltroCadena, Viaje } from '@/types';

export const CADENAS: { value: Cadena; label: string }[] = [
  { value: 'ripley', label: 'Ripley' },
  { value: 'oechsle', label: 'Oechsle' },
];

// Los registros anteriores a esta función pertenecen a la operación Ripley.
// null es una asignación explícita a la cuenta general de FART.
export function cadenaDe(viaje: Pick<Viaje, 'cadena'>): Cadena | null {
  return viaje.cadena === undefined ? 'ripley' : viaje.cadena;
}

export function nombreCadena(cadena: Cadena | null): string {
  return CADENAS.find(item => item.value === cadena)?.label ?? 'General FART';
}

export function coincideCadena(viaje: Pick<Viaje, 'cadena'>, filtro?: FiltroCadena): boolean {
  return !filtro || cadenaDe(viaje) === (filtro === 'general' ? null : filtro);
}

export function resumenCuenta(viajes: Pick<Viaje, 'tipo' | 'monto'>[]) {
  let fletes = 0;
  let depositos = 0;
  let saldoAnterior = 0;
  for (const viaje of viajes) {
    const monto = Number(viaje.monto) || 0;
    if (viaje.tipo === 'deposito') depositos += monto;
    else if (viaje.tipo === 'saldo_anterior') saldoAnterior += monto;
    else fletes += monto;
  }
  return { fletes, depositos, saldoAnterior, saldo: fletes + saldoAnterior - depositos };
}

export function esCadena(value: unknown): value is Cadena {
  return value === 'ripley' || value === 'oechsle';
}
