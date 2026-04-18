'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Paperclip, AlertCircle, ArrowDownCircle } from 'lucide-react';
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
  const detPendientes = viajesReales.filter((v) => v.estado === 'facturado' && v.detraccion === 'pendiente').length;

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

      {/* Alerta detracciones */}
      {!loading && detPendientes > 0 && (
        <div className="flex items-center gap-3 px-5 py-3.5 text-sm anim-fade-in" style={{
          borderRadius: 'var(--r-btn)', background: '#FFF8F5',
          border: '1px solid rgba(207,69,0,.25)',
        }}>
          <AlertCircle size={15} style={{ color: 'var(--signal)', flexShrink: 0 }} />
          <p style={{ color: '#7A2800', fontWeight: 450 }}>
            <strong style={{ fontWeight: 600 }}>{detPendientes}</strong>{' '}
            detracción{detPendientes !== 1 ? 'es' : ''} pendiente{detPendientes !== 1 ? 's' : ''} de pago a SUNAT.
          </p>
        </div>
      )}

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
                        <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--slate)', fontWeight: 450 }}>
                          {fmt(v.fecha_carga)}
                        </td>
                        <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--charcoal)', fontWeight: 500 }}>
                          {fmt(v.fecha_traslado)}
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
                              onToggle={handleToggle} loading={toggling === v.id} />
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
    </div>
  );
}
