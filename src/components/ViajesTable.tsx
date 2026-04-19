'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Paperclip, ArrowDownCircle, ClipboardList, Copy, Check, X } from 'lucide-react';
import { Viaje, ViajeInsert, FiltrosViaje, EstadoDetraccion, TipoRegistro } from '@/types';
import { BadgeEstado, ToggleDetraccion } from './BadgeEstado';
import FiltroBarra from './FiltroBarra';
import ViajeForm from './ViajeForm';
import ConfirmDialog from './ConfirmDialog';
import ArchivosDrive from './ArchivosDrive';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

function SkeletonRow() {
  return (
    <tr>
      {[80, 90, 140, 110, 90, 100, 90, 70, 40, 40].map((w, i) => (
        <td key={i} className="px-4 py-4">
          <div className="skeleton" style={{ height: 14, width: w }} />
        </td>
      ))}
    </tr>
  );
}

const fmtMoney = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

function formatFactura(v: Viaje): string {
  const esPuc = v.descripcion?.toLowerCase().includes('pucallpa');
  const destino = esPuc ? 'Pucallpa' : 'Huancayo';
  const monto = esPuc ? 2000 : 1000;
  const guia = v.numero_guia ?? '—';
  const fecha = v.fecha_traslado && !v.fecha_traslado.startsWith('1900')
    ? format(new Date(v.fecha_traslado + 'T12:00:00'), 'dd/MM/yyyy')
    : '—';
  return `Factura a la empresa 'FART' con Ruc: 20509811424 por un servicio de flete de Lima a ${destino} por ${monto} Incluido IGV con la guía Transportista N° ${guia} con la fecha de ${fecha}`;
}

function KpiCard({ eyebrow, value, sub, warning }: {
  eyebrow: string; value: string; sub?: string; warning?: boolean;
}) {
  return (
    <div className="rounded-3xl p-6 flex flex-col gap-2 anim-fade-up"
      style={{ background: 'var(--white)', boxShadow: 'var(--shadow-card)' }}>
      <p className="eyebrow">{eyebrow}</p>
      <p className="text-2xl leading-none" style={{
        fontWeight: 500, letterSpacing: '-0.02em',
        color: warning ? 'var(--signal)' : 'var(--ink)',
      }}>
        {value}
      </p>
      {sub && <p className="text-xs" style={{ color: 'var(--slate)', fontWeight: 450 }}>{sub}</p>}
    </div>
  );
}

