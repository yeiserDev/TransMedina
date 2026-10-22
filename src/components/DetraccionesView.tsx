'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  Copy,
  Check,
  Search,
  X,
  Eye,
  AlertCircle,
  Clock,
  CheckCircle2,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { Viaje, FiltroCadena, EstadoDetraccion } from '@/types';
import { coincideCadena } from '@/lib/cadenas';
import {
  calcularResumenDetracciones,
  formatearListaDetraccionesTexto,
  montoDetraccion,
  esPucallpa,
} from '@/lib/detracciones';
import CadenaSwitch from './CadenaSwitch';
import CadenaLabel from './CadenaLabel';
import { ToggleDetraccion, BadgeEstado } from './BadgeEstado';
import DrivePreviewModal from './DrivePreviewModal';
import styles from './DetraccionesView.module.css';

const fmtMoney = (n: number) =>
  `S/ ${(Number.isFinite(n) ? n : 0).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function fmtDate(d?: string | null): string {
  if (!d || d.startsWith('1900')) return '—';
  try {
    const parsed = new Date(d + 'T12:00:00');
    if (Number.isNaN(parsed.getTime())) return d;
    return format(parsed, 'dd/MM/yyyy', { locale: es });
  } catch {
    return d ?? '—';
  }
}

export default function DetraccionesView({
  initialViajes,
  readOnly = false,
}: {
  initialViajes?: Viaje[];
  readOnly?: boolean;
}) {
  const [transactions, setTransactions] = useState<Viaje[]>(initialViajes ?? []);
  const [loading, setLoading] = useState(!initialViajes);
  const [cadena, setCadena] = useState<FiltroCadena>();
  const [tabEstado, setTabEstado] = useState<'pendiente' | 'realizado' | 'todos'>('pendiente');
  const [busqueda, setBusqueda] = useState('');
  const [copied, setCopied] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ driveId: string; label: string } | null>(null);

  const fetchAll = () => {
    fetch('/api/viajes')
      .then(r => r.json())
      .then(data => {
        setTransactions(Array.isArray(data) ? data : []);
      })
      .catch(() => toast.error('No se pudieron recargar los viajes'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!initialViajes) fetchAll();
    window.addEventListener('viajes-updated', fetchAll);
    return () => window.removeEventListener('viajes-updated', fetchAll);
  }, [initialViajes]);

  // Solo consideramos registros de tipo 'viaje' para detracciones
  const soloViajes = useMemo(
    () => transactions.filter(v => v.tipo === 'viaje'),
    [transactions]
  );

  // Resumen numérico según cadena seleccionada
  const kpis = useMemo(
    () => calcularResumenDetracciones(soloViajes, cadena),
    [soloViajes, cadena]
  );

  // Filtrado de viajes por cadena, estado y término de búsqueda
  const filteredViajes = useMemo(() => {
    let list = soloViajes.filter(v => coincideCadena(v, cadena));

    if (tabEstado !== 'todos') {
      list = list.filter(v => v.detraccion === tabEstado);
    }

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      list = list.filter(v => {
        const desc = (v.descripcion || '').toLowerCase();
        const factura = (v.numero_factura || '').toLowerCase();
        const guia = (v.numero_guia || '').toLowerCase();
        const fecha = (v.fecha_traslado || '').toLowerCase();
        return (
          desc.includes(q) ||
          factura.includes(q) ||
          guia.includes(q) ||
          fecha.includes(q)
        );
      });
    }

    // Ordenar por fecha_traslado descendente (los más recientes primero)
    return list.sort((a, b) => {
      const da = a.fecha_traslado || '';
      const db = b.fecha_traslado || '';
      return db.localeCompare(da);
    });
  }, [soloViajes, cadena, tabEstado, busqueda]);

  const handleToggle = async (id: string, valor: EstadoDetraccion) => {
    if (readOnly) return;
    setToggling(id);
    try {
      const res = await fetch(`/api/viajes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ detraccion: valor }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        `Detracción marcada como ${valor === 'realizado' ? 'pagada' : 'por pagar'}`
      );
      setTransactions(prev =>
        prev.map(v => (v.id === id ? { ...v, detraccion: valor } : v))
      );
      window.dispatchEvent(new CustomEvent('viajes-updated'));
    } catch {
      toast.error('No se pudo actualizar el estado de la detracción');
    } finally {
      setToggling(null);
    }
  };

  const handleCopyResumen = async () => {
    const texto = formatearListaDetraccionesTexto(filteredViajes);
    await navigator.clipboard.writeText(texto);
    setCopied(true);
    toast.success('Resumen de detracciones copiado al portapapeles');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExportExcel = async () => {
    if (filteredViajes.length === 0) {
      toast.error('No hay registros de detracciones para exportar');
      return;
    }
    setExportando(true);
    let url: string | null = null;
    try {
      const res = await fetch('/api/reportes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viajes: filteredViajes,
          filtros: {
            cadena,
            detraccion: tabEstado === 'todos' ? undefined : tabEstado,
          },
        }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const filename = `TransMedina_Detracciones_${tabEstado}.xlsx`;
      url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`Excel exportado (${filteredViajes.length} registros)`);
    } catch {
      toast.error('Error al generar el archivo Excel');
    } finally {
      if (url) setTimeout(() => URL.revokeObjectURL(url!), 10_000);
      setExportando(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <p className="eyebrow mb-1.5">SPOT SUNAT · 4% Transporte de Carga</p>
          <h1
            className="text-3xl sm:text-4xl"
            style={{ fontWeight: 500, letterSpacing: '-0.02em' }}
          >
            Detracciones
          </h1>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={handleCopyResumen}
            className="btn-outline"
            style={{ minHeight: 40, padding: '8px 16px', fontSize: 13 }}
            title="Copiar texto resumen de detracciones pendientes"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            {copied ? '¡Copiado!' : 'Copiar pendientes'}
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exportando || loading}
            className="btn-ink"
            style={{ minHeight: 40, padding: '8px 18px', fontSize: 13 }}
          >
            <FileSpreadsheet size={15} />
            {exportando ? 'Generando…' : 'Exportar Excel'}
          </button>
        </div>
      </div>

      {/* Cadena Switch */}
      <CadenaSwitch
        value={cadena}
        onChange={setCadena}
        conGeneral={transactions.some(v => v.tipo === 'viaje' && v.cadena === null)}
      />

      {/* KPIs Summary Cards */}
      <div className={styles.kpiGrid}>
        {/* Card 1: Por Pagar */}
        <div className={styles.kpiCard}>
          <div className="flex items-center justify-between mb-1">
            <span className="eyebrow" style={{ fontSize: 9.5 }}>
              Por pagar (Pendiente)
            </span>
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{
                background:
                  kpis.pendientesCount > 0 ? 'var(--signal)' : '#16A34A',
              }}
            />
          </div>
          <span
            className={styles.kpiMonto}
            style={{
              color: kpis.pendientesCount > 0 ? 'var(--signal)' : 'var(--ink)',
            }}
          >
            {fmtMoney(kpis.pendientesMonto)}
          </span>
          <span className={styles.kpiSub}>
            {kpis.pendientesCount > 0
              ? `${kpis.pendientesCount} viajes pendientes de depósito`
              : 'Al día, sin pagos pendientes'}
          </span>
          <div className={styles.kpiBadges}>
            <span className={styles.kpiBadgeItem}>
              HYO S/40: <strong>{kpis.pendientesHyoCount}</strong>
            </span>
            <span className={styles.kpiBadgeItem}>
              PUC S/80: <strong>{kpis.pendientesPucCount}</strong>
            </span>
          </div>
        </div>

        {/* Card 2: Pagadas */}
        <div className={styles.kpiCard}>
          <div className="flex items-center justify-between mb-1">
            <span className="eyebrow" style={{ fontSize: 9.5 }}>
              Detracciones pagadas
            </span>
            <CheckCircle2 size={13} className="text-emerald-600" />
          </div>
          <span className={styles.kpiMonto} style={{ color: '#16A34A' }}>
            {fmtMoney(kpis.pagadasMonto)}
          </span>
          <span className={styles.kpiSub}>
            {kpis.pagadasCount} depósitos confirmados en Banco de la Nación
          </span>
          <div className={styles.kpiBadges}>
            <span className={styles.kpiBadgeItem}>
              HYO: <strong>{kpis.pagadasHyoCount}</strong>
            </span>
            <span className={styles.kpiBadgeItem}>
              PUC: <strong>{kpis.pagadasPucCount}</strong>
            </span>
          </div>
        </div>

        {/* Card 3: Regla SUNAT & Total SPOT */}
        <div className={styles.kpiCard}>
          <div className="flex items-center justify-between mb-1">
            <span className="eyebrow" style={{ fontSize: 9.5 }}>
              SPOT Cód. 027 · Tasa 4%
            </span>
            <Receipt size={13} style={{ color: 'var(--slate)' }} />
          </div>
          <span className={styles.kpiMonto} style={{ color: 'var(--ink)' }}>
            {fmtMoney(kpis.totalMontoSPOT)}
          </span>
          <span className={styles.kpiSub}>
            Acumulado total de detracciones ({kpis.totalViajes} fletes registrados)
          </span>
          <div className="mt-1">
            <span
              className="inline-flex items-center gap-1 text-[11px]"
              style={{ color: 'var(--slate)' }}
            >
              <Sparkles size={11} className="text-amber-500" />
              Sujeto a fletes mayores a S/ 400
            </span>
          </div>
        </div>
      </div>

      {/* Sunat Advisory Banner */}
      <div className={styles.sunatNotice}>
        <AlertCircle size={16} className="shrink-0 text-amber-600" />
        <div>
          <strong>Recordatorio SUNAT:</strong> La detracción del 4% debe depositarse
          en la cuenta corriente del <strong>Banco de la Nación</strong> a más tardar
          en la fecha de pago o hasta el 5to día hábil del mes siguiente. El comprobante
          garantiza el derecho a crédito fiscal.
        </div>
      </div>

      {/* Filters row: State Tabs + Live Search */}
      <div className={styles.filtersRow}>
        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tabEstado === 'pendiente'}
            onClick={() => setTabEstado('pendiente')}
            className={styles.tabBtn}
          >
            <Clock size={13} />
            Por pagar
            {kpis.pendientesCount > 0 && (
              <span className={styles.tabBadge}>{kpis.pendientesCount}</span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tabEstado === 'realizado'}
            onClick={() => setTabEstado('realizado')}
            className={styles.tabBtn}
          >
            <CheckCircle2 size={13} />
            Pagadas
            <span
              className={styles.tabBadge}
              style={{
                background: 'rgba(22, 163, 74, 0.15)',
                color: '#166534',
              }}
            >
              {kpis.pagadasCount}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tabEstado === 'todos'}
            onClick={() => setTabEstado('todos')}
            className={styles.tabBtn}
          >
            Todas ({kpis.totalViajes})
          </button>
        </div>

        {/* Live Search Input */}
        <div className={styles.searchBox}>
          <Search size={14} style={{ color: 'var(--slate)' }} />
          <input
            type="search"
            placeholder="Buscar por N° factura, guía, ruta..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className={styles.searchInput}
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content: Table on Desktop, Cards on Mobile */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton rounded-3xl" style={{ height: 60 }} />
          ))}
        </div>
      ) : filteredViajes.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
          <Receipt size={32} className="mx-auto mb-3 text-gray-400" />
          <p className="font-medium text-gray-700">No se encontraron registros</p>
          <p className="text-xs text-gray-400 mt-1">
            {busqueda
              ? 'Prueba con otro término de búsqueda o limpia el filtro.'
              : 'No hay detracciones bajo los filtros seleccionados.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className={styles.tableCard}>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Fecha</th>
                    <th className={styles.th}>Cadena</th>
                    <th className={styles.th}>Ruta / Detalle</th>
                    <th className={styles.th}>N° Factura</th>
                    <th className={styles.th}>N° Guía</th>
                    <th className={styles.th} style={{ textAlign: 'right' }}>
                      Flete (S/)
                    </th>
                    <th className={styles.th} style={{ textAlign: 'right' }}>
                      Detracción (4%)
                    </th>
                    <th className={styles.th} style={{ textAlign: 'center' }}>
                      Estado
                    </th>
                    <th className={styles.th} style={{ textAlign: 'center' }}>
                      Docs
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredViajes.map(v => {
                    const esPuc = esPucallpa(v.descripcion);
                    const detMonto = montoDetraccion(v.descripcion);
                    const isPagada = v.detraccion === 'realizado';

                    return (
                      <tr key={v.id} className={styles.tr}>
                        <td className={styles.td}>
                          <span className="font-medium">{fmtDate(v.fecha_traslado)}</span>
                        </td>
                        <td className={styles.td}>
                          <CadenaLabel cadena={v.cadena} />
                        </td>
                        <td className={styles.td}>
                          <div className="flex flex-col">
                            <span className="font-medium">{v.descripcion}</span>
                            <span className="text-[11px] text-gray-400">
                              Base SPOT: S/ {esPuc ? '2,000.00' : '1,000.00'}
                            </span>
                          </div>
                        </td>
                        <td className={styles.td}>
                          {v.numero_factura ? (
                            <span className="font-mono text-xs font-semibold text-gray-800">
                              {v.numero_factura}
                            </span>
                          ) : (
                            <span className="text-xs text-amber-600 italic">
                              Pendiente facturar
                            </span>
                          )}
                        </td>
                        <td className={styles.td}>
                          <span className="font-mono text-xs text-gray-600">
                            {v.numero_guia || '—'}
                          </span>
                        </td>
                        <td className={styles.td} style={{ textAlign: 'right' }}>
                          <span className="font-medium text-xs font-mono">
                            {fmtMoney(Number(v.monto))}
                          </span>
                        </td>
                        <td className={styles.td} style={{ textAlign: 'right' }}>
                          <span
                            className={
                              isPagada ? styles.badgeMontoOk : styles.badgeMonto
                            }
                          >
                            S/ {detMonto.toFixed(2)}
                          </span>
                        </td>
                        <td className={styles.td} style={{ textAlign: 'center' }}>
                          <ToggleDetraccion
                            detraccion={v.detraccion}
                            viajeId={v.id}
                            descripcion={v.descripcion}
                            onToggle={handleToggle}
                            loading={toggling === v.id}
                            readOnly={readOnly}
                          />
                        </td>
                        <td className={styles.td} style={{ textAlign: 'center' }}>
                          <div className="flex items-center justify-center gap-1">
                            {v.drive_id_factura && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreview({
                                    driveId: v.drive_id_factura!,
                                    label: `Factura ${v.numero_factura || ''}`,
                                  })
                                }
                                title="Ver Factura PDF"
                                className="p-1 rounded-full text-slate-500 hover:text-black hover:bg-gray-100 transition-colors"
                              >
                                <Eye size={13} />
                              </button>
                            )}
                            {v.drive_id_guia && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreview({
                                    driveId: v.drive_id_guia!,
                                    label: `Guía ${v.numero_guia || ''}`,
                                  })
                                }
                                title="Ver Guía PDF"
                                className="p-1 rounded-full text-slate-500 hover:text-black hover:bg-gray-100 transition-colors"
                              >
                                <Eye size={13} />
                              </button>
                            )}
                            {v.drive_id_detraccion && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreview({
                                    driveId: v.drive_id_detraccion!,
                                    label: `Constancia detracción ${v.numero_factura || ''}`,
                                  })
                                }
                                title="Ver Constancia de Detracción SPOT"
                                className="p-1 rounded-full text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                              >
                                <Receipt size={13} />
                              </button>
                            )}
                            {!v.drive_id_factura && !v.drive_id_guia && !v.drive_id_detraccion && (
                              <span className="text-[11px] text-gray-300">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards View */}
          <div className={styles.mobileCards}>
            {filteredViajes.map(v => {
              const detMonto = montoDetraccion(v.descripcion);
              const isPagada = v.detraccion === 'realizado';

              return (
                <div
                  key={v.id}
                  className={styles.mobileCard}
                  data-status={v.detraccion}
                >
                  <div className={styles.mobileCardHeader}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-800">
                        {fmtDate(v.fecha_traslado)}
                      </span>
                      <CadenaLabel cadena={v.cadena} />
                    </div>
                    <span
                      className={
                        isPagada ? styles.badgeMontoOk : styles.badgeMonto
                      }
                    >
                      S/ {detMonto.toFixed(2)}
                    </span>
                  </div>

                  <div className="text-sm font-medium text-gray-900">
                    {v.descripcion}
                  </div>

                  <div className={styles.mobileCardBody}>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-gray-400">
                        Factura
                      </span>
                      <span className="font-mono text-xs text-gray-700">
                        {v.numero_factura || 'Por facturar'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-gray-400">
                        Guía
                      </span>
                      <span className="font-mono text-xs text-gray-700">
                        {v.numero_guia || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-gray-400">
                        Flete
                      </span>
                      <span className="font-mono text-xs text-gray-700">
                        {fmtMoney(Number(v.monto))}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-gray-400">
                        Documentos
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {v.drive_id_factura && (
                          <button
                            type="button"
                            onClick={() =>
                              setPreview({
                                driveId: v.drive_id_factura!,
                                label: `Factura ${v.numero_factura || ''}`,
                              })
                            }
                            className="text-[11px] underline text-blue-600"
                          >
                            Factura
                          </button>
                        )}
                        {v.drive_id_guia && (
                          <button
                            type="button"
                            onClick={() =>
                              setPreview({
                                driveId: v.drive_id_guia!,
                                label: `Guía ${v.numero_guia || ''}`,
                              })
                            }
                            className="text-[11px] underline text-blue-600"
                          >
                            Guía
                          </button>
                        )}
                        {v.drive_id_detraccion && (
                          <button
                            type="button"
                            onClick={() =>
                              setPreview({
                                driveId: v.drive_id_detraccion!,
                                label: `Constancia detracción ${v.numero_factura || ''}`,
                              })
                            }
                            className="text-[11px] underline text-emerald-600 font-semibold"
                          >
                            Constancia SPOT
                          </button>
                        )}
                        {!v.drive_id_factura && !v.drive_id_guia && !v.drive_id_detraccion && (
                          <span className="text-gray-400 text-[11px]">Sin PDF</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={styles.mobileCardFooter}>
                    <span className="text-xs text-gray-500">Estado de pago:</span>
                    <ToggleDetraccion
                      detraccion={v.detraccion}
                      viajeId={v.id}
                      descripcion={v.descripcion}
                      onToggle={handleToggle}
                      loading={toggling === v.id}
                      readOnly={readOnly}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* PDF Document Preview Modal */}
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
