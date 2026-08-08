'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Paperclip, ArrowDownCircle, ArrowRight, Clock, ClipboardList, Copy, Check, X, Eye } from 'lucide-react';
import { Viaje, ViajeInsert, FiltrosViaje, EstadoDetraccion, TipoRegistro } from '@/types';
import { formatDoc } from '@/lib/documentos';
import { BadgeEstado, ToggleDetraccion } from './BadgeEstado';
import FiltroBarra from './FiltroBarra';
import ViajeForm from './ViajeForm';
import ConfirmDialog from './ConfirmDialog';
import ArchivosDrive from './ArchivosDrive';
import DrivePreviewModal from './DrivePreviewModal';
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

/* Separadores verticales que agrupan las columnas en bloques:
   [datos del viaje] | [guía] | [factura] | [cobro] · docs.
   Sirven para que se entienda a qué documento pertenece cada ojo.
   Índices = columna donde EMPIEZA cada bloque nuevo.
   Solo los tres que hacen falta para leer guía vs. factura: cada línea
   extra suma ruido sin aportar información. */
const COL_DIVISOR = new Set([3, 4, 6]);
const BORDE_DIVISOR = '1px solid rgba(20,20,19,.035)';
const divisor = (i: number) => (COL_DIVISOR.has(i) ? BORDE_DIVISOR : undefined);

/* La cabecera se fija al borde superior de la tarjeta, que tiene su propio
   scroll. Anclarla al viewport la dejaba flotando a media pantalla, pisando
   las filas y con un hueco por el que se veía pasar el contenido. */

/* Aire que queda bajo la tarjeta. Un calc() fijo dejaba un hueco enorme
   porque tenía que asumir el peor caso de contenido superior; midiendo la
   posición real la tabla aprovecha toda la pantalla disponible. */
const AIRE_INFERIOR = 24;
const ALTO_MINIMO = 320;

/* Números de guía/factura: nunca se recortan. El monospace del sistema es
   más angosto que el genérico y las series de 6 dígitos entran completas. */
const ESTILO_NUM_DOC: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 11.5,
  letterSpacing: '-0.02em',
  color: 'var(--slate)',
  whiteSpace: 'nowrap',
  flex: '0 1 auto',
  minWidth: 0,
};

/* Chip de "hay documento adjunto": se lee a simple vista sin competir con el
   número ni con los badges de estado de la fila. */
function BotonVerDoc({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex items-center justify-center transition-all shrink-0"
      style={{
        width: 22,
        height: 22,
        borderRadius: 6,
        border: '1px solid rgba(20,20,19,.10)',
        background: 'var(--white)',
        boxShadow: '0 1px 1.5px rgba(20,20,19,.05)',
        cursor: 'pointer',
        color: 'var(--slate)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.color = 'var(--signal)';
        el.style.borderColor = 'rgba(207,69,0,.35)';
        el.style.background = '#FFF6F0';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.color = 'var(--slate)';
        el.style.borderColor = 'rgba(20,20,19,.10)';
        el.style.background = 'var(--white)';
      }}
    >
      <Eye size={13} />
    </button>
  );
}

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

function rowStatusStyle(v: Viaje): { background: string; borderLeft: string } {
  if (v.tipo !== 'viaje') return { background: '', borderLeft: '' };
  const factPend = v.estado === 'pendiente';
  const detPend = v.detraccion === 'pendiente';
  if (factPend && detPend) return { background: '#FFF5F0', borderLeft: '3px solid var(--signal)' };
  if (factPend) return { background: '#FFFBEB', borderLeft: '3px solid #F59E0B' };
  if (detPend) return { background: '#FFF8F5', borderLeft: '3px solid rgba(243,115,56,.5)' };
  return { background: 'var(--white)', borderLeft: '3px solid transparent' };
}

interface Props {
  readOnly?: boolean;
  initialViajes?: Viaje[];
  secretToken?: string;
}