export default function ViajesTable() {
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState<FiltrosViaje>({});
  const [showForm, setShowForm] = useState(false);
  const [newTipo, setNewTipo] = useState<TipoRegistro>('viaje');
  const [editViaje, setEditViaje] = useState<Viaje | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showFacturas, setShowFacturas] = useState(false);
  const [facturasViajes, setFacturasViajes] = useState<Viaje[]>([]);
  const [loadingFacturas, setLoadingFacturas] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchViajes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtros.mes) params.set('mes', filtros.mes);
    if (filtros.estado) params.set('estado', filtros.estado);
    if (filtros.detraccion) params.set('detraccion', filtros.detraccion);
    const res = await fetch(`/api/viajes?${params}`);
    const data = await res.json();
    setViajes(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [filtros]);

  useEffect(() => { fetchViajes(); }, [fetchViajes]);

  const meses = useMemo(() => Array.from(new Set(viajes.map((v) => v.mes))), [viajes]);

  const hasFilters = !!(filtros.mes || filtros.estado || filtros.detraccion);

  const ledgerMap = useMemo(() => {
    if (hasFilters) return new Map<string, { before: number; after: number }>();
    const sorted = [...viajes].sort((a, b) => {
      const da = a.fecha_traslado?.startsWith('1900') ? '0000-00-00' : (a.fecha_traslado ?? '');
      const db = b.fecha_traslado?.startsWith('1900') ? '0000-00-00' : (b.fecha_traslado ?? '');
      if (da !== db) return da.localeCompare(db);
      if (a.tipo === 'deposito' && b.tipo !== 'deposito') return 1;
      if (b.tipo === 'deposito' && a.tipo !== 'deposito') return -1;
      return 0;
    });
    let running = 0;
    const map = new Map<string, { before: number; after: number }>();
    for (const v of sorted) {
      const before = running;
      if (v.tipo === 'deposito') running -= Number(v.monto);
      else running += Number(v.monto);
      map.set(v.id, { before, after: running });
    }
    return map;
  }, [viajes, hasFilters]);

  const openFacturas = async () => {
    setShowFacturas(true);
    setLoadingFacturas(true);
    const res = await fetch('/api/viajes?estado=pendiente');
    const data = await res.json();
    setFacturasViajes((Array.isArray(data) ? data : []).filter((v: Viaje) => v.tipo === 'viaje'));
    setLoadingFacturas(false);
  };

  const copyFacturas = async () => {
    const text = facturasViajes.map(formatFactura).join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openForm = (tipo: TipoRegistro) => {
    setNewTipo(tipo);
    setEditViaje(undefined);
    setShowForm(true);
  };

  const handleSave = async (data: ViajeInsert) => {
    let res: Response;
    if (editViaje) {
      res = await fetch(`/api/viajes/${editViaje.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
    } else {
      res = await fetch('/api/viajes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(err.error ?? 'Error al guardar');
    }
    toast.success(editViaje ? 'Registro actualizado' : 'Registro guardado');
    setEditViaje(undefined);
    await fetchViajes();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { id } = confirmDelete;
    setConfirmDelete(null);
    setDeletingId(id);
    await new Promise(r => setTimeout(r, 300));
    const res = await fetch(`/api/viajes/${id}`, { method: 'DELETE' });
    setDeletingId(null);
    if (res.ok) { toast.success('Registro eliminado'); await fetchViajes(); }
    else toast.error('No se pudo eliminar');
  };

  const handleToggle = async (id: string, valor: EstadoDetraccion) => {
    setToggling(id);
    const res = await fetch(`/api/viajes/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ detraccion: valor }),
    });
    if (res.ok) { toast.success(`Detracción: ${valor}`); await fetchViajes(); }
    else toast.error('No se pudo actualizar');
    setToggling(null);
  };

  const viajesReales  = viajes.filter((v) => v.tipo === 'viaje');
  const montoFletes   = viajesReales.reduce((s, v) => s + Number(v.monto), 0);
  const detPendientes = viajesReales.filter((v) => v.detraccion === 'pendiente').length;

  const fmt = (d: string) => {
    if (!d || d.startsWith('1900')) return '—';
    try { return format(new Date(d + 'T12:00:00'), 'dd MMM yy', { locale: es }); }
    catch { return d; }
  };

  return (
    <div className="space-y-6 pb-16">

      {/* Header */}
      <div className="flex items-end justify-between gap-4 pt-2 flex-wrap">
        <div>
          <p className="eyebrow mb-2">Registros</p>
          <h1 className="text-4xl" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>Viajes</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openFacturas} className="btn-outline" style={{ gap: 6 }}>
            <ClipboardList size={14} />
            Facturas pendientes
          </button>
          <button onClick={() => openForm('deposito')} className="btn-outline" style={{ gap: 6 }}>
            <ArrowDownCircle size={14} />
            Depósito
          </button>
          <button onClick={() => openForm('viaje')} className="btn-ink">
            <Plus size={15} />
            Nuevo registro
          </button>
        </div>
      </div>

      {/* KPIs */}
      {viajes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <KpiCard eyebrow="Viajes" value={String(viajesReales.length)} sub="registrados" />
          <KpiCard
            eyebrow="Monto fletes"
            value={`S/ ${montoFletes.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
            sub="acumulado"
          />
          <KpiCard
            eyebrow="Detracciones"
            value={String(detPendientes)}
            sub={detPendientes > 0 ? 'pendientes de pago' : 'al día ✓'}
            warning={detPendientes > 0}
          />
        </div>
      )}

      {/* Filtros */}
      <FiltroBarra filtros={filtros} meses={meses} onChange={setFiltros} />


      {/* ── Tabla desktop ───────────────────────────────────── */}
      <div className="hidden sm:block card-stadium">
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <table className="w-full"><tbody>{Array.from({length:4}).map((_,i)=><SkeletonRow key={i}/>)}</tbody></table>
          ) : viajes.length === 0 ? (
            <div className="py-24 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'var(--canvas)' }}>
                <Plus size={24} style={{ color: 'var(--slate)' }} />
              </div>
              <p style={{ color: 'var(--slate)', fontWeight: 450 }}>Sin registros. Agrega el primero.</p>
            </div>
          ) : (
            <table className="w-full text-sm" style={{ minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(20,20,19,.08)', background: 'var(--canvas-lifted)' }}>
                  {['F. Carga','F. Traslado','Descripción','N° Guía','Estado','N° Factura','Detracción','Monto (S/)','Docs',''].map((h) => (
                    <th key={h} className="text-left px-4 py-3.5 eyebrow"
                      style={{ fontWeight: 700, letterSpacing: '0.04em', fontSize: 11, whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {viajes.map((v, idx) => {
                  const isDeposito = v.tipo === 'deposito';
                  const isSaldo = v.tipo === 'saldo_anterior';
                  const rowBg = isDeposito ? '#F0FFF4' : isSaldo ? '#FFF8F0' : undefined;
                  const hoverBg = isDeposito ? '#E0FFF0' : isSaldo ? '#FFF0E0' : 'var(--canvas-lifted)';
                  const isDeleting = deletingId === v.id;
                  return (
                    <>
                      <tr key={v.id}
                        className={`transition-colors duration-100 ${isDeleting ? 'anim-fade-out' : 'anim-fade-up'}`}
                        style={{
                          borderBottom: idx < viajes.length - 1 ? '1px solid rgba(20,20,19,.06)' : 'none',
                          background: rowBg,
                          animationDelay: isDeleting ? '0ms' : `${idx * 25}ms`,
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = hoverBg}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = rowBg ?? ''}
                      >
                        <td className="px-4 py-3.5">
                          <span className="text-xs" style={{ color: 'var(--slate)', display: 'block', lineHeight: 1.2 }}>
                            {fmt(v.fecha_carga)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span style={{
                            display: 'inline-block',
                            fontWeight: 600,
                            fontSize: 12,
                            letterSpacing: '-0.01em',
                            color: 'var(--ink)',
                            background: 'rgba(20,20,19,.06)',
                            borderRadius: 6,
                            padding: '2px 7px',
                          }}>
                            {fmt(v.fecha_traslado)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {isDeposito ? (
                            <span className="flex items-center gap-2">
                              <span className="badge-pill text-xs" style={{ background: '#DCFCE7', color: '#14532D', fontSize: 11 }}>
                                Depósito
                              </span>
                              <span style={{ color: 'var(--slate)', fontSize: 12 }}>{v.descripcion !== 'Depósito recibido' ? v.descripcion : ''}</span>
                            </span>
                          ) : isSaldo ? (
                            <span className="flex items-center gap-2">
                              <span className="badge-pill text-xs" style={{ background: '#FFF0CC', color: '#92400E', fontSize: 11 }}>
                                Saldo anterior
                              </span>
                              <span style={{ color: 'var(--slate)', fontSize: 12 }}>{v.mes}</span>
                            </span>
                          ) : (
                            <span style={{ fontWeight: 450, color: 'var(--ink)' }}>{v.descripcion}</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5" style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--slate)' }}>
                          {(isDeposito || isSaldo) ? '—' : (v.numero_guia || '—')}
                        </td>
                        <td className="px-4 py-3.5">
                          {(isDeposito || isSaldo) ? '—' : <BadgeEstado estado={v.estado} />}
                        </td>
                        <td className="px-4 py-3.5" style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--slate)' }}>
                          {(isDeposito || isSaldo) ? '—' : (v.numero_factura || '—')}
                        </td>
                        <td className="px-4 py-3.5">
                          {(isDeposito || isSaldo) ? '—' : (
                            <ToggleDetraccion detraccion={v.detraccion} viajeId={v.id}
                              descripcion={v.descripcion} onToggle={handleToggle} loading={toggling === v.id} />
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span style={{
                            fontWeight: 600, letterSpacing: '-0.01em',
                            color: isDeposito ? '#16A34A' : 'var(--ink)',
                          }}>
                            {isDeposito ? '+' : ''}{Number(v.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {!isDeposito && !isSaldo && (
                            <button
                              onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 transition-all duration-100"
                              style={{
                                borderRadius: 'var(--r-pill)',
                                border: '1px solid rgba(20,20,19,.15)',
                                background: expandedId === v.id ? 'var(--ink)' : 'transparent',
                                color: expandedId === v.id ? 'var(--canvas)' : 'var(--slate)',
                                fontSize: 11,
                              }}
                            >
                              <Paperclip size={11} />
                              {expandedId === v.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditViaje(v); setShowForm(true); }}
                              className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-100"
                              style={{ color: 'var(--slate)', border: '1px solid transparent' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(20,20,19,.2)'; (e.currentTarget as HTMLElement).style.color = 'var(--ink)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--slate)'; }}
                            >
                              <Pencil size={12} />
                            </button>
                            <button onClick={() => setConfirmDelete({ id: v.id, label: v.descripcion || v.mes || 'este registro' })}
                              className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-100"
                              style={{ color: 'var(--slate)', border: '1px solid transparent' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(207,69,0,.3)'; (e.currentTarget as HTMLElement).style.color = 'var(--signal)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--slate)'; }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isDeposito && !hasFilters && ledgerMap.get(v.id) && (() => {
                        const lp = ledgerMap.get(v.id)!;
                        return (
                          <tr key={`${v.id}-ctx`} style={{ background: '#E8FFF0' }}>
                            <td colSpan={10} style={{ padding: '0 16px 10px 108px', fontSize: 11, color: '#166534' }}>
                              Nos debían <strong>{fmtMoney(lp.before)}</strong>
                              {' · depositaron '}<strong>{fmtMoney(Number(v.monto))}</strong>
                              {' → '}
                              {lp.after > 0
                                ? <>quedan <strong>{fmtMoney(lp.after)}</strong></>
                                : <strong>sin deuda ✓</strong>}
                            </td>
                          </tr>
                        );
                      })()}
                      {expandedId === v.id && (
                        <tr key={`${v.id}-docs`}>
                          <td colSpan={10} className="px-8 py-4"
                            style={{ background: 'var(--canvas)', borderBottom: '1px solid rgba(20,20,19,.06)' }}>
                            <ArchivosDrive viaje={v} onUpdated={fetchViajes} />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Cards mobile ──────────────────────────────────── */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          Array.from({length:3}).map((_,i) => (
            <div key={i} className="p-5 space-y-3 rounded-3xl" style={{ background: 'var(--white)', boxShadow: 'var(--shadow-card)' }}>
              <div className="skeleton" style={{ height: 16, width: '60%' }} />
              <div className="skeleton" style={{ height: 14, width: '40%' }} />
              <div className="skeleton" style={{ height: 14, width: '50%' }} />
            </div>
          ))
        ) : viajes.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <p style={{ color: 'var(--slate)', fontWeight: 450 }}>Sin registros</p>
          </div>
        ) : (
          viajes.map((v, idx) => {
            const isDeposito = v.tipo === 'deposito';
            const isSaldo = v.tipo === 'saldo_anterior';
            return (
              <div key={v.id}
                className={`p-5 space-y-4 ${deletingId === v.id ? 'anim-fade-out' : 'anim-fade-up'}`}
                style={{
                  background: isDeposito ? '#F0FFF4' : isSaldo ? '#FFF8F0' : 'var(--white)',
                  borderRadius: '28px',
                  boxShadow: 'var(--shadow-card)',
                  animationDelay: deletingId === v.id ? '0ms' : `${idx * 40}ms`,
                }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {isDeposito ? (
                      <>
                        <span className="badge-pill text-xs" style={{ background: '#DCFCE7', color: '#14532D', fontSize: 11 }}>
                          Depósito recibido
                        </span>
                        <p className="text-xs mt-1" style={{ color: 'var(--slate)' }}>{fmt(v.fecha_traslado)}</p>
                        {!hasFilters && ledgerMap.get(v.id) && (() => {
                          const lp = ledgerMap.get(v.id)!;
                          return (
                            <p className="text-xs mt-1" style={{ color: '#166534', fontWeight: 450 }}>
                              Debían <strong style={{ fontWeight: 600 }}>{fmtMoney(lp.before)}</strong>
                              {' → '}
                              {lp.after > 0
                                ? <>quedan <strong style={{ fontWeight: 600 }}>{fmtMoney(lp.after)}</strong></>
                                : <strong style={{ fontWeight: 600 }}>sin deuda ✓</strong>}
                            </p>
                          );
                        })()}
                      </>
                    ) : isSaldo ? (
                      <p className="font-semibold text-sm" style={{ color: '#92400E', letterSpacing: '-0.01em' }}>
                        Saldo anterior — {v.mes}
                      </p>
                    ) : (
                      <>
                        <p className="font-medium text-sm truncate" style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}>{v.descripcion}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--slate)' }}>
                          {fmt(v.fecha_carga)} → {fmt(v.fecha_traslado)}
                        </p>
                      </>
                    )}
                  </div>
                  <span className="ml-3 shrink-0 font-semibold text-base" style={{
                    color: isDeposito ? '#16A34A' : 'var(--ink)', letterSpacing: '-0.02em',
                  }}>
                    {isDeposito ? '+' : ''}S/ {Number(v.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {!isDeposito && !isSaldo && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <BadgeEstado estado={v.estado} />
                      <ToggleDetraccion detraccion={v.detraccion} viajeId={v.id}
                        onToggle={handleToggle} loading={toggling === v.id} />
                    </div>
                    {(v.numero_guia || v.numero_factura) && (
                      <div className="text-xs space-y-0.5" style={{ color: 'var(--slate)' }}>
                        {v.numero_guia && <p>Guía: <span style={{ fontFamily: 'monospace', color: 'var(--ink)' }}>{v.numero_guia}</span></p>}
                        {v.numero_factura && <p>Factura: <span style={{ fontFamily: 'monospace', color: 'var(--ink)' }}>{v.numero_factura}</span></p>}
                      </div>
                    )}
                    <div style={{ borderTop: '1px solid rgba(20,20,19,.08)', paddingTop: 12 }}>
                      <ArchivosDrive viaje={v} onUpdated={fetchViajes} />
                    </div>
                  </>
                )}

                <div className="flex gap-2">
                  <button onClick={() => { setEditViaje(v); setShowForm(true); }}
                    className="btn-outline flex-1" style={{ fontSize: 13, padding: '8px 16px' }}>
                    <Pencil size={12} /> Editar
                  </button>
                  <button onClick={() => setConfirmDelete({ id: v.id, label: v.descripcion || v.mes || 'este registro' })}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 transition-opacity hover:opacity-70"
                    style={{
                      borderRadius: 'var(--r-btn)', border: '1.5px solid rgba(207,69,0,.4)',
                      color: 'var(--signal)', fontWeight: 450, fontSize: 13, background: 'transparent',
                    }}>
                    <Trash2 size={12} /> Eliminar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar registro"
          message={`¿Seguro que deseas eliminar "${confirmDelete.label}"? Esta acción no se puede deshacer.`}
          confirmLabel="Sí, eliminar"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {showForm && (
        <ViajeForm
          viaje={editViaje}
          initialTipo={editViaje ? editViaje.tipo : newTipo}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditViaje(undefined); }}
        />
      )}

      {showFacturas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(14,14,13,.72)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowFacturas(false); }}>
          <div className="w-full max-w-2xl flex flex-col rounded-[32px] overflow-hidden"
            style={{ background: 'var(--white)', boxShadow: '0 24px 64px rgba(0,0,0,.22)', maxHeight: '80vh' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
              <div>
                <p className="eyebrow mb-1">Para el contador</p>
                <h2 style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.025em' }}>Facturas pendientes</h2>
              </div>
              <button onClick={() => setShowFacturas(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                style={{ background: 'var(--canvas)', color: 'var(--slate)' }}>
                <X size={14} />
              </button>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-3">
              {loadingFacturas ? (
                <div className="space-y-2 py-4">
                  {[1,2,3].map(i => <div key={i} className="skeleton rounded-2xl" style={{ height: 72 }} />)}
                </div>
              ) : facturasViajes.length === 0 ? (
                <p className="text-sm py-8 text-center" style={{ color: 'var(--slate)' }}>
                  Sin viajes pendientes de facturación
                </p>
              ) : (
                facturasViajes.map(v => (
                  <div key={v.id} className="p-4 rounded-2xl text-sm leading-relaxed"
                    style={{ background: 'var(--canvas)', color: 'var(--ink)', fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {formatFactura(v)}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {!loadingFacturas && facturasViajes.length > 0 && (
              <div className="px-6 py-4 shrink-0" style={{ borderTop: '1px solid rgba(20,20,19,.08)' }}>
                <button onClick={copyFacturas} className="btn-ink w-full justify-center" style={{ gap: 8 }}>
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? '¡Copiado!' : `Copiar todo (${facturasViajes.length} factura${facturasViajes.length !== 1 ? 's' : ''})`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
