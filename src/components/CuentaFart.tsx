import type { FiltroCadena, Viaje } from '@/types';
import { cadenaDe, coincideCadena, nombreCadena, resumenCuenta } from '@/lib/cadenas';

const money = (value: number) => `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CuentaFart({ viajes, cadena }: { viajes: Viaje[]; cadena?: FiltroCadena }) {
  const total = resumenCuenta(viajes);
  const cuenta = resumenCuenta(viajes.filter(v => coincideCadena(v, cadena)));
  const generales = resumenCuenta(viajes.filter(v => cadenaDe(v) === null));
  const nombre = cadena === 'general' ? 'General FART' : cadena ? nombreCadena(cadena) : 'Todas las cargas';
  const hayGenerales = generales.depositos !== 0 || generales.saldoAnterior !== 0;

  return <section aria-label="Cuenta de FART" className="rounded-3xl p-4 sm:p-5" style={{ background: 'var(--white)' }}>
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div>
        <p className="text-xs" style={{ color: 'var(--slate)' }}>FART · {total.saldo < 0 ? 'Saldo a favor' : 'Total por cobrar'}</p>
        <p className="text-2xl mt-1" style={{ fontWeight: 650, letterSpacing: '-.025em', fontVariantNumeric: 'tabular-nums' }}>{money(Math.abs(total.saldo))}</p>
      </div>
      <dl className="flex flex-wrap gap-x-6 gap-y-3 text-xs">
        <div><dt style={{ color: 'var(--slate)' }}>{nombre} · Fletes</dt><dd className="mt-1 font-semibold">{money(cuenta.fletes)}</dd></div>
        <div><dt style={{ color: 'var(--slate)' }}>Pagos {cadena && cadena !== 'general' ? 'asignados' : 'recibidos'}</dt><dd className="mt-1 font-semibold">{money(cuenta.depositos)}</dd></div>
        {cuenta.saldoAnterior !== 0 && <div><dt style={{ color: 'var(--slate)' }}>Saldo anterior</dt><dd className="mt-1 font-semibold">{money(cuenta.saldoAnterior)}</dd></div>}
        {cadena && <div><dt style={{ color: 'var(--slate)' }}>{cadena !== 'general' && hayGenerales ? 'Saldo antes de abonos generales' : cuenta.saldo < 0 ? 'Saldo a favor' : 'Saldo de esta cuenta'}</dt><dd className="mt-1 font-semibold">{money(cuenta.saldo)}</dd></div>}
      </dl>
    </div>
    {cadena && cadena !== 'general' && hayGenerales && <p className="text-xs mt-4" style={{ color: 'var(--slate)', lineHeight: 1.5 }}>
      Hay {money(generales.depositos)} en abonos generales de FART{generales.saldoAnterior !== 0 ? ` y ${money(generales.saldoAnterior)} de saldo anterior general` : ''}. Ya están incluidos en el total de FART. Asígnalos a una cadena para conocer su deuda exacta.
    </p>}
    <p className="text-xs mt-3" style={{ color: 'var(--slate)' }}>El total de FART incluye todas las cargas y todos los meses.</p>
  </section>;
}
