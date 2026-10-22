'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Viaje, ViajeInsert, TipoRegistro, Cadena } from '@/types';
import { CADENAS, cadenaDe } from '@/lib/cadenas';
import { X, Truck, Wallet, AlertCircle, ArrowDownCircle } from 'lucide-react';

import FechaPicker from './FechaPicker';
import MontoInput from './MontoInput';
import EstadoControl from './EstadoControl';
import CadenaLabel from './CadenaLabel';
import styles from './ViajeForm.module.css';

interface Props {
  viaje?: Viaje;
  initialTipo?: TipoRegistro;
  initialCadena?: Cadena;
  onSave: (data: ViajeInsert) => Promise<void>;
  onClose: () => void;
}

const getInitial = (tipo: TipoRegistro, cadena: Cadena | null = null): ViajeInsert => ({
  tipo,
  cadena,
  fecha_carga: '', fecha_traslado: '', mes: '',
  descripcion: tipo === 'deposito' ? 'Depósito recibido' : tipo === 'saldo_anterior' ? '' : 'Lima - Huancayo',
  numero_guia: '', estado: 'pendiente',
  numero_factura: '', detraccion: 'pendiente', monto: 0,
  drive_id_guia: null, drive_id_factura: null, drive_id_detraccion: null,
});

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

