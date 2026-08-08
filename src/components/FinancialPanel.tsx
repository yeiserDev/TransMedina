'use client';

import { useEffect, useState, useMemo } from 'react';
import { TrendingUp, ChevronRight, Loader2, Folder, FolderOpen } from 'lucide-react';
import { Viaje } from '@/types';
import { parseDoc } from '@/lib/documentos';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import DrivePreviewModal from './DrivePreviewModal';
import IconoPdf from './IconoPdf';

function fmt(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
}

interface DocItem {
  id: string;
  serie: string;
  numero: string;
  label: string;
  tipo: 'factura' | 'guia';
  sub: string;
  driveId: string;
}

interface MonthGroup {
  key: string;
  mes: string;
  anio: string;
  items: DocItem[];
}

/** Amarillo carpeta — el look de fólder físico que se lee de un vistazo */
const AMBAR = '#E9A23B';
const AMBAR_SUAVE = '#FBE3B8';

/** Paleta por tipo de documento: la serie sola (E001, EG03) no dice nada a
    quien no la conoce de memoria, así que el color y la etiqueta la traducen. */
const ESTILO_TIPO = {
  factura: { nombre: 'Facturas', color: 'var(--signal)', punto: 'var(--signal-light)', fondo: '#FFF6F0' },
  guia: { nombre: 'Guías', color: '#2563EB', punto: '#60A5FA', fondo: '#F1F6FE' },
} as const;

/**
 * Agrupa los documentos de un mes por tipo y serie, conservando el orden ya
 * calculado (facturas primero). Se agrupa también por tipo y no solo por serie
 * para que una serie nueva del otro tipo no caiga en el bloque equivocado.
 */
function agruparPorSerie(items: DocItem[]): { clave: string; tipo: DocItem['tipo']; serie: string; docs: DocItem[] }[] {
  const map = new Map<string, { clave: string; tipo: DocItem['tipo']; serie: string; docs: DocItem[] }>();
  for (const it of items) {
    const serie = it.numero ? it.serie : 'Otros';
    const clave = `${it.tipo}|${serie}`;
    if (!map.has(clave)) map.set(clave, { clave, tipo: it.tipo, serie, docs: [] });
    map.get(clave)!.docs.push(it);
  }
  return Array.from(map.values());
}


