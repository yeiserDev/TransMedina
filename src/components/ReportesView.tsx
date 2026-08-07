'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, ChevronDown } from 'lucide-react';
import { Viaje } from '@/types';
import { toast } from 'sonner';
import EstadoCuentaBlocks from './EstadoCuentaBlocks';

const fmtMoney = (n: number) =>
  `S/ ${(Number.isFinite(n) ? n : 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

/** Clave de orden tolerante a fechas nulas o al centinela 1900 usado por depósitos. */
const claveFecha = (f: string | null | undefined) =>
  !f || f.startsWith('1900') ? '0000-00-00' : f;

export default function ReportesView({ initialViajes }: { initialViajes?: Viaje[] }) {
  const [transactions, setTransactions] = useState<Viaje[]>(initialViajes ?? []);
  const [loading, setLoading] = useState(!initialViajes);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    if (initialViajes) return;
    fetch('/api/viajes')
      .then(r => r.json())
      .then(data => { setTransactions(Array.isArray(data) ? data : []); })
      .catch(() => toast.error('No se pudieron cargar los registros'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const kpis = useMemo(() => {
    let running = 0;
    const sorted = [...transactions].sort(
      (a, b) => claveFecha(a.fecha_traslado).localeCompare(claveFecha(b.fecha_traslado))
    );
    for (const v of sorted) {
      if (v.tipo === 'deposito') running -= Number(v.monto);
      else running += Number(v.monto);
    }
    const viajes = transactions.filter(v => v.tipo === 'viaje');
    return {
      detPendientes: viajes.filter(v => v.detraccion === 'pendiente').length,
      saldoActual: running,
    };
  }, [transactions]);

  const descargar = async () => {
    setDescargando(true);
    let url: string | null = null;
    try {
      const res = await fetch('/api/reportes');
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') ?? '';
      const filename = cd.split('filename="')[1]?.replace('"', '') ?? 'reporte.xlsx';

      url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`No se pudo generar el Excel: ${msg}`);
    } finally {
      // Liberar después del clic: revocar de inmediato puede cancelar la descarga
      const creada = url;
      if (creada) setTimeout(() => URL.revokeObjectURL(creada), 10_000);
      setDescargando(false);
    }
  };

  return (
    <div className="space-y-5 pb-16">

      {/* Header */}
      <div className="flex items-end justify-between gap-3 pt-2">
        <div className="min-w-0">
          <p className="eyebrow mb-1.5 sm:mb-2">Análisis</p>
          <h1 className="text-3xl sm:text-4xl" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>
            Reportes
          </h1>
        </div>
        <button
          onClick={descargar}
          disabled={descargando || loading}
          className="btn-ink shrink-0"
          style={{ padding: '9px 16px', fontSize: 13 }}
        >
          <FileSpreadsheet size={15} />
          {descargando ? 'Generando…' : 'Excel'}
        </button>
      </div>

      {/* KPIs */}
      {!loading && transactions.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {[
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
            <div key={eyebrow} className="rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 flex flex-col gap-1 sm:gap-1.5 anim-fade-up"
              style={{ background: 'var(--white)', boxShadow: 'var(--shadow-card)', minWidth: 0 }}>
              {/* El eyebrow global es de 12px; en móvil se come el ancho de la tarjeta */}
              <p className="eyebrow" style={{ fontSize: 9.5, letterSpacing: '0.4px' }}>{eyebrow}</p>
              <p className="text-base sm:text-xl leading-tight"
                style={{
                  fontWeight: 600,
                  letterSpacing: '-0.03em',
                  fontVariantNumeric: 'tabular-nums',
                  color: warning ? 'var(--signal)' : ok ? '#16A34A' : 'var(--ink)',
                  overflowWrap: 'anywhere',
                }}>
                {value}
              </p>
              {sub && (
                <p style={{ fontSize: 10.5, color: 'var(--slate)', fontWeight: 450, lineHeight: 1.3 }}>
                  {sub}
                </p>
              )}
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