export default function ViajesTable({ readOnly = false, initialViajes, secretToken }: Props) {
  const [viajes, setViajes] = useState<Viaje[]>(initialViajes ?? []);
  const [loading, setLoading] = useState(!initialViajes);
  const [filtros, setFiltros] = useState<FiltrosViaje>({});
  const [showForm, setShowForm] = useState(false);
  const [newTipo, setNewTipo] = useState<TipoRegistro>('viaje');
  const [editViaje, setEditViaje] = useState<Viaje | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ driveId: string; label: string } | null>(null);
  const [showFacturas, setShowFacturas] = useState(false);
  const [facturasViajes, setFacturasViajes] = useState<Viaje[]>([]);
  const [loadingFacturas, setLoadingFacturas] = useState(false);
  const [copied, setCopied] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [altoTabla, setAltoTabla] = useState<number | undefined>();

  // Year accordion: current year open by default, others collapsed
  const currentYear = String(new Date().getFullYear());
  const [openYears, setOpenYears] = useState<Set<string>>(new Set([currentYear]));

  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrollBoxRef = useRef<HTMLDivElement>(null);
  // Evita el fetch duplicado en el montaje cuando ya hay datos del server
  const skipInitialFetch = useRef(initialViajes !== undefined);

  const fetchViajes = useCallback(async () => {
    if (readOnly) return;
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    setLoading(true);
    const params = new URLSearchParams();
    if (filtros.mes) params.set('mes', filtros.mes);
    if (filtros.estado) params.set('estado', filtros.estado);
    if (filtros.detraccion) params.set('detraccion', filtros.detraccion);
    try {
      const res = await fetch(`/api/viajes?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setViajes(Array.isArray(data) ? data : []);
    } catch {
      // Sin catch, un fetch fallido dejaba la tabla girando para siempre
      toast.error('No se pudieron cargar los viajes');
    } finally {
      setLoading(false);
    }
  }, [filtros, readOnly]);

  useEffect(() => { fetchViajes(); }, [fetchViajes]);

  /* Estira la tabla hasta el borde inferior de la ventana. Se mide la
     posición del contenedor en el documento (no en el viewport) para que el
     resultado no dependa de cuánto se haya bajado la página. */
  useEffect(() => {
    const medir = () => {
      const el = scrollBoxRef.current;
      // offsetParent null = oculto (breakpoint móvil): no hay nada que medir
      if (!el || el.offsetParent === null) return;
      const topEnDocumento = el.getBoundingClientRect().top + window.scrollY;
      setAltoTabla(Math.max(ALTO_MINIMO, window.innerHeight - topEnDocumento - AIRE_INFERIOR));
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [loading, viajes.length, filtros]);

  // Listen for calendar day clicks
  useEffect(() => {
    const handler = (e: Event) => {
      const date = (e as CustomEvent<string>).detail;
      const viajeYear = date.slice(0, 4);
      // ensure the year group is open
      setOpenYears(prev => {
        if (prev.has(viajeYear)) return prev;
        const next = new Set(prev);
        next.add(viajeYear);
        return next;
      });
      // flash + scroll after a tick (DOM may need to render the open year)
      setTimeout(() => {
        const el = rowRefs.current.get(date) ?? cardRefs.current.get(date);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setFlashId(date);
          setTimeout(() => setFlashId(null), 1800);
        }
      }, 120);
    };
    window.addEventListener('goto-viaje-date', handler);
    return () => window.removeEventListener('goto-viaje-date', handler);
  }, []);

  const meses = useMemo(() => Array.from(new Set(viajes.map((v) => v.mes))), [viajes]);
  const hasFilters = !!(filtros.mes || filtros.estado || filtros.detraccion);

  // Group by year (sort descending)
  const byYear = useMemo((): [string, Viaje[]][] => {
    const map = new Map<string, Viaje[]>();
    for (const v of viajes) {
      const year = v.fecha_traslado && !v.fecha_traslado.startsWith('1900')
        ? v.fecha_traslado.slice(0, 4)
        : (v.mes.split(' ')[1] ?? 'Sin fecha');
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(v);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [viajes]);

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
    const m = new Map<string, { before: number; after: number }>();
    for (const v of sorted) {
      const before = running;
      if (v.tipo === 'deposito') running -= Number(v.monto);
      else running += Number(v.monto);
      m.set(v.id, { before, after: running });
    }
    return m;
  }, [viajes, hasFilters]);

  const openFacturas = async () => {
    setShowFacturas(true); setLoadingFacturas(true);
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

  const openForm = (tipo: TipoRegistro) => { setNewTipo(tipo); setEditViaje(undefined); setShowForm(true); };

  const handleSave = async (data: ViajeInsert) => {
    let res: Response;
    if (editViaje) {
      res = await fetch(`/api/viajes/${editViaje.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    } else {
      res = await fetch('/api/viajes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(err.error ?? 'Error al guardar');
    }
    toast.success(editViaje ? 'Registro actualizado' : 'Registro guardado');
    setEditViaje(undefined);
    await fetchViajes();
    window.dispatchEvent(new CustomEvent('viajes-updated'));
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { id } = confirmDelete;
    setConfirmDelete(null); setDeletingId(id);
    await new Promise(r => setTimeout(r, 300));
    const res = await fetch(`/api/viajes/${id}`, { method: 'DELETE' });
    setDeletingId(null);
    if (res.ok) {
      toast.success('Registro eliminado');
      await fetchViajes();
      window.dispatchEvent(new CustomEvent('viajes-updated'));
    } else toast.error('No se pudo eliminar');
  };

  const handleToggle = async (id: string, valor: EstadoDetraccion) => {
    setToggling(id);
    const res = await fetch(`/api/viajes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ detraccion: valor }) });
    if (res.ok) { toast.success(`Detracción: ${valor}`); await fetchViajes(); }
    else toast.error('No se pudo actualizar');
    setToggling(null);
  };

  const fmt = (d: string) => {
    if (!d || d.startsWith('1900')) return '—';
    try { return format(new Date(d + 'T12:00:00'), 'dd MMM yy', { locale: es }); }
    catch { return d; }
  };

  /* Sin año, para la lista móvil: la cabecera del grupo ya dice de qué año es
     y así las dos fechas entran en la misma línea que el estado. */
  const fmtCorto = (d: string) => {
    if (!d || d.startsWith('1900')) return '—';
    try { return format(new Date(d + 'T12:00:00'), 'dd MMM', { locale: es }); }
    catch { return d; }
  };

  const toggleYear = (year: string) => {
    setOpenYears(prev => {
      const next = new Set(prev);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });
  };

  const renderDesktopRows = (yearViajes: Viaje[], allViajesFlat: Viaje[]) => {
    return yearViajes.map((v, idx) => {
      const isDeposito = v.tipo === 'deposito';
      const isSaldo = v.tipo === 'saldo_anterior';
      const status = rowStatusStyle(v);
      const isFlash = flashId === v.fecha_traslado;
      const isDeleting = deletingId === v.id;

      return (
        // La key va en el Fragment, no en el <tr>: es el Fragment el elemento
        // del array. Sin ella React no puede reconciliar y revienta con removeChild.
        <Fragment key={v.id}>
          <tr
            ref={el => {
              if (el && v.fecha_traslado && !v.fecha_traslado.startsWith('1900'))
                rowRefs.current.set(v.fecha_traslado, el);
            }}
            id={`viaje-row-${v.fecha_traslado}`}
            className={`transition-all duration-150 ${isDeleting ? 'anim-fade-out' : ''}`}
            style={{
              borderBottom: '1px solid rgba(20,20,19,.055)',
              background: isDeposito ? '#F0FFF4' : isSaldo ? '#FFF8F0' : status.background,
              // Filete de color: marca la fila como movimiento de dinero antes
              // incluso de leerla
              borderLeft: isDeposito ? '3px solid #16A34A' : isSaldo ? '3px solid #D97706' : status.borderLeft,
              outline: isFlash ? '2px solid var(--signal-light)' : 'none',
              outlineOffset: -2,
              animationDelay: isDeleting ? '0ms' : `${idx * 18}ms`,
              transition: 'background 0.15s, outline 0.15s',
            }}
            onMouseEnter={e => {
              if (!isDeposito && !isSaldo)
                (e.currentTarget as HTMLElement).style.background = 'var(--canvas-lifted)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background =
                isDeposito ? '#F0FFF4' : isSaldo ? '#FFF8F0' : status.background;
            }}
          >
            <td className="px-3 py-2.5">
              <span className="text-xs" style={{ color: 'var(--slate)' }}>{fmt(v.fecha_carga)}</span>
            </td>
            <td className="px-3 py-2.5">
              <span style={{
                display: 'inline-block', fontWeight: 600, fontSize: 12, letterSpacing: '-0.01em',
                color: 'var(--ink)', background: 'rgba(20,20,19,.06)', borderRadius: 6, padding: '2px 7px',
              }}>
                {fmt(v.fecha_traslado)}
              </span>
            </td>
            {/* Depósitos y saldos no tienen guía, factura ni detracción: en vez
                de rellenar cinco columnas con "—" —que se lee como datos
                faltantes— se fusionan en una sola celda con su propia lectura.
                Fechas y monto siguen en sus columnas, así la vista mantiene la
                alineación de libro contable. */}
            {(isDeposito || isSaldo) ? (
              <td colSpan={5} className="px-3 py-2.5" style={{ overflow: 'hidden' }}>
                <div className="flex items-center gap-2 min-w-0">
                  {isDeposito
                    ? <ArrowDownCircle size={13} style={{ color: '#16A34A', flexShrink: 0 }} />
                    : <Clock size={13} style={{ color: '#B45309', flexShrink: 0 }} />}
                  <span className="badge-pill shrink-0" style={
                    isDeposito
                      ? { background: '#DCFCE7', color: '#14532D', fontSize: 11 }
                      : { background: '#FFF0CC', color: '#92400E', fontSize: 11 }
                  }>
                    {isDeposito ? 'Depósito' : 'Saldo anterior'}
                  </span>
                  <span style={{ color: 'var(--slate)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isDeposito
                      ? (v.descripcion !== 'Depósito recibido' ? v.descripcion : '')
                      : v.mes}
                  </span>

                  {/* Efecto sobre la deuda, en la misma fila que el depósito */}
                  {isDeposito && !hasFilters && ledgerMap.get(v.id) && (() => {
                    const lp = ledgerMap.get(v.id)!;
                    const saldado = lp.after <= 0;
                    return (
                      <span className="flex items-center shrink-0" style={{ gap: 5, marginLeft: 4, fontSize: 10.5, color: 'var(--slate)' }}>
                        <span style={{ color: 'var(--dust)' }}>·</span>
                        <span>Debían</span>
                        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{fmtMoney(lp.before)}</span>
                        <ArrowRight size={10} style={{ color: 'var(--dust)' }} />
                        <span>{saldado ? 'Saldo' : 'Quedan'}</span>
                        <span style={{ fontWeight: 700, color: saldado ? '#16A34A' : 'var(--signal)' }}>
                          {saldado ? '✓ al día' : fmtMoney(lp.after)}
                        </span>
                      </span>
                    );
                  })()}
                </div>
              </td>
            ) : (
            <>
            <td className="px-3 py-2.5" style={{ overflow: 'hidden' }}>
              <span style={{ fontWeight: 450, color: 'var(--ink)', fontSize: 13, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.descripcion}</span>
            </td>
            {/* Bloque GUÍA */}
            <td className="px-3 py-2.5" style={{ borderLeft: divisor(3) }}>
              <div className="flex items-center gap-1.5 min-w-0">
                <span style={ESTILO_NUM_DOC}>
                  {formatDoc(v.numero_guia) || '—'}
                </span>
                {v.drive_id_guia && (
                  <BotonVerDoc
                    title="Ver guía adjunta"
                    onClick={() => setPreview({ driveId: v.drive_id_guia!, label: v.numero_guia ? `Guía ${v.numero_guia}` : 'Guía' })}
                  />
                )}
              </div>
            </td>

            {/* Bloque FACTURA — estado + número van juntos */}
            <td className="px-3 py-2.5" style={{ borderLeft: divisor(4) }}>
              <BadgeEstado estado={v.estado} />
            </td>

            <td className="px-3 py-2.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span style={ESTILO_NUM_DOC}>
                  {formatDoc(v.numero_factura) || '—'}
                </span>
                {v.drive_id_factura && (
                  <BotonVerDoc
                    title="Ver factura adjunta"
                    onClick={() => setPreview({ driveId: v.drive_id_factura!, label: v.numero_factura ? `Factura ${v.numero_factura}` : 'Factura' })}
                  />
                )}
              </div>
            </td>

            {/* Bloque COBRO */}
            <td className="px-3 py-2.5" style={{ borderLeft: divisor(6) }}>
              <ToggleDetraccion
                detraccion={v.detraccion}
                viajeId={v.id}
                descripcion={v.descripcion}
                onToggle={handleToggle}
                loading={toggling === v.id}
              />
            </td>
            </>
            )}

            <td className="px-4 py-3 text-right">
              <span style={{
                fontWeight: 700, fontSize: 13, letterSpacing: '-0.01em',
                color: isDeposito ? '#16A34A' : 'var(--ink)',
              }}>
                {isDeposito ? '+' : ''}{Number(v.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </span>
            </td>

            {/* Bloque DOCS + acciones */}
            <td className="px-3 py-2.5" style={{ borderLeft: divisor(8) }}>
              {!isDeposito && !isSaldo && !readOnly && (
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

            <td className="px-3 py-2.5">
              {!readOnly && (
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
              )}
            </td>
          </tr>

          {/* Drive docs row */}
          {!readOnly && expandedId === v.id && (
            <tr key={`${v.id}-docs`}>
              <td colSpan={10} className="px-8 py-4"
                style={{ background: 'var(--canvas)', borderBottom: '1px solid rgba(20,20,19,.06)' }}>
                <ArchivosDrive
                    viajeId={v.id}
                    driveIdGuia={v.drive_id_guia ?? null}
                    driveIdFactura={v.drive_id_factura ?? null}
                    numeroGuia={v.numero_guia}
                    numeroFactura={v.numero_factura}
                    onUploaded={(tipo, driveId) => {
                      const field = tipo === 'guias' ? 'drive_id_guia' : 'drive_id_factura';
                      setViajes(prev => prev.map(vj => vj.id === v.id ? { ...vj, [field]: driveId } : vj));
                    }}
                  />
              </td>
            </tr>
          )}
        </Fragment>
      );
    });
  };

  return (
    <div className="space-y-5 pb-16">

      {/* Header */}
      <div className="flex items-end justify-between gap-4 pt-2 flex-wrap">
        <div>
          {readOnly && (
            <p className="eyebrow mb-1" style={{ color: 'var(--dust)' }}>Solo lectura</p>
          )}
          {!readOnly && <p className="eyebrow mb-2">Registros</p>}
          <h1 className="text-4xl" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>Viajes</h1>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2 flex-wrap">
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
        )}
      </div>

      {/* Filtros */}
      {!readOnly && <FiltroBarra filtros={filtros} meses={meses} onChange={setFiltros} />}

      {/* ── Tabla desktop ───────────────────────────────────── */}
      <div className="hidden sm:block card-stadium">
        {/* Este div es el contenedor de scroll: la cabecera sticky se ancla a
            su borde superior, no al viewport. Sin maxHeight no hay scroll
            propio y el sticky nunca se activaría. */}
        {/* overflowX: en pantallas medianas los porcentajes se comprimen tanto
            que los números volverían a cortarse; con minWidth en la tabla se
            desplaza en horizontal en vez de recortar. */}
        <div ref={scrollBoxRef} style={{ maxHeight: altoTabla, minHeight: 280, overflowY: 'auto', overflowX: 'auto' }}>
          {loading ? (
            <table className="w-full"><tbody>{Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}</tbody></table>
          ) : viajes.length === 0 ? (
            <div className="py-24 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'var(--canvas)' }}>
                <Plus size={24} style={{ color: 'var(--slate)' }} />
              </div>
              <p style={{ color: 'var(--slate)', fontWeight: 450 }}>Sin registros. Agrega el primero.</p>
            </div>
          ) : (
            <table className="w-full text-sm" style={{ tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0, minWidth: 940 }}>
              {/* Anchos de columna: F.Carga, F.Traslado, Descripcion, N Guia,
                  Estado factura, N Factura, Detraccion, Monto, Docs, Acciones.
                  Sin espacios entre <col/>: un nodo de texto aqui rompe la hidratacion. */}
              {/* N° Guía y N° Factura llevan el mayor ancho: cargan el número
                  (hasta 6 dígitos) más el botón de ver. La descripción cede
                  espacio porque se repite y tolera el recorte. */}
              <colgroup>
                <col style={{ width: '8%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '6%' }} />
                <col style={{ width: '5%' }} />
              </colgroup>
              <thead>
                <tr>
                  {['F. Carga', 'F. Traslado', 'Descripción', 'N° Guía', 'Estado factura', 'N° Factura', 'Detracción', 'Monto (S/)', 'Docs', ''].map((h, i) => (
                    /* El fondo y el borde van en cada <th>, no en el <tr>: con
                       position:sticky el fondo del <tr> no acompaña a la celda
                       y las filas se transparentarían por debajo. */
                    <th key={h} className="text-left px-3 py-3 eyebrow eyebrow-plain"
                      style={{
                        fontWeight: 700, letterSpacing: '0.06em', fontSize: 10,
                        color: 'var(--slate)',
                        whiteSpace: 'nowrap', overflow: 'hidden',
                        borderLeft: divisor(i),
                        position: 'sticky', top: 0, zIndex: 3,
                        background: 'var(--white)',
                        /* Borde inferior + sombra de elevación: los bordes del
                           <tr> no viajan con la celda sticky. */
                        boxShadow: 'inset 0 -1px 0 rgba(20,20,19,.10), 0 4px 8px -6px rgba(20,20,19,.18)',
                      }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hasFilters
                  ? viajes.map((v, idx) => renderDesktopRows([v], viajes)).flat()
                  : byYear.map(([year, yearViajes]) => {
                    const isOpen = openYears.has(year);
                    const realViajes = yearViajes.filter(v => v.tipo === 'viaje');
                    const pendFact = realViajes.filter(v => v.estado === 'pendiente').length;
                    const pendDet = realViajes.filter(v => v.detraccion === 'pendiente').length;

                    return (
                      // Igual que arriba: la key pertenece al Fragment, que es
                      // el elemento que devuelve el map.
                      <Fragment key={`year-${year}`}>
                        {/* Year header row */}
                        <tr
                          style={{
                            background: 'var(--canvas)',
                            cursor: 'pointer',
                          }}
                          onClick={() => toggleYear(year)}
                        >
                          <td colSpan={10} style={{ padding: '8px 12px', borderBottom: '1.5px solid rgba(20,20,19,.1)' }}>
                            <div className="flex items-center gap-3">
                              {isOpen
                                ? <ChevronUp size={13} style={{ color: 'var(--slate)', flexShrink: 0 }} />
                                : <ChevronDown size={13} style={{ color: 'var(--slate)', flexShrink: 0 }} />
                              }
                              <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
                                {year}
                              </span>
                              <span className="badge-pill" style={{ background: 'var(--canvas-lifted)', color: 'var(--slate)', fontSize: 9, padding: '2px 8px' }}>
                                {realViajes.length} viaje{realViajes.length !== 1 ? 's' : ''}
                              </span>
                              {pendFact > 0 && (
                                <span className="badge-pill" style={{ background: '#FFFBEB', color: '#92400E', fontSize: 9, padding: '2px 8px' }}>
                                  {pendFact} sin factura
                                </span>
                              )}
                              {pendDet > 0 && (
                                <span className="badge-pill" style={{ background: '#FFF8F5', color: 'var(--signal)', fontSize: 9, padding: '2px 8px' }}>
                                  {pendDet} det. pendiente{pendDet !== 1 ? 's' : ''}
                                </span>
                              )}
                              {!isOpen && (
                                <span style={{ fontSize: 11, color: 'var(--dust)', marginLeft: 'auto', fontWeight: 450 }}>
                                  Clic para ver
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isOpen && renderDesktopRows(yearViajes, yearViajes)}
                      </Fragment>
                    );
                  })
                }
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Cards mobile ──────────────────────────────────── */}
      <div className="sm:hidden space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-5 space-y-3 rounded-3xl" style={{ background: 'var(--white)', boxShadow: 'var(--shadow-card)' }}>
              <div className="skeleton" style={{ height: 16, width: '60%' }} />
              <div className="skeleton" style={{ height: 14, width: '40%' }} />
            </div>
          ))
        ) : viajes.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <p style={{ color: 'var(--slate)', fontWeight: 450 }}>Sin registros</p>
          </div>
        ) : (
          (hasFilters ? [['todos', viajes] as [string, Viaje[]]] : byYear).map(([year, yearViajes]) => {
            const isOpen = hasFilters || openYears.has(year);
            const realViajes = yearViajes.filter(v => v.tipo === 'viaje');
            const pendFact = realViajes.filter(v => v.estado === 'pendiente').length;
            const pendDet = realViajes.filter(v => v.detraccion === 'pendiente').length;

            return (
              <div key={`mobile-year-${year}`}>
                {!hasFilters && (
                  <button
                    onClick={() => toggleYear(year)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl mb-2"
                    style={{ background: 'var(--canvas)', border: '1.5px solid rgba(20,20,19,.1)' }}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{year}</span>
                      <span className="badge-pill" style={{ background: 'var(--white)', color: 'var(--slate)', fontSize: 9 }}>
                        {realViajes.length} viajes
                      </span>
                      {pendFact > 0 && <span className="badge-pill" style={{ background: '#FFFBEB', color: '#92400E', fontSize: 9 }}>{pendFact} sin factura</span>}
                      {pendDet > 0 && <span className="badge-pill" style={{ background: '#FFF8F5', color: 'var(--signal)', fontSize: 9 }}>{pendDet} det. pend.</span>}
                    </div>
                    {isOpen ? <ChevronUp size={13} style={{ color: 'var(--slate)' }} /> : <ChevronDown size={13} style={{ color: 'var(--slate)' }} />}
                  </button>
                )}

                {isOpen && yearViajes.map((v, idx) => {
                  const isDeposito = v.tipo === 'deposito';
                  const isSaldo = v.tipo === 'saldo_anterior';
                  const status = rowStatusStyle(v);
                  const isFlash = flashId === v.fecha_traslado;
                  const abierta = expandedId === v.id;
                  const docsAdjuntos = (v.drive_id_guia ? 1 : 0) + (v.drive_id_factura ? 1 : 0);

                  return (
                    <div key={v.id}
                      ref={el => {
                        if (el && v.fecha_traslado && !v.fecha_traslado.startsWith('1900'))
                          cardRefs.current.set(v.fecha_traslado, el);
                      }}
                      className={`mb-1.5 overflow-hidden ${deletingId === v.id ? 'anim-fade-out' : 'anim-fade-up'}`}
                      style={{
                        background: isDeposito ? '#F0FFF4' : isSaldo ? '#FFF8F0' : status.background,
                        borderRadius: '14px',
                        /* --shadow-card (48px de difusión) sirve para una tarjeta
                           suelta; repetida en una lista densa emborrona todo.
                           Un filete y una sombra corta separan igual y ocupan menos. */
                        border: '1px solid rgba(20,20,19,.06)',
                        boxShadow: '0 1px 2px rgba(20,20,19,.04)',
                        borderLeft: isDeposito ? '3px solid #16A34A' : isSaldo ? '3px solid #D97706' : status.borderLeft,
                        outline: isFlash ? '2px solid var(--signal-light)' : 'none',
                        animationDelay: deletingId === v.id ? '0ms' : `${idx * 40}ms`,
                      }}>

                      {/* Cabecera: siempre visible, toca para abrir */}
                      <button
                        type="button"
                        onClick={() => setExpandedId(abierta ? null : v.id)}
                        className="w-full text-left flex items-center justify-between gap-2 px-3.5 py-2.5"
                      >
                        {/* Dos líneas fijas: título + una sola línea de metadatos.
                            Todo lo que antes ocupaba una tercera línea vive ahora
                            en esa fila de meta, separado por puntos. */}
                        <div className="flex-1 min-w-0">
                          {isDeposito ? (
                            <>
                              <div className="flex items-center gap-1.5">
                                <span className="badge-pill shrink-0" style={{ background: '#DCFCE7', color: '#14532D', fontSize: 10, padding: '1px 7px' }}>Depósito</span>
                                <span style={{ fontSize: 11, color: 'var(--slate)' }}>{fmtCorto(v.fecha_traslado)}</span>
                              </div>
                              {!hasFilters && ledgerMap.get(v.id) && (() => {
                                const lp = ledgerMap.get(v.id)!;
                                const saldado = lp.after <= 0;
                                return (
                                  <div className="flex items-center gap-1 mt-1 truncate" style={{ fontSize: 10, color: 'var(--slate)' }}>
                                    <span>Debían</span>
                                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{fmtMoney(lp.before)}</span>
                                    <ArrowRight size={9} style={{ color: 'var(--dust)', flexShrink: 0 }} />
                                    <span>{saldado ? 'Saldo' : 'Quedan'}</span>
                                    <span style={{ fontWeight: 700, color: saldado ? '#16A34A' : 'var(--signal)' }}>
                                      {saldado ? '✓ al día' : fmtMoney(lp.after)}
                                    </span>
                                  </div>
                                );
                              })()}
                            </>
                          ) : isSaldo ? (
                            <p className="font-semibold truncate" style={{ color: '#92400E', fontSize: 13 }}>Saldo anterior — {v.mes}</p>
                          ) : (
                            <>
                              <p className="font-medium truncate" style={{ color: 'var(--ink)', fontSize: 13, lineHeight: 1.3 }}>{v.descripcion}</p>
                              <div className="flex items-center gap-1.5 mt-0.5" style={{ fontSize: 10, color: 'var(--slate)', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                <span>{fmtCorto(v.fecha_carga)} → {fmtCorto(v.fecha_traslado)}</span>
                                <span style={{ color: 'var(--dust)' }}>·</span>
                                <span style={{ color: v.estado === 'facturado' ? '#16A34A' : 'var(--signal)', fontWeight: 600 }}>
                                  {v.estado === 'facturado' ? 'Facturado' : 'Pendiente'}
                                </span>
                                {v.detraccion === 'pendiente' && (
                                  <>
                                    <span style={{ color: 'var(--dust)' }}>·</span>
                                    <span style={{ color: 'var(--signal)' }}>det.</span>
                                  </>
                                )}
                                {docsAdjuntos > 0 && (
                                  <span className="flex items-center gap-0.5" style={{ color: 'var(--dust)' }}>
                                    <Paperclip size={8} />
                                    {docsAdjuntos}
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        <div className="shrink-0 flex items-center gap-1">
                          <span className="font-bold" style={{
                            fontSize: 14, color: isDeposito ? '#16A34A' : 'var(--ink)',
                            letterSpacing: '-0.02em', whiteSpace: 'nowrap',
                          }}>
                            {isDeposito ? '+' : ''}S/ {Number(v.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </span>
                          {abierta
                            ? <ChevronUp size={13} style={{ color: 'var(--slate)' }} />
                            : <ChevronDown size={13} style={{ color: 'var(--dust)' }} />}
                        </div>
                      </button>

                      {abierta && (
                      <div className="px-4 pb-4 space-y-3">
                      {!isDeposito && !isSaldo && (
                        <>
                          {/* Estado + Detracción prominent row */}
                          <div className="flex flex-wrap gap-2">
                            <BadgeEstado estado={v.estado} />
                            <ToggleDetraccion detraccion={v.detraccion} viajeId={v.id} onToggle={handleToggle} loading={toggling === v.id} />
                          </div>
                          {/* Solo en modo lectura: si se puede editar, las tarjetas de
                              ArchivosDrive ya muestran el número y el botón de ver */}
                          {readOnly && (v.numero_guia || v.numero_factura) && (
                            <div className="text-xs space-y-0.5" style={{ color: 'var(--slate)' }}>
                              {v.numero_guia && (
                                <div className="flex items-center gap-2">
                                  <p>Guía: <span style={{ fontFamily: 'monospace', color: 'var(--ink)', whiteSpace: 'nowrap' }}>{formatDoc(v.numero_guia)}</span></p>
                                  {v.drive_id_guia && (
                                    <button
                                      onClick={() => setPreview({ driveId: v.drive_id_guia!, label: `Guía ${v.numero_guia}` })}
                                      className="flex items-center gap-1 transition-colors"
                                      style={{ fontSize: 10, color: 'var(--link)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                    >
                                      <Eye size={10} /> Ver
                                    </button>
                                  )}
                                </div>
                              )}
                              {v.numero_factura && (
                                <div className="flex items-center gap-2">
                                  <p>Factura: <span style={{ fontFamily: 'monospace', color: 'var(--ink)', whiteSpace: 'nowrap' }}>{formatDoc(v.numero_factura)}</span></p>
                                  {v.drive_id_factura && (
                                    <button
                                      onClick={() => setPreview({ driveId: v.drive_id_factura!, label: `Factura ${v.numero_factura}` })}
                                      className="flex items-center gap-1 transition-colors"
                                      style={{ fontSize: 10, color: 'var(--link)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                    >
                                      <Eye size={10} /> Ver
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          {!readOnly && (
                            <div style={{ borderTop: '1px solid rgba(20,20,19,.08)', paddingTop: 10 }}>
                              <ArchivosDrive
                                viajeId={v.id}
                                driveIdGuia={v.drive_id_guia ?? null}
                                driveIdFactura={v.drive_id_factura ?? null}
                                numeroGuia={v.numero_guia}
                                numeroFactura={v.numero_factura}
                                onUploaded={(tipo, driveId) => {
                                  const field = tipo === 'guias' ? 'drive_id_guia' : 'drive_id_factura';
                                  setViajes(prev => prev.map(vj => vj.id === v.id ? { ...vj, [field]: driveId } : vj));
                                }}
                              />
                            </div>
                          )}
                        </>
                      )}

                      {!readOnly && (
                        <div className="flex gap-2">
                          <button onClick={() => { setEditViaje(v); setShowForm(true); }} className="btn-outline flex-1" style={{ fontSize: 13, padding: '8px 16px' }}>
                            <Pencil size={12} /> Editar
                          </button>
                          <button onClick={() => setConfirmDelete({ id: v.id, label: v.descripcion || v.mes || 'este registro' })}
                            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2"
                            style={{ borderRadius: 'var(--r-btn)', border: '1.5px solid rgba(207,69,0,.4)', color: 'var(--signal)', fontWeight: 450, fontSize: 13, background: 'transparent' }}>
                            <Trash2 size={12} /> Eliminar
                          </button>
                        </div>
                      )}
                      </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
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

      {preview && (
        <DrivePreviewModal
          driveId={preview.driveId}
          label={preview.label}
          secretToken={secretToken}
          onClose={() => setPreview(null)}
        />
      )}

      {showFacturas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(14,14,13,.72)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowFacturas(false); }}>
          <div className="w-full max-w-2xl flex flex-col rounded-[32px] overflow-hidden"
            style={{ background: 'var(--white)', boxShadow: '0 24px 64px rgba(0,0,0,.22)', maxHeight: '80vh' }}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
              <div>
                <p className="eyebrow mb-1">Para el contador</p>
                <h2 style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.025em' }}>Facturas pendientes</h2>
              </div>
              <button onClick={() => setShowFacturas(false)} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: 'var(--canvas)', color: 'var(--slate)' }}>
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-3">
              {loadingFacturas ? (
                [1, 2, 3].map(i => <div key={i} className="skeleton rounded-2xl" style={{ height: 72 }} />)
              ) : facturasViajes.length === 0 ? (
                <p className="text-sm py-8 text-center" style={{ color: 'var(--slate)' }}>Sin viajes pendientes de facturación</p>
              ) : (
                facturasViajes.map(v => (
                  <div key={v.id} className="p-4 rounded-2xl text-sm leading-relaxed"
                    style={{ background: 'var(--canvas)', color: 'var(--ink)', fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {formatFactura(v)}
                  </div>
                ))
              )}
            </div>
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