export default function FinancialPanel({ initialViajes }: { initialViajes?: Viaje[] }) {
  const [viajes, setViajes] = useState<Viaje[]>(initialViajes ?? []);
  const [loading, setLoading] = useState(!initialViajes);
  const [openMonths, setOpenMonths] = useState<Set<string> | null>(null);
  const [preview, setPreview] = useState<{ driveId: string; label: string } | null>(null);

  const fetchAll = () => {
    fetch('/api/viajes')
      .then(r => r.json())
      .then(data => { setViajes(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    // Solo cargar viajes si no vinieron del server
    if (!initialViajes) {
      fetchAll();
    }
    // En actualizaciones posteriores: recargar todo desde la API
    window.addEventListener('viajes-updated', fetchAll);
    return () => window.removeEventListener('viajes-updated', fetchAll);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const monthGroups = useMemo((): MonthGroup[] => {
    const map = new Map<string, DocItem[]>();
    const labelMap = new Map<string, { mes: string; anio: string }>();

    for (const v of viajes) {
      if (v.tipo !== 'viaje') continue;
      const fecha = v.fecha_traslado && !v.fecha_traslado.startsWith('1900') ? v.fecha_traslado : null;
      const key = fecha ? fecha.slice(0, 7) : '0000-00';
      const etiqueta = fecha
        ? {
            mes: format(new Date(fecha + 'T12:00:00'), 'MMMM', { locale: es }),
            anio: fecha.slice(0, 4),
          }
        : { mes: 'Sin fecha', anio: '' };

      if (!map.has(key)) { map.set(key, []); labelMap.set(key, etiqueta); }
      const items = map.get(key)!;

      if (v.drive_id_factura) {
        const raw = v.numero_factura ?? v.descripcion ?? 'Factura';
        items.push({
          id: v.id + '-f',
          ...parseDoc(raw),
          label: raw,
          tipo: 'factura',
          sub: v.descripcion ?? '',
          driveId: v.drive_id_factura,
        });
      }
      if (v.drive_id_guia) {
        const raw = v.numero_guia ?? v.descripcion ?? 'Guía';
        items.push({
          id: v.id + '-g',
          ...parseDoc(raw),
          label: raw,
          tipo: 'guia',
          sub: v.descripcion ?? '',
          driveId: v.drive_id_guia,
        });
      }
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, items]) => ({
        key,
        ...(labelMap.get(key) ?? { mes: key, anio: '' }),
        // Facturas primero, luego guías; dentro de cada tipo, número descendente
        items: items.sort((a, b) =>
          a.tipo !== b.tipo
            ? a.tipo === 'factura' ? -1 : 1
            : (b.serie + b.numero).localeCompare(a.serie + a.numero, 'es', { numeric: true })
        ),
      }));
  }, [viajes]);

  const balancePorCobrar = useMemo(() => {
    const fletes = viajes.filter(v => v.tipo === 'viaje').reduce((s, v) => s + Number(v.monto), 0);
    const depositos = viajes.filter(v => v.tipo === 'deposito').reduce((s, v) => s + Number(v.monto), 0);
    const saldoAnterior = viajes.filter(v => v.tipo === 'saldo_anterior').reduce((s, v) => s + Number(v.monto), 0);
    return saldoAnterior + fletes - depositos;
  }, [viajes]);

  // Mes abierto por defecto: el más reciente que tenga documentos.
  // Se deriva en render (no en un efecto) para no encadenar renders.
  const mesPorDefecto = monthGroups.find(g => g.items.length > 0)?.key;
  const abiertos = openMonths ?? new Set(mesPorDefecto ? [mesPorDefecto] : []);

  const toggleMonth = (key: string) => {
    setOpenMonths(prev => {
      const next = new Set(prev ?? (mesPorDefecto ? [mesPorDefecto] : []));
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const totalDocs = monthGroups.reduce((s, g) => s + g.items.length, 0);

  return (
    <div className="space-y-4">

      {/* Por cobrar */}
      {loading ? (
        <div className="skeleton rounded-3xl" style={{ height: 80 }} />
      ) : (
        <div className="rounded-3xl p-4" style={{ background: 'var(--white)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={12} style={{ color: 'var(--signal-light)' }} />
            <p className="eyebrow" style={{ fontSize: 9 }}>Por cobrar</p>
          </div>
          <p style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.025em', color: 'var(--ink)', lineHeight: 1 }}>
            {fmt(balancePorCobrar)}
          </p>
          <p className="text-xs mt-1.5" style={{ color: 'var(--slate)', fontWeight: 450 }}>
            Fletes − depósitos
          </p>
        </div>
      )}

      {/* Separador */}
      <div style={{ height: 1, background: 'rgba(20,20,19,.08)' }} />

      {/* Documentos */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2">
          <p className="eyebrow">Documentos</p>
          {!loading && totalDocs > 0 && (
            <span className="badge-pill" style={{ background: 'var(--canvas)', color: 'var(--slate)', fontSize: 9, padding: '1px 6px' }}>
              {totalDocs}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 px-1" style={{ color: 'var(--slate)' }}>
            <Loader2 size={11} className="animate-spin" />
            <span style={{ fontSize: 11 }}>Cargando…</span>
          </div>
        ) : monthGroups.length === 0 ? (
          <p style={{ fontSize: 11, color: 'var(--dust)', padding: '4px 8px', fontStyle: 'italic' }}>
            Sin documentos aún
          </p>
        ) : (
          <div>
            {monthGroups.map(group => {
              const vacio = group.items.length === 0;
              const isOpen = abiertos.has(group.key);
              return (
                <div key={group.key}>
                  <button
                    type="button"
                    onClick={() => toggleMonth(group.key)}
                    className="w-full flex items-center gap-2 px-2 rounded-lg transition-colors cursor-pointer"
                    style={{ height: 30, opacity: vacio ? 0.55 : 1 }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--canvas)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                  >
                    {/* Chevron guía — rota al abrir */}
                    <ChevronRight
                      size={11}
                      style={{
                        color: 'var(--dust)',
                        flexShrink: 0,
                        transform: isOpen ? 'rotate(90deg)' : 'none',
                        transition: 'transform .18s ease',
                      }}
                    />
                    {isOpen
                      ? <FolderOpen size={14} style={{ color: AMBAR, flexShrink: 0 }} />
                      : <Folder size={14} fill={vacio ? 'none' : AMBAR_SUAVE} style={{ color: AMBAR, flexShrink: 0 }} />}

                    <span
                      className="flex-1 text-left truncate"
                      style={{ fontWeight: isOpen ? 600 : 500, fontSize: 12, letterSpacing: '-0.01em', color: 'var(--ink)', textTransform: 'capitalize' }}
                    >
                      {group.mes}
                      {group.anio && (
                        <span style={{ color: 'var(--dust)', fontWeight: 450, marginLeft: 4 }}>{group.anio}</span>
                      )}
                    </span>

                    <span style={{ fontSize: 10, color: 'var(--slate)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                      {group.items.length}
                    </span>
                  </button>

                  {isOpen && (
                    /* Línea de árbol: conecta la carpeta con sus documentos */
                    <div style={{ marginLeft: 13, borderLeft: '1px solid rgba(20,20,19,.09)', paddingLeft: 6 }}>
                      {vacio && (
                        <p style={{ fontSize: 10, color: 'var(--dust)', fontStyle: 'italic', padding: '5px 8px' }}>
                          Sin documentos
                        </p>
                      )}
                      {/* Agrupado por serie: la serie se escribe una sola vez y
                          los correlativos caen en cuadrícula, fáciles de barrer con la vista */}
                      {agruparPorSerie(group.items).map(({ clave, tipo, serie, docs }) => {
                        const est = ESTILO_TIPO[tipo];
                        return (
                        <div key={clave} style={{ padding: '4px 0 6px' }}>
                          {/* Punto + nombre del tipo + serie: se entiende sin
                              saberse de memoria que E001 es factura */}
                          <div className="flex items-center" style={{ gap: 5, padding: '0 4px 4px' }}>
                            <span style={{ width: 6, height: 6, borderRadius: 2, background: est.punto, flexShrink: 0 }} />
                            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: est.color }}>
                              {est.nombre}
                            </span>
                            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--dust)', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
                              {serie}
                            </span>
                            <span style={{ fontSize: 9, color: 'var(--dust)', marginLeft: 'auto' }}>{docs.length}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            {docs.map(item => (
                                <button
                                  key={item.id}
                                  type="button"
                                  title={`${tipo === 'factura' ? 'Factura' : 'Guía'} ${item.serie}${item.numero ? '-' + item.numero : ''}`}
                                  onClick={() => setPreview({ driveId: item.driveId, label: item.label })}
                                  className="flex items-center rounded-md transition-all cursor-pointer"
                                  style={{
                                    gap: 3,
                                    padding: '4px 5px',
                                    background: est.fondo,
                                    borderLeft: `2px solid ${est.punto}`,
                                    minWidth: 0,
                                  }}
                                  onMouseEnter={e => { const t = e.currentTarget as HTMLElement; t.style.background = 'var(--white)'; t.style.boxShadow = 'var(--shadow-float)'; }}
                                  onMouseLeave={e => { const t = e.currentTarget as HTMLElement; t.style.background = est.fondo; t.style.boxShadow = ''; }}
                                >
                                  <IconoPdf size={12} />
                                  <span
                                    className="truncate"
                                    style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink)', fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}
                                  >
                                    {item.numero || item.serie}
                                  </span>
                                </button>
                            ))}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drive preview modal */}
      {preview && (
        <DrivePreviewModal
          driveId={preview.driveId}
          label={preview.label}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
