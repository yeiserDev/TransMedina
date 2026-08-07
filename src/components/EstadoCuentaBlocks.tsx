'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, ArrowDownCircle } from 'lucide-react';
import { Viaje } from '@/types';
import { formatDoc } from '@/lib/documentos';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/* F. carga · F. traslado · Descripción · N° Guía · Estado · N° Factura · Detr. · Monto.
   Guía y factura llevan ancho fijo suficiente para "EG03-000240" completo:
   antes la factura tenía 90px y los números de 6 dígitos se recortaban. */
const GRID_COLS = '76px 76px 1fr 112px 74px 112px 44px 84px';

interface LedgerRow {
  viaje: Viaje;
  cargo: number;
  abono: number;
  balance: number;
}

interface MesBlock {
  mes: string;
  rows: LedgerRow[];
  saldoInicio: number;
  saldoFin: number;
  totalViajes: number;
  montoViajes: number;
  montoDepositos: number;
}

const fmtMoney = (n: number) =>
  `S/ ${Math.abs(Number.isFinite(n) ? n : 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

const fmtDate = (d: string | null | undefined) => {
  if (!d || d.startsWith('1900')) return '—';
  const parsed = new Date(d + 'T12:00:00');
  if (Number.isNaN(parsed.getTime())) return d;
  return format(parsed, 'dd MMM yy', { locale: es });
};

/** Clave de orden tolerante a fechas nulas o al centinela 1900 usado por depósitos. */
const claveFecha = (f: string | null | undefined) =>
  !f || f.startsWith('1900') ? '0000-00-00' : f;

const SIN_MES = 'Sin mes';

interface Props {
  viajes: Viaje[];
  readOnly?: boolean;
}

export default function EstadoCuentaBlocks({ viajes, readOnly: _readOnly = false }: Props) {
  const { blocks } = useMemo(() => {
    const sorted = [...viajes].sort((a, b) => {
      const da = claveFecha(a.fecha_traslado);
      const db = claveFecha(b.fecha_traslado);
      if (da !== db) return da.localeCompare(db);
      if (a.tipo === 'deposito' && b.tipo !== 'deposito') return 1;
      if (b.tipo === 'deposito' && a.tipo !== 'deposito') return -1;
      return 0;
    });

    // Bucle explícito, no `.map`: el saldo es acumulativo y mutar una variable
    // externa dentro de un callback rompe la regla de inmutabilidad de React.
    let running = 0;
    const allRows: LedgerRow[] = [];
    for (const v of sorted) {
      const monto = Number(v.monto) || 0;
      if (v.tipo === 'deposito') {
        running -= monto;
        allRows.push({ viaje: v, cargo: 0, abono: monto, balance: running });
      } else {
        running += monto;
        allRows.push({ viaje: v, cargo: monto, abono: 0, balance: running });
      }
    }

    // Group by mes maintaining order
    const mesOrder: string[] = [];
    const mesMap = new Map<string, LedgerRow[]>();
    for (const row of allRows) {
      // `mes` puede venir vacío en registros importados; sin fallback la clave sería
      // undefined y todos esos bloques colisionarían en la misma key de React.
      const mes = row.viaje.mes?.trim() || SIN_MES;
      if (!mesMap.has(mes)) { mesMap.set(mes, []); mesOrder.push(mes); }
      mesMap.get(mes)!.push(row);
    }

    let prevBalance = 0;
    const blocks: MesBlock[] = mesOrder.map(mes => {
      const rows = mesMap.get(mes)!;
      const saldoInicio = prevBalance;
      const saldoFin = rows[rows.length - 1]?.balance ?? prevBalance;
      const viajeRows = rows.filter(r => r.viaje.tipo === 'viaje');
      const depositoRows = rows.filter(r => r.viaje.tipo === 'deposito');
      prevBalance = saldoFin;
      return {
        mes,
        rows,
        saldoInicio,
        saldoFin,
        totalViajes: viajeRows.length,
        montoViajes: viajeRows.reduce((s, r) => s + r.cargo, 0),
        montoDepositos: depositoRows.reduce((s, r) => s + r.abono, 0),
      };
    });

    // Mostrar del más reciente al más antiguo
    return { blocks: [...blocks].reverse() };
  }, [viajes]);

  // Derivado en render: si los viajes llegan por fetch después del montaje, un
  // inicializador de useState se quedaría con la lista vacía y no abriría nada.
  const [openBlocks, setOpenBlocks] = useState<Set<string> | null>(null);
  const mesPorDefecto = blocks[0]?.mes; // primer bloque = más reciente
  const abiertos = openBlocks ?? new Set(mesPorDefecto ? [mesPorDefecto] : []);

  const toggle = (mes: string) =>
    setOpenBlocks(prev => {
      const next = new Set(prev ?? (mesPorDefecto ? [mesPorDefecto] : []));
      if (next.has(mes)) next.delete(mes);
      else next.add(mes);
      return next;
    });

  if (blocks.length === 0) return null;

  return (
    <div className="space-y-3">
      {blocks.map((block, bIdx) => {
        const isOpen = abiertos.has(block.mes);
        const isLast = bIdx === 0; // primer bloque = más reciente → fondo destacado

        return (
          <div key={block.mes} className="card-stadium overflow-hidden anim-fade-up"
            style={{ animationDelay: `${bIdx * 40}ms` }}>

            {/* Block header — accordion toggle */}
            <button
              className="w-full flex items-center justify-between gap-2 sm:gap-4 px-3.5 sm:px-5 py-3 sm:py-3.5"
              style={{
                background: isLast ? 'var(--ink)' : 'var(--canvas-lifted)',
                borderBottom: isOpen ? '1px solid rgba(20,20,19,.08)' : 'none',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onClick={() => toggle(block.mes)}
            >
              <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap min-w-0 text-left">
                <span className="text-sm capitalize"
                  style={{ fontWeight: 600, letterSpacing: '-0.01em', color: isLast ? 'var(--canvas)' : 'var(--ink)' }}>
                  {block.mes}
                </span>
                {block.totalViajes > 0 && (
                  <span className="badge-pill" style={{
                    background: isLast ? 'rgba(255,255,255,.15)' : 'var(--canvas)',
                    color: isLast ? 'rgba(255,255,255,.8)' : 'var(--slate)',
                    fontSize: 10,
                    padding: '3px 8px',
                  }}>
                    {block.totalViajes} viaje{block.totalViajes !== 1 ? 's' : ''}
                  </span>
                )}
                {/* El monto del depósito ya sale en el pie del bloque: en móvil
                    solo estorbaba y empujaba el saldo fuera de la tarjeta */}
                {block.montoDepositos > 0 && (
                  <span className="badge-pill hidden sm:inline-flex" style={{
                    background: isLast ? 'rgba(134,239,172,.2)' : '#DCFCE7',
                    color: isLast ? '#86EFAC' : '#14532D',
                    fontSize: 10,
                  }}>
                    dep. {fmtMoney(block.montoDepositos)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                <div className="text-right">
                  <p style={{ fontSize: 10, color: isLast ? 'rgba(255,255,255,.5)' : 'var(--slate)', fontWeight: 450, lineHeight: 1.3 }}>
                    Por pagar
                  </p>
                  <p style={{
                    fontWeight: 700,
                    fontSize: 13.5,
                    letterSpacing: '-0.02em',
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                    color: block.saldoFin <= 0 ? '#4ade80' : isLast ? 'var(--canvas)' : 'var(--ink)',
                  }}>
                    {block.saldoFin <= 0 ? '✓ Al día' : fmtMoney(block.saldoFin)}
                  </p>
                </div>
                {isOpen
                  ? <ChevronUp size={14} style={{ color: isLast ? 'rgba(255,255,255,.5)' : 'var(--slate)' }} />
                  : <ChevronDown size={14} style={{ color: isLast ? 'rgba(255,255,255,.5)' : 'var(--slate)' }} />
                }
              </div>
            </button>

            {/* Block body */}
            {isOpen && (
              <div>
                {/* Saldo de arrastre */}
                {block.saldoInicio > 0 && (
                  <div className="flex items-center justify-between px-3.5 sm:px-5 py-2.5"
                    style={{ background: '#FFFBEB', borderBottom: '1px solid rgba(20,20,19,.06)' }}>
                    <span className="text-xs" style={{ color: '#92400E', fontWeight: 500 }}>
                      Saldo arrastrado del mes anterior
                    </span>
                    <span className="text-xs" style={{ fontWeight: 700, color: '#92400E' }}>
                      {fmtMoney(block.saldoInicio)}
                    </span>
                  </div>
                )}

                {/* Column headers — desktop */}
                <div className="hidden sm:grid px-5 py-2"
                  style={{
                    gridTemplateColumns: GRID_COLS,
                    gap: '8px',
                    borderBottom: '1px solid rgba(20,20,19,.06)',
                    background: 'var(--canvas-lifted)',
                  }}>
                  {['F. Carga', 'F. Traslado', 'Descripción', 'N° Guía', 'Estado', 'N° Factura', 'Det.', 'Monto'].map(h => (
                    <span key={h} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--slate)' }}>
                      {h}
                    </span>
                  ))}
                </div>

                {/* Rows */}
                {block.rows.map((row, rIdx) => {
                  const { viaje: v, abono, balance } = row;
                  const isDeposito = v.tipo === 'deposito';
                  const isSaldo = v.tipo === 'saldo_anterior';
                  const prevBal = rIdx === 0 ? block.saldoInicio : block.rows[rIdx - 1].balance;

                  if (isDeposito) {
                    return (
                      <div key={v.id} className="px-3.5 sm:px-5 py-3"
                        style={{
                          background: '#F0FFF4',
                          borderBottom: rIdx < block.rows.length - 1 ? '1px solid rgba(22,163,74,.12)' : 'none',
                        }}>
                        {/* Desktop */}
                        <div className="hidden sm:flex items-center gap-3">
                          <ArrowDownCircle size={13} style={{ color: '#16A34A', flexShrink: 0 }} />
                          <span className="text-xs" style={{ color: '#14532D', fontWeight: 600 }}>
                            Depósito recibido — {fmtDate(v.fecha_traslado)}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--slate)', fontWeight: 450 }}>
                            {v.descripcion || ''}
                          </span>
                          <span className="ml-auto flex items-center gap-4 text-xs shrink-0">
                            <span style={{ color: 'var(--slate)' }}>
                              Debían <strong style={{ color: 'var(--ink)' }}>{fmtMoney(prevBal)}</strong>
                            </span>
                            <span style={{ color: 'var(--slate)', opacity: 0.4 }}>→</span>
                            <span style={{ color: '#16A34A', fontWeight: 600 }}>
                              − {fmtMoney(abono)}
                            </span>
                            <span style={{ color: 'var(--slate)', opacity: 0.4 }}>→</span>
                            <span style={{ fontWeight: 700, color: balance <= 0 ? '#16A34A' : 'var(--ink)' }}>
                              {balance <= 0 ? '✓ Sin deuda' : `deben ${fmtMoney(balance)}`}
                            </span>
                          </span>
                        </div>
                        {/* Mobile */}
                        <div className="sm:hidden">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ArrowDownCircle size={12} style={{ color: '#16A34A' }} />
                              <span className="text-xs" style={{ color: '#14532D', fontWeight: 600 }}>
                                Depósito — {fmtDate(v.fecha_traslado)}
                              </span>
                            </div>
                            <span className="text-xs" style={{ fontWeight: 700, color: '#16A34A' }}>
                              − {fmtMoney(abono)}
                            </span>
                          </div>
                          <p className="text-xs mt-1" style={{ color: 'var(--slate)', paddingLeft: 20 }}>
                            {balance <= 0 ? '✓ Sin deuda' : `Saldo: ${fmtMoney(balance)}`}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  if (isSaldo) {
                    return (
                      <div key={v.id} className="px-3.5 sm:px-5 py-2.5 flex items-center justify-between"
                        style={{ background: '#FFFBEB', borderBottom: rIdx < block.rows.length - 1 ? '1px solid rgba(20,20,19,.06)' : 'none' }}>
                        <span className="text-xs" style={{ color: '#92400E', fontWeight: 500 }}>
                          Saldo anterior registrado
                        </span>
                        <span className="text-xs" style={{ fontWeight: 700, color: '#92400E' }}>
                          + {fmtMoney(row.cargo)}
                        </span>
                      </div>
                    );
                  }

                  // Regular viaje
                  const isEven = rIdx % 2 === 0;
                  return (
                    <div key={v.id}
                      style={{
                        borderBottom: rIdx < block.rows.length - 1 ? '1px solid rgba(20,20,19,.045)' : 'none',
                        background: isEven ? 'var(--white)' : 'var(--canvas-lifted)',
                      }}>
                      {/* Desktop */}
                      <div className="hidden sm:grid px-5 py-2.5 items-center"
                        style={{ gridTemplateColumns: GRID_COLS, gap: '8px' }}>
                        <span className="text-xs" style={{ color: 'var(--slate)' }}>{fmtDate(v.fecha_carga)}</span>
                        <span className="text-xs" style={{ color: 'var(--slate)' }}>{fmtDate(v.fecha_traslado)}</span>
                        <span className="text-xs truncate" style={{ color: 'var(--ink)', fontWeight: 450 }}>{v.descripcion}</span>
                        <span className="text-xs" style={{ color: 'var(--slate)', whiteSpace: 'nowrap' }}>{formatDoc(v.numero_guia) || '—'}</span>
                        <span>
                          {v.estado === 'facturado'
                            ? <span className="badge-pill" style={{ background: '#DCFCE7', color: '#14532D', fontSize: 9, padding: '2px 8px' }}>Facturado</span>
                            : <span className="badge-pill" style={{ background: '#FFF8F5', color: 'var(--signal)', fontSize: 9, padding: '2px 8px' }}>Pendiente</span>
                          }
                        </span>
                        <span className="text-xs" style={{ color: 'var(--slate)', whiteSpace: 'nowrap' }}>{formatDoc(v.numero_factura) || '—'}</span>
                        <span>
                          {v.detraccion === 'realizado'
                            ? <span style={{ fontSize: 11, color: '#16A34A' }}>✓</span>
                            : <span style={{ fontSize: 11, color: 'var(--signal)' }}>⏳</span>
                          }
                        </span>
                        <span className="text-xs text-right" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                          {fmtMoney(Number(v.monto))}
                        </span>
                      </div>

                      {/* Mobile */}
                      <div className="sm:hidden px-3.5 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm truncate" style={{ fontWeight: 500, color: 'var(--ink)' }}>{v.descripcion}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--slate)' }}>
                              {fmtDate(v.fecha_traslado)}
                              {v.numero_guia ? ` · ${formatDoc(v.numero_guia)}` : ''}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm" style={{ fontWeight: 600, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmtMoney(Number(v.monto))}</p>
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                              {v.estado === 'facturado'
                                ? <span className="badge-pill" style={{ background: '#DCFCE7', color: '#14532D', fontSize: 9, padding: '2px 6px' }}>Fact.</span>
                                : <span className="badge-pill" style={{ background: '#FFF8F5', color: 'var(--signal)', fontSize: 9, padding: '2px 6px' }}>Pend.</span>
                              }
                              {v.detraccion === 'pendiente' && (
                                <span style={{ fontSize: 10, color: 'var(--signal)' }}>⏳det</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Block footer */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3.5 sm:px-5 py-3"
                  style={{
                    background: block.saldoFin <= 0 ? '#F0FFF4' : '#FFFBEB',
                    borderTop: '1.5px solid rgba(20,20,19,.08)',
                  }}>
                  {block.montoDepositos > 0 && (
                    /* En móvil cada cifra en su renglón; en escritorio en línea */
                    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 text-xs"
                      style={{ color: 'var(--slate)' }}>
                      <span>
                        <TrendingUp size={10} className="inline mr-1" style={{ color: 'var(--slate)' }} />
                        Fletes <strong style={{ color: 'var(--ink)' }}>{fmtMoney(block.montoViajes)}</strong>
                      </span>
                      <span>
                        <ArrowDownCircle size={10} className="inline mr-1" style={{ color: '#16A34A' }} />
                        Depósito <strong style={{ color: '#16A34A' }}>{fmtMoney(block.montoDepositos)}</strong>
                      </span>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between sm:block sm:text-right shrink-0">
                    <p className="text-xs" style={{ color: 'var(--slate)', fontWeight: 450 }}>
                      {block.saldoFin <= 0 ? 'Sin deuda' : 'Por pagar'}
                    </p>
                    <p style={{
                      fontWeight: 700,
                      fontSize: 15,
                      letterSpacing: '-0.02em',
                      fontVariantNumeric: 'tabular-nums',
                      color: block.saldoFin <= 0 ? '#16A34A' : '#92400E',
                    }}>
                      {block.saldoFin <= 0 ? '✓ Al día' : fmtMoney(block.saldoFin)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