export default function ViajeForm({ viaje, initialTipo = 'viaje', initialCadena, onSave, onClose }: Props) {
  const [form, setForm] = useState<ViajeInsert>(
    viaje ? {
      tipo: viaje.tipo,
      cadena: cadenaDe(viaje),
      fecha_carga:    viaje.fecha_carga?.startsWith('1900') ? '' : viaje.fecha_carga,
      fecha_traslado: viaje.fecha_traslado?.startsWith('1900') ? '' : viaje.fecha_traslado,
      mes: viaje.mes, descripcion: viaje.descripcion,
      numero_guia: viaje.numero_guia ?? '', estado: viaje.estado,
      numero_factura: viaje.numero_factura ?? '', detraccion: viaje.detraccion,
      monto: viaje.monto, drive_id_guia: viaje.drive_id_guia, drive_id_factura: viaje.drive_id_factura, drive_id_detraccion: viaje.drive_id_detraccion ?? null,
    } : getInitial(initialTipo, initialCadena)
  );
  const id = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const inicioEnFondo = useRef(false);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = overflow; previous?.focus({ preventScroll: true }); };
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (f: keyof ViajeInsert, v: unknown) => setForm(p => ({ ...p, [f]: v }));

  const isSaldo    = form.tipo === 'saldo_anterior';
  const isDeposito = form.tipo === 'deposito';
  const isViaje    = form.tipo === 'viaje';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (isViaje && !form.cadena) { setError('Selecciona la cadena de la carga: Ripley u Oechsle.'); return; }
    if (isSaldo   && (!form.mes || !form.monto))           { setError('Ingresa el mes y el monto.'); return; }
    if (isDeposito && (!form.fecha_traslado || !form.monto)) { setError('Ingresa la fecha y el monto.'); return; }
    if (isViaje   && (!form.fecha_carga || !form.fecha_traslado || !form.monto)) {
      setError('Completa los campos obligatorios.'); return;
    }
    if (!Number.isFinite(form.monto) || form.monto <= 0) { setError('Ingresa un monto mayor a cero.'); return; }
    setLoading(true);
    try { await onSave(form); onClose(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error al guardar.'); }
    finally { setLoading(false); }
  };

  const tipoLabel = isDeposito ? 'Depósito' : isSaldo ? 'Saldo anterior' : 'Viaje';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center anim-fade-in ${styles.overlay}`}
      style={{ background: 'rgba(14,14,13,.72)' }}
      onPointerDownCapture={e => { inicioEnFondo.current = e.target === e.currentTarget; }}
      onPointerCancel={() => { inicioEnFondo.current = false; }}
      onClick={e => {
        if (inicioEnFondo.current && e.target === e.currentTarget && !loading) onClose();
        inicioEnFondo.current = false;
      }}
      onKeyDown={e => {
        if ((e.target as HTMLElement).closest('[data-date-picker-panel]')) return;
        if (e.key === 'Escape' && !loading) { e.preventDefault(); onClose(); }
        if (e.key === 'Tab') {
          const elements = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not([type="radio"]):not(:disabled), input[type="radio"]:checked, select:not(:disabled), textarea:not(:disabled)') ?? [])].filter(el => el.offsetParent !== null);
          const first = elements[0]; const last = elements.at(-1);
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
        }
      }}
    >
      <div
        ref={dialog} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-busy={loading}
        className={`anim-scale-in ${styles.dialog}`}
        data-cadena={form.cadena ?? 'general'}
        style={{
          borderRadius: 'var(--r-hero)',
        }}
      >
        {/* Accent bar */}
        <div className={styles.accent} style={{
          height: 4,
          background: form.cadena ? 'var(--brand-accent)' : isDeposito
            ? 'linear-gradient(90deg, #16A34A 0%, #4ADE80 100%)'
            : 'linear-gradient(90deg, var(--ink) 0%, var(--signal-light) 100%)',
          borderRadius: '40px 40px 0 0',
        }} />

        {/* Header */}
        <div
          className={`flex items-center justify-between gap-3 px-7 py-5 ${styles.header}`}
        >
          <div>
            <p className="eyebrow mb-1">{viaje ? 'Modificar registro' : 'Nuevo registro'}</p>
            <div className={styles.titleRow}>
              <h2 id={`${id}-title`} className="text-xl" style={{ fontWeight: 600, letterSpacing: '-0.025em' }}>
                {viaje ? `Editar ${tipoLabel.toLowerCase()}` : tipoLabel}
              </h2>
              {form.cadena && <span key={form.cadena} className={styles.brandBadge}><CadenaLabel cadena={form.cadena} /></span>}
            </div>
          </div>
          <button
            type="button" aria-label="Cerrar formulario" disabled={loading} onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150"
            style={{ color: 'var(--slate)', background: 'rgba(20,20,19,.06)', border: 'none' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(20,20,19,.12)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(20,20,19,.06)'}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={`space-y-5 ${styles.body}`}>

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
                  disabled={loading}
                  onClick={() => { if (form.tipo !== value) { setForm(getInitial(value, form.cadena)); setError(''); } }}
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
          <fieldset>
            <legend className="block text-sm font-semibold mb-2">
              {isViaje ? 'Cadena de la carga *' : isDeposito ? 'Aplicar el depósito a' : 'Cuenta del saldo anterior'}
            </legend>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Cadena">
              {[...CADENAS, ...(!isViaje ? [{ value: null, label: 'General FART' }] : [])].map(item => (
                <button key={item.value ?? 'general'} type="button" aria-pressed={form.cadena === item.value}
                  disabled={loading}
                  onClick={() => set('cadena', item.value)} className={styles.chainOption}>
                  {item.value ? <CadenaLabel cadena={item.value} /> : item.label}
                </button>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--slate)', lineHeight: 1.5 }}>
              {isViaje ? 'FART te contrata y paga el flete. La cadena identifica de quién es la carga.'
                : 'Usa General FART si el monto no corresponde a una cadena específica. Solo descontará del total de FART.'}
            </p>
          </fieldset>

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
                <label htmlFor={`${id}-deposito`} className="eyebrow block mb-2">Fecha de depósito *</label>
                <FechaPicker id={`${id}-deposito`} label="Fecha de depósito" value={form.fecha_traslado} onChange={value => set('fecha_traslado', value)} />
              </div>

              <div>
                <label htmlFor={`${id}-descripcion`} className="eyebrow block mb-2">Descripción</label>
                <input id={`${id}-descripcion`} type="text" value={form.descripcion} placeholder="Depósito FART enero"
                  onChange={e => set('descripcion', e.target.value)} className="input-field" />
              </div>

              <div>
                <label htmlFor={`${id}-monto`} className="eyebrow block mb-2">Monto (S/) *</label>
                <MontoInput key={form.tipo} id={`${id}-monto`} value={form.monto} onChange={value => set('monto', value)} />
                <p id={`${id}-monto-ayuda`} className={styles.amountHint}>Soles · ejemplo: 1,234.50</p>
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
                  <select required aria-label="Mes del saldo anterior"
                    value={form.mes?.split(' ')[0] ?? ''}
                    onChange={e => { const y = form.mes?.split(' ')[1] ?? new Date().getFullYear().toString(); set('mes', `${e.target.value} ${y}`); }}
                    className="input-field"
                  >
                    <option value="">Mes</option>
                    {MESES.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
                  </select>
                  <select required aria-label="Año del saldo anterior"
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
                <label htmlFor={`${id}-monto`} className="eyebrow block mb-2">Monto (S/) *</label>
                <MontoInput key={form.tipo} id={`${id}-monto`} value={form.monto} onChange={value => set('monto', value)} />
                <p id={`${id}-monto-ayuda`} className={styles.amountHint}>Soles · ejemplo: 1,234.50</p>
              </div>
            </>
          )}

          {/* ── Viaje normal ─────────────────────────── */}
          {isViaje && (
            <>
              <div className={styles.columns}>
                <div>
                  <label htmlFor={`${id}-fecha_carga`} className="eyebrow block mb-2">F. Carga *</label>
                  <FechaPicker id={`${id}-fecha_carga`} label="Fecha de carga" value={form.fecha_carga} onChange={value => set('fecha_carga', value)} />
                </div>
                <div>
                  <label htmlFor={`${id}-fecha_traslado`} className="eyebrow block mb-2">F. Traslado *</label>
                  <FechaPicker id={`${id}-fecha_traslado`} label="Fecha de traslado" value={form.fecha_traslado} onChange={value => set('fecha_traslado', value)} />
                </div>
              </div>

              <div>
                <label htmlFor={`${id}-descripcion`} className="eyebrow block mb-2">Descripción</label>
                <input id={`${id}-descripcion`} type="text" value={form.descripcion} placeholder="Lima - Huancayo"
                  onChange={e => set('descripcion', e.target.value)} className="input-field" />
              </div>

              <div className={styles.columns}>
                <div>
                  <label htmlFor={`${id}-guia`} className="eyebrow block mb-2">N° Guía</label>
                  <input id={`${id}-guia`} type="text" value={form.numero_guia ?? ''} placeholder="EG03-00000"
                    onChange={e => set('numero_guia', e.target.value)}
                    className="input-field" style={{ fontFamily: 'monospace' }} />
                </div>
                <div>
                  <label htmlFor={`${id}-factura`} className="eyebrow block mb-2">N° Factura</label>
                  <input id={`${id}-factura`} type="text" value={form.numero_factura ?? ''} placeholder="E001-0000"
                    onChange={e => set('numero_factura', e.target.value)}
                    className="input-field" style={{ fontFamily: 'monospace' }} />
                </div>
              </div>

              <div className={styles.columns}>
                <EstadoControl label="Estado factura" value={form.estado} completado={{ value: 'facturado', label: 'Facturado' }} onChange={value => set('estado', value)} />
                <EstadoControl label="Detracción" value={form.detraccion} completado={{ value: 'realizado', label: 'Realizado' }} onChange={value => set('detraccion', value)} />
              </div>

              <div>
                <label htmlFor={`${id}-monto`} className="eyebrow block mb-2">Monto flete (S/) *</label>
                <MontoInput key={form.tipo} id={`${id}-monto`} value={form.monto} onChange={value => set('monto', value)} />
                <p id={`${id}-monto-ayuda`} className={styles.amountHint}>Soles · ejemplo: 1,234.50</p>
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div role="alert" className="flex items-start gap-3 px-4 py-3" style={{
              borderRadius: 'var(--r-btn)', background: '#FFF5F5',
              border: '1px solid rgba(207,69,0,.35)',
            }}>
              <AlertCircle size={15} style={{ marginTop: 1, flexShrink: 0, color: 'var(--signal)' }} />
              <p className="text-xs" style={{ color: 'var(--signal)', fontWeight: 500 }}>{error}</p>
            </div>
          )}

          <div style={{ height: 1, background: 'rgba(20,20,19,.07)' }} />

          <div className="flex gap-3">
            <button type="button" disabled={loading} onClick={onClose} className="btn-outline flex-1">Cancelar</button>
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
