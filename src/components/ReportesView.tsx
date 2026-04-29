'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, ChevronDown } from 'lucide-react';
import { Viaje } from '@/types';
import EstadoCuentaBlocks from './EstadoCuentaBlocks';

const fmtMoney = (n: number) =>
  `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;


export default function ReportesView({ initialViajes }: { initialViajes?: Viaje[] }) {
  const [transactions, setTransactions] = useState<Viaje[]>(initialViajes ?? []);
  const [loading, setLoading] = useState(!initialViajes);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    if (initialViajes) return;
    fetch('/api/viajes')
      .then(r => r.json())
      .then(data => { setTransactions(Array.isArray(data) ? data : []); setLoading(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const kpis = useMemo(() => {
    let running = 0;
    const sorted = [...transactions].sort((a, b) => {
      const da = a.fecha_traslado.startsWith('1900') ? '0000-00-00' : a.fecha_traslado;
      const db = b.fecha_traslado.startsWith('1900') ? '0000-00-00' : b.fecha_traslado;
      return da.localeCompare(db);
    });
    for (const v of sorted) {
      if (v.tipo === 'deposito') running -= Number(v.monto);
      else running += Number(v.monto);
    }
    const viajes = transactions.filter(v => v.tipo === 'viaje');
    return {
      totalViajes: viajes.length,
      montoTotal: viajes.reduce((s, v) => s + Number(v.monto), 0),
      detPendientes: viajes.filter(v => v.detraccion === 'pendiente').length,
      saldoActual: running,
    };
  }, [transactions]);

  const descargar = async () => {
    setDescargando(true);
    const res = await fetch('/api/reportes');
    const blob = await res.blob();
    const cd = res.headers.get('Content-Disposition') ?? '';
    const filename = cd.split('filename="')[1]?.replace('"', '') ?? 'reporte.xlsx';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    URL.revokeObjectURL(a.href); setDescargando(false);
  };

  return (
    <div className="space-y-5 pb-16">

      {/* Header */}
      <div className="flex items-end justify-between gap-4 pt-2">
        <div>
          <p className="eyebrow mb-2">Análisis</p>
          <h1 className="text-4xl" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>Reportes</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={descargar} disabled={descargando || loading} className="btn-ink">
            <FileSpreadsheet size={15} />
            {descargando ? 'Generando...' : 'Excel'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      {!loading && transactions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { eyebrow: 'Total viajes', value: String(kpis.totalViajes), sub: 'registros' },
            { eyebrow: 'Monto acumulado', value: fmtMoney(kpis.montoTotal), sub: 'fletes' },
            {
              eyebrow: 'Det. pendientes', value: String(kpis.detPendientes),
              sub: kpis.detPendientes > 0 ? 'requieren atención' : 'todo al día ✓',
              warning: kpis.detPendientes > 0,
            },
            {
              eyebrow: 'Saldo actual', value: kpis.saldoActual <= 0 ? '✓ Al día' : fmtMoney(kpis.saldoActual),
              sub: kpis.saldoActual <= 0 ? 'sin deuda' : 'por cobrar',
              ok: kpis.saldoActual <= 0,
            },
          ].map(({ eyebrow, value, sub, warning, ok }) => (
            <div key={eyebrow} className="rounded-3xl p-5 flex flex-col gap-1.5 anim-fade-up"
              style={{ background: 'var(--white)', boxShadow: 'var(--shadow-card)' }}>
              <p className="eyebrow">{eyebrow}</p>
              <p className="text-xl leading-none"
                style={{
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: warning ? 'var(--signal)' : ok ? '#16A34A' : 'var(--ink)',
                }}>
                {value}
              </p>
              {sub && <p className="text-xs" style={{ color: 'var(--slate)', fontWeight: 450 }}>{sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Estado de cuenta por bloques */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton rounded-3xl" style={{ height: 64 }} />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center py-24 gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'var(--canvas)' }}>
            <FileSpreadsheet size={24} style={{ color: 'var(--slate)' }} />
          </div>
          <p style={{ color: 'var(--slate)', fontWeight: 450 }}>Sin datos aún</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <p className="eyebrow">Estado de cuenta</p>
            <ChevronDown size={12} style={{ color: 'var(--slate)' }} />
          </div>
          <EstadoCuentaBlocks viajes={transactions} />
        </>
      )}

    </div>
  );
}
