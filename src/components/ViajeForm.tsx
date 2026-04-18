'use client';

import { useState } from 'react';
import { Viaje, ViajeInsert, TipoRegistro } from '@/types';
import { X, Truck, Wallet, AlertCircle, ArrowDownCircle } from 'lucide-react';

interface Props {
  viaje?: Viaje;
  initialTipo?: TipoRegistro;
  onSave: (data: ViajeInsert) => Promise<void>;
  onClose: () => void;
}

const getInitial = (tipo: TipoRegistro): ViajeInsert => ({
  tipo,
  fecha_carga: '', fecha_traslado: '', mes: '',
  descripcion: tipo === 'deposito' ? 'Depósito recibido' : tipo === 'saldo_anterior' ? '' : 'Lima - Huancayo',
  numero_guia: '', estado: 'pendiente',
  numero_factura: '', detraccion: 'pendiente', monto: 0,
  drive_id_guia: null, drive_id_factura: null,
});

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

export default function ViajeForm({ viaje, initialTipo = 'viaje', onSave, onClose }: Props) {
  const [form, setForm] = useState<ViajeInsert>(
    viaje ? {
      tipo: viaje.tipo,
      fecha_carga:    viaje.fecha_carga?.startsWith('1900') ? '' : viaje.fecha_carga,
      fecha_traslado: viaje.fecha_traslado?.startsWith('1900') ? '' : viaje.fecha_traslado,
      mes: viaje.mes, descripcion: viaje.descripcion,
      numero_guia: viaje.numero_guia ?? '', estado: viaje.estado,
      numero_factura: viaje.numero_factura ?? '', detraccion: viaje.detraccion,
      monto: viaje.monto, drive_id_guia: viaje.drive_id_guia, drive_id_factura: viaje.drive_id_factura,
    } : getInitial(initialTipo)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (f: keyof ViajeInsert, v: unknown) => setForm(p => ({ ...p, [f]: v }));

  const isSaldo    = form.tipo === 'saldo_anterior';
  const isDeposito = form.tipo === 'deposito';
  const isViaje    = form.tipo === 'viaje';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (isSaldo   && (!form.mes || !form.monto))           { setError('Ingresa el mes y el monto.'); return; }
    if (isDeposito && (!form.fecha_traslado || !form.monto)) { setError('Ingresa la fecha y el monto.'); return; }
    if (isViaje   && (!form.fecha_carga || !form.fecha_traslado || !form.monto)) {
      setError('Completa los campos obligatorios.'); return;
    }
    setLoading(true);
    try { await onSave(form); onClose(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error al guardar.'); }
    finally { setLoading(false); }
  };

  const tipoLabel = isDeposito ? 'Depósito' : isSaldo ? 'Saldo anterior' : 'Viaje';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 anim-fade-in"
      style={{ background: 'rgba(14,14,13,.72)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto anim-scale-in"
        style={{
          background: 'var(--white)',
          borderRadius: 'var(--r-hero)',
          boxShadow: '0 32px 80px rgba(0,0,0,.32), 0 0 0 1px rgba(20,20,19,.1)',
        }}
      >
        {/* Accent bar */}
        <div style={{
          height: 4,
          background: isDeposito
            ? 'linear-gradient(90deg, #16A34A 0%, #4ADE80 100%)'
            : 'linear-gradient(90deg, var(--ink) 0%, var(--signal-light) 100%)',
          borderRadius: '40px 40px 0 0',
        }} />

        {/* Header */}
        <div
          className="flex items-center justify-between px-7 py-5"
          style={{ borderBottom: '1px solid rgba(20,20,19,.07)', background: 'var(--canvas)' }}
        >
          <div>
            <p className="eyebrow mb-1">{viaje ? 'Modificar registro' : 'Nuevo registro'}</p>
            <h2 className="text-xl" style={{ fontWeight: 600, letterSpacing: '-0.025em' }}>
              {viaje ? `Editar ${tipoLabel.toLowerCase()}` : tipoLabel}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150"
            style={{ color: 'var(--slate)', background: 'rgba(20,20,19,.06)', border: 'none' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(20,20,19,.12)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(20,20,19,.06)'}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-7 py-6 space-y-5">

          {/* Tipo toggle — solo al crear */}
          {!viaje && (
            <div className="flex gap-1.5 p-1.5" style={{
              background: 'var(--canvas)',
              borderRadius: 'calc(var(--r-hero) - 4px)',
              border: '1px solid rgba(20,20,19,.08)',
            }}>
              {([
                { value: 'viaje',          label: 'Viaje',    icon: Truck            },
                { value: 'deposito',       label: 'Depósito', icon: ArrowDownCircle  },
                { value: 'saldo_anterior', label: 'Saldo',    icon: Wallet           },
              ] as const).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm(getInitial(value))}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm transition-all duration-150"
                  style={{
                    borderRadius: 'calc(var(--r-hero) - 10px)',
                    background: form.tipo === value ? (value === 'deposito' ? '#16A34A' : 'var(--ink)') : 'transparent',
                    color: form.tipo === value ? 'var(--white)' : 'var(--slate)',
                    fontWeight: form.tipo === value ? 600 : 450,
                    letterSpacing: '-0.01em',
                    boxShadow: form.tipo === value ? '0 2px 8px rgba(0,0,0,.18)' : 'none',
                    fontSize: 13,
                  }}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* ── Depósito ──────────────────────────────── */}
          {isDeposito && (
            <>
              <div className="flex items-start gap-3 px-4 py-3" style={{
                borderRadius: 'var(--r-btn)', background: '#F0FFF4',
                border: '1px solid rgba(22,163,74,.25)',
              }}>
                <ArrowDownCircle size={15} style={{ marginTop: 1, flexShrink: 0, color: '#16A34A' }} />
                <p className="text-xs" style={{ color: '#14532D', fontWeight: 450, lineHeight: 1.5 }}>
                  Registra un pago recibido del cliente.
                </p>
              </div>

              <div>
                <label className="eyebrow block mb-2">Fecha de depósito *</label>
                <input type="date" required value={form.fecha_traslado}
                  onChange={e => set('fecha_traslado', e.target.value)} className="input-field" />
              </div>

              <div>
                <label className="eyebrow block mb-2">Descripción</label>
                <input type="text" value={form.descripcion} placeholder="Depósito FART enero"
                  onChange={e => set('descripcion', e.target.value)} className="input-field" />
              </div>

              <div>
                <label className="eyebrow block mb-2">Monto (S/) *</label>
                <div className="flex items-center input-field" style={{ padding: 0, overflow: 'hidden' }}>
                  <span className="px-4 text-sm font-semibold shrink-0" style={{ color: 'var(--slate)' }}>S/</span>
                  <input
                    type="number" required min="0" step="0.01"
                    value={form.monto || ''} placeholder="0.00"
                    onChange={e => set('monto', parseFloat(e.target.value) || 0)}
                    style={{
                      flex: 1, padding: '10px 16px 10px 0', background: 'transparent',
                      border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 14,
                      color: 'var(--ink)', fontWeight: 450,
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {/* ── Saldo anterior ───────────────────────── */}
          {isSaldo && (
            <>
              <div className="flex items-start gap-3 px-4 py-3" style={{
                borderRadius: 'var(--r-btn)', background: '#FFF8F0',
                border: '1px solid rgba(207,69,0,.2)',
              }}>
                <AlertCircle size={15} style={{ marginTop: 1, flexShrink: 0, color: 'var(--signal)' }} />
                <p className="text-xs" style={{ color: '#7A2800', fontWeight: 450, lineHeight: 1.5 }}>
                  Registra el monto que te debían antes del primer viaje del período.
                </p>
              </div>

              <div>
                <label className="eyebrow block mb-2">Mes *</label>
                <div className="grid grid-cols-2 gap-2">
                  <select required
                    value={form.mes?.split(' ')[0] ?? ''}
                    onChange={e => { const y = form.mes?.split(' ')[1] ?? new Date().getFullYear().toString(); set('mes', `${e.target.value} ${y}`); }}
                    className="input-field"
                  >
                    <option value="">Mes</option>
                    {MESES.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
                  </select>
                  <select required
                    value={form.mes?.split(' ')[1] ?? ''}
                    onChange={e => { const m = form.mes?.split(' ')[0] ?? ''; set('mes', `${m} ${e.target.value}`); }}
                    className="input-field"
                  >
                    <option value="">Año</option>
                    {Array.from({length:5},(_,i)=>new Date().getFullYear()-2+i).map(y=><option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="eyebrow block mb-2">Monto (S/) *</label>
                <div className="flex items-center input-field" style={{ padding: 0, overflow: 'hidden' }}>
                  <span className="px-4 text-sm font-semibold shrink-0" style={{ color: 'var(--slate)' }}>S/</span>
                  <input
                    type="number" required min="0" step="0.01"
                    value={form.monto || ''} placeholder="0.00"
                    onChange={e => set('monto', parseFloat(e.target.value) || 0)}
                    style={{
                      flex: 1, padding: '10px 16px 10px 0', background: 'transparent',
                      border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 14,
                      color: 'var(--ink)', fontWeight: 450,
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {/* ── Viaje normal ─────────────────────────── */}
          {isViaje && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="eyebrow block mb-2">F. Carga *</label>
                  <input type="date" required value={form.fecha_carga}
                    onChange={e => set('fecha_carga', e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="eyebrow block mb-2">F. Traslado *</label>
                  <input type="date" required value={form.fecha_traslado}
                    onChange={e => set('fecha_traslado', e.target.value)} className="input-field" />
                </div>
              </div>

              <div>
                <label className="eyebrow block mb-2">Descripción</label>
                <input type="text" value={form.descripcion} placeholder="Lima - Huancayo"
                  onChange={e => set('descripcion', e.target.value)} className="input-field" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="eyebrow block mb-2">N° Guía</label>
                  <input type="text" value={form.numero_guia ?? ''} placeholder="EG03-00000"
                    onChange={e => set('numero_guia', e.target.value)}
                    className="input-field" style={{ fontFamily: 'monospace' }} />
                </div>
                <div>
                  <label className="eyebrow block mb-2">N° Factura</label>
                  <input type="text" value={form.numero_factura ?? ''} placeholder="E001-0000"
                    onChange={e => set('numero_factura', e.target.value)}
                    className="input-field" style={{ fontFamily: 'monospace' }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="eyebrow block mb-2">Estado factura</label>
                  <select value={form.estado} onChange={e => set('estado', e.target.value)} className="input-field">
                    <option value="pendiente">Pendiente</option>
                    <option value="facturado">Facturado</option>
                  </select>
                </div>
                <div>
                  <label className="eyebrow block mb-2">Detracción</label>
                  <select value={form.detraccion} onChange={e => set('detraccion', e.target.value)} className="input-field">
                    <option value="pendiente">Pendiente</option>
                    <option value="realizado">Realizado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="eyebrow block mb-2">Monto flete (S/) *</label>
                <div className="flex items-center input-field" style={{ padding: 0, overflow: 'hidden' }}>
                  <span className="px-4 text-sm font-semibold shrink-0" style={{ color: 'var(--slate)' }}>S/</span>
                  <input
                    type="number" required min="0" step="0.01"
                    value={form.monto || ''} placeholder="0.00"
                    onChange={e => set('monto', parseFloat(e.target.value) || 0)}
                    style={{
                      flex: 1, padding: '10px 16px 10px 0', background: 'transparent',
                      border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 14,
                      color: 'var(--ink)', fontWeight: 450,
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 px-4 py-3" style={{
              borderRadius: 'var(--r-btn)', background: '#FFF5F5',
              border: '1px solid rgba(207,69,0,.35)',
            }}>
              <AlertCircle size={15} style={{ marginTop: 1, flexShrink: 0, color: 'var(--signal)' }} />
              <p className="text-xs" style={{ color: 'var(--signal)', fontWeight: 500 }}>{error}</p>
            </div>
          )}

          <div style={{ height: 1, background: 'rgba(20,20,19,.07)' }} />

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-ink flex-1"
              style={isDeposito ? { background: '#16A34A', borderColor: '#16A34A' } : {}}>
              {loading ? 'Guardando…' : viaje ? 'Guardar cambios' : `Crear ${tipoLabel.toLowerCase()}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
