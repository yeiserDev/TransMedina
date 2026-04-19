'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, TrendingUp, ArrowDownCircle, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { Viaje } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ResumenMes {
  mes: string; total: number; monto: number; facturados: number; det_pendientes: number;
}

interface LedgerRow {
  viaje: Viaje;
  cargo: number;
  abono: number;
  balance: number;
}

const fmtMoney = (n: number) =>
  `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

const fmtDate = (d: string) => {
  if (!d || d.startsWith('1900')) return '—';
  try { return format(new Date(d + 'T12:00:00'), 'dd MMM yy', { locale: es }); }
  catch { return d; }
};

export default function ReportesView() {
  const [resumen, setResumen] = useState<ResumenMes[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Viaje[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [descargando, setDescargando] = useState<string | null>(null);
  const [desgloseOpen, setDesgloseOpen] = useState(false);

  useEffect(() => {
    fetch('/api/reportes?tipo=resumen')
      .then(r => r.json())
      .then(data => { setResumen(Array.isArray(data) ? data : []); setLoading(false); });

    fetch('/api/viajes')
      .then(r => r.json())
      .then(data => { setTransactions(Array.isArray(data) ? data : []); setLoadingLedger(false); });
  }, []);

  const ledger = useMemo((): LedgerRow[] => {
    const sorted = [...transactions].sort((a, b) => {
      const da = a.fecha_traslado.startsWith('1900') ? '0000-00-00' : a.fecha_traslado;
      const db = b.fecha_traslado.startsWith('1900') ? '0000-00-00' : b.fecha_traslado;
      if (da !== db) return da.localeCompare(db);
      if (a.tipo === 'deposito' && b.tipo !== 'deposito') return 1;
      if (b.tipo === 'deposito' && a.tipo !== 'deposito') return -1;
      return 0;
    });
    let running = 0;
    return sorted.map(v => {
      const monto = Number(v.monto);
      if (v.tipo === 'deposito') {
        running -= monto;
        return { viaje: v, cargo: 0, abono: monto, balance: running };
      } else {
        running += monto;
        return { viaje: v, cargo: monto, abono: 0, balance: running };
      }
    });
  }, [transactions]);

  const descargar = async (mes?: string) => {
    const key = mes ?? 'todos'; setDescargando(key);
    const url = mes ? `/api/reportes?mes=${encodeURIComponent(mes)}` : '/api/reportes';
    const res = await fetch(url);
    const blob = await res.blob();
    const cd = res.headers.get('Content-Disposition') ?? '';
    const filename = cd.split('filename="')[1]?.replace('"', '') ?? 'reporte.xlsx';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    URL.revokeObjectURL(a.href); setDescargando(null);
  };

  const totalMonto  = resumen.reduce((s, r) => s + r.monto, 0);
  const totalViajes = resumen.reduce((s, r) => s + r.total, 0);
  const totalDet    = resumen.reduce((s, r) => s + r.det_pendientes, 0);
  const maxMonto    = Math.max(...resumen.map(r => r.monto), 1);
  const saldoFinal  = ledger.length > 0 ? ledger[ledger.length - 1].balance : 0;

  return (
    <div className="space-y-6 pb-16">

      {/* Header */}
      <div className="flex items-end justify-between gap-4 pt-2">
        <div>
          <p className="eyebrow mb-2">Análisis</p>
          <h1 className="text-4xl" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>Reportes</h1>
        </div>
        <button
          onClick={() => descargar()}
          disabled={descargando === 'todos' || resumen.length === 0}
          className="btn-ink"
        >
          <FileSpreadsheet size={15} />
          {descargando === 'todos' ? 'Generando...' : 'Exportar todo'}
        </button>
      </div>

      {/* KPIs */}
      {!loading && resumen.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { eyebrow: 'Total viajes', value: String(totalViajes), sub: 'registros' },
            {
              eyebrow: 'Monto acumulado',
              value: fmtMoney(totalMonto),
              sub: 'fletes cobrados',
            },
            {
              eyebrow: 'Det. pendientes',
              value: String(totalDet),
              sub: totalDet > 0 ? 'requieren atención' : 'todo al día ✓',
              warning: totalDet > 0,
            },
          ].map(({ eyebrow, value, sub, warning }) => (
            <div key={eyebrow} className="rounded-3xl p-6 flex flex-col gap-2 anim-fade-up"
              style={{ background: 'var(--white)', boxShadow: 'var(--shadow-card)' }}>
              <p className="eyebrow">{eyebrow}</p>
              <p className="text-2xl leading-none"
                style={{ fontWeight: 500, letterSpacing: '-0.02em', color: warning ? 'var(--signal)' : 'var(--ink)' }}>
                {value}
              </p>
              {sub && <p className="text-xs" style={{ color: 'var(--slate)', fontWeight: 450 }}>{sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Desglose mensual */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton rounded-3xl" style={{ height: 80 }} />
          ))}
        </div>
      ) : resumen.length === 0 ? (
        <div className="flex flex-col items-center py-24 gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'var(--canvas)' }}>
            <FileSpreadsheet size={24} style={{ color: 'var(--slate)' }} />
          </div>
          <p style={{ color: 'var(--slate)', fontWeight: 450 }}>Sin datos aún</p>
        </div>
      ) : (
        <div className="card-stadium overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-6 py-4 transition-colors duration-100"
            style={{ borderBottom: desgloseOpen ? '1px solid rgba(20,20,19,.08)' : 'none', background: 'var(--canvas-lifted)', cursor: 'pointer' }}
            onClick={() => setDesgloseOpen(o => !o)}
          >
            <p className="eyebrow">Desglose mensual</p>
            {desgloseOpen ? <ChevronUp size={14} style={{ color: 'var(--slate)' }} /> : <ChevronDown size={14} style={{ color: 'var(--slate)' }} />}
          </button>
          {desgloseOpen && <div>
            {resumen.map((r, idx) => {
              const pct = Math.round((r.monto / maxMonto) * 100);
              return (
                <div key={r.mes} className="px-6 py-5 transition-colors duration-100 anim-fade-up"
                  style={{ borderBottom: idx < resumen.length - 1 ? '1px solid rgba(20,20,19,.06)' : 'none', animationDelay: `${idx * 50}ms` }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--canvas-lifted)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="text-base capitalize" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>{r.mes}</p>
                      <span className="badge-pill" style={{ background: 'var(--canvas)', color: 'var(--slate)', fontSize: 11 }}>
                        {r.total} viaje{r.total !== 1 ? 's' : ''}
                      </span>
                      {r.det_pendientes > 0 && (
                        <span className="badge-pill" style={{ background: '#FFF8F5', color: 'var(--signal)', fontSize: 11 }}>
                          {r.det_pendientes} det. pendiente{r.det_pendientes !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="text-base" style={{ fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
                        S/ {r.monto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </p>
                      <button onClick={() => descargar(r.mes)} disabled={descargando === r.mes}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all duration-150 disabled:opacity-50"
                        style={{ borderRadius: 'var(--r-pill)', border: '1.5px solid var(--ink)', color: 'var(--ink)', background: 'transparent', fontWeight: 500 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ink)'; (e.currentTarget as HTMLElement).style.color = 'var(--canvas)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--ink)'; }}>
                        <Download size={12} />
                        {descargando === r.mes ? 'Generando...' : 'Excel'}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--canvas)' }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: 'var(--ink)' }} />
                    </div>
                    <span className="text-xs w-12 text-right" style={{ color: 'var(--slate)', fontWeight: 450 }}>
                      {r.facturados}/{r.total}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>}
        </div>
      )}

      {/* ── Estado de cuenta ─────────────────────────────────── */}
      {!loadingLedger && ledger.length > 0 && (
        <div className="card-stadium overflow-hidden">

          {/* Card header */}
          <div className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid rgba(20,20,19,.08)', background: 'var(--canvas-lifted)' }}>
            <div className="flex items-center gap-2">
              <BookOpen size={14} style={{ color: 'var(--slate)' }} />
              <p className="eyebrow">Estado de cuenta</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--slate)', fontWeight: 450 }}>Saldo actual:</span>
              <span style={{
                fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em',
                color: saldoFinal <= 0 ? '#16A34A' : 'var(--ink)',
              }}>
                {fmtMoney(saldoFinal)}
              </span>
            </div>
          </div>

          {/* Column headers — desktop */}
          <div className="hidden sm:grid px-6 py-2.5"
            style={{
              gridTemplateColumns: '90px 1fr 120px 120px 120px',
              borderBottom: '1px solid rgba(20,20,19,.06)',
              background: 'var(--canvas-lifted)',
            }}>
            {['Fecha', 'Concepto', 'Cargo (+)', 'Abono (−)', 'Saldo'].map(h => (
              <span key={h} className="eyebrow" style={{ fontSize: 9 }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {ledger.map((row, idx) => {
            const { viaje: v, cargo, abono, balance } = row;
            const isDeposito = v.tipo === 'deposito';
            const isSaldo    = v.tipo === 'saldo_anterior';
            const prevBalance = idx > 0 ? ledger[idx - 1].balance : 0;
            const balanceDown = balance < prevBalance;

            return (
              <div key={v.id}
                className="px-6 py-4 anim-fade-up transition-colors duration-100"
                style={{
                  borderBottom: idx < ledger.length - 1 ? '1px solid rgba(20,20,19,.05)' : 'none',
                  background: isDeposito ? '#F0FFF4' : isSaldo ? '#FFF8F0' : undefined,
                  animationDelay: `${idx * 20}ms`,
                }}
                onMouseEnter={e => {
                  if (!isDeposito && !isSaldo)
                    (e.currentTarget as HTMLElement).style.background = 'var(--canvas-lifted)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background =
                    isDeposito ? '#F0FFF4' : isSaldo ? '#FFF8F0' : '';
                }}
              >
                {/* Desktop layout */}
                <div className="hidden sm:grid items-center gap-2"
                  style={{ gridTemplateColumns: '90px 1fr 120px 120px 120px' }}>

                  <span className="text-xs" style={{ color: 'var(--slate)' }}>
                    {fmtDate(v.fecha_traslado)}
                  </span>

                  <div className="flex items-center gap-2 min-w-0">
                    {isSaldo && (
                      <span className="badge-pill shrink-0" style={{ background: '#FFF0CC', color: '#92400E', fontSize: 9 }}>
                        Saldo ant.
                      </span>
                    )}
                    {isDeposito && (
                      <span className="badge-pill shrink-0" style={{ background: '#DCFCE7', color: '#14532D', fontSize: 9 }}>
                        Depósito
                      </span>
                    )}
                    {v.tipo === 'viaje' && (
                      <span className="badge-pill shrink-0" style={{ background: 'var(--canvas)', color: 'var(--slate)', fontSize: 9 }}>
                        Viaje
                      </span>
                    )}
                    <span className="text-sm truncate" style={{ color: 'var(--ink)', fontWeight: 450 }}>
                      {isSaldo
                        ? `Saldo anterior — ${v.mes}`
                        : isDeposito
                          ? (v.descripcion || 'Depósito recibido')
                          : v.descripcion}
                    </span>
                  </div>

                  {/* Cargo */}
                  <div className="text-right">
                    {cargo > 0 ? (
                      <span className="flex items-center justify-end gap-1 text-sm" style={{ fontWeight: 500, color: 'var(--ink)' }}>
                        <TrendingUp size={11} style={{ color: 'var(--slate)' }} />
                        {fmtMoney(cargo)}
                      </span>
                    ) : (
                      <span className="text-sm" style={{ color: 'var(--dust)' }}>—</span>
                    )}
                  </div>

                  {/* Abono */}
                  <div className="text-right">
                    {abono > 0 ? (
                      <span className="flex items-center justify-end gap-1 text-sm" style={{ fontWeight: 600, color: '#16A34A' }}>
                        <ArrowDownCircle size={11} />
                        {fmtMoney(abono)}
                      </span>
                    ) : (
                      <span className="text-sm" style={{ color: 'var(--dust)' }}>—</span>
                    )}
                  </div>

                  {/* Saldo corriente */}
                  <div className="text-right">
                    <span style={{
                      fontWeight: 700,
                      fontSize: 14,
                      letterSpacing: '-0.02em',
                      color: balance <= 0 ? '#16A34A' : balanceDown ? '#16A34A' : 'var(--ink)',
                    }}>
                      {fmtMoney(balance)}
                    </span>
                  </div>
                </div>

                {/* Detalle depósito */}
                {isDeposito && (
                  <div className="hidden sm:flex items-center gap-2 mt-2 text-xs" style={{ paddingLeft: 90 + 8, color: 'var(--slate)', fontWeight: 450 }}>
                    <span>Nos debían <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{fmtMoney(prevBalance)}</strong></span>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span>depositaron <strong style={{ color: '#16A34A', fontWeight: 600 }}>{fmtMoney(abono)}</strong></span>
                    <span style={{ opacity: 0.4 }}>→</span>
                    <span>
                      {balance > 0
                        ? <>nos deben <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{fmtMoney(balance)}</strong></>
                        : <strong style={{ color: '#16A34A', fontWeight: 600 }}>sin deuda ✓</strong>
                      }
                    </span>
                  </div>
                )}

                {/* Mobile layout */}
                <div className="sm:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {isSaldo && <span className="badge-pill shrink-0" style={{ background: '#FFF0CC', color: '#92400E', fontSize: 9 }}>Saldo ant.</span>}
                      {isDeposito && <span className="badge-pill shrink-0" style={{ background: '#DCFCE7', color: '#14532D', fontSize: 9 }}>Depósito</span>}
                      {v.tipo === 'viaje' && <span className="badge-pill shrink-0" style={{ background: 'var(--canvas)', color: 'var(--slate)', fontSize: 9 }}>Viaje</span>}
                      <span className="text-sm truncate" style={{ color: 'var(--ink)', fontWeight: 450 }}>
                        {isSaldo ? `Saldo ant. — ${v.mes}` : isDeposito ? (v.descripcion || 'Depósito') : v.descripcion}
                      </span>
                    </div>
                    <span className="shrink-0" style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em', color: balance <= 0 ? '#16A34A' : 'var(--ink)' }}>
                      {fmtMoney(balance)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs" style={{ color: 'var(--slate)' }}>{fmtDate(v.fecha_traslado)}</span>
                    <div className="flex items-center gap-3 text-xs">
                      {cargo > 0 && <span style={{ color: 'var(--ink)' }}>+{fmtMoney(cargo)}</span>}
                      {abono > 0 && <span style={{ color: '#16A34A' }}>−{fmtMoney(abono)}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Footer — saldo final */}
          <div className="px-6 py-4 flex items-center justify-between"
            style={{ background: saldoFinal <= 0 ? '#F0FFF4' : 'var(--canvas)', borderTop: '2px solid rgba(20,20,19,.1)' }}>
            <p className="text-sm" style={{ fontWeight: 600, color: saldoFinal <= 0 ? '#14532D' : 'var(--ink)' }}>
              {saldoFinal <= 0 ? '✓ Sin deuda pendiente' : 'Saldo pendiente de cobro'}
            </p>
            <p style={{
              fontWeight: 700, fontSize: 18, letterSpacing: '-0.025em',
              color: saldoFinal <= 0 ? '#16A34A' : 'var(--ink)',
            }}>
              {fmtMoney(Math.abs(saldoFinal))}
            </p>
          </div>
        </div>
      )}

      {/* Skeleton estado de cuenta */}
      {loadingLedger && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton rounded-2xl" style={{ height: 56 }} />
          ))}
        </div>
      )}
    </div>
  );
}
