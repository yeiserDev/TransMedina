'use client';

import { useEffect, useState, useMemo } from 'react';
import { TrendingUp, FileText, ChevronDown, ChevronUp, Loader2, Eye, Link, Check, Copy } from 'lucide-react';
import { Viaje } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import DrivePreviewModal from './DrivePreviewModal';

function fmt(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
}

interface DocItem {
  id: string;
  label: string;
  tipo: 'factura' | 'guia';
  sub: string;
  driveId: string;
}

interface MonthGroup {
  key: string;
  mesLabel: string;
  items: DocItem[];
}

export default function FinancialPanel({ isAdmin = false, initialViajes }: { isAdmin?: boolean; initialViajes?: Viaje[] }) {
  const [viajes, setViajes] = useState<Viaje[]>(initialViajes ?? []);
  const [loading, setLoading] = useState(!initialViajes);
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<{ driveId: string; label: string } | null>(null);
  const [secretariaUrl, setSecretariaUrl] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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
    if (isAdmin) {
      fetch('/api/tokens')
        .then(r => r.json())
        .then((tokens: { cliente_nombre: string; activo: boolean; token: string }[]) => {
          const t = Array.isArray(tokens) ? tokens.find(t => t.cliente_nombre === 'Secretaria' && t.activo) : null;
          if (t) setSecretariaUrl(`${window.location.origin}/secretaria?token=${t.token}`);
        })
        .catch(() => {});
    }
    // En actualizaciones posteriores: recargar todo desde la API
    window.addEventListener('viajes-updated', fetchAll);
    return () => window.removeEventListener('viajes-updated', fetchAll);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const monthGroups = useMemo((): MonthGroup[] => {
    const map = new Map<string, DocItem[]>();
    const labelMap = new Map<string, string>();

    for (const v of viajes) {
      if (v.tipo !== 'viaje') continue;
      const fecha = v.fecha_traslado && !v.fecha_traslado.startsWith('1900') ? v.fecha_traslado : null;
      const key = fecha ? fecha.slice(0, 7) : '0000-00';
      const mesLabel = fecha
        ? format(new Date(fecha + 'T12:00:00'), 'MMM yyyy', { locale: es })
        : 'Sin fecha';

      if (!map.has(key)) { map.set(key, []); labelMap.set(key, mesLabel); }
      const items = map.get(key)!;

      if (v.drive_id_factura) {
        items.push({
          id: v.id + '-f',
          label: v.numero_factura ?? v.descripcion ?? 'Factura',
          tipo: 'factura',
          sub: v.descripcion ?? '',
          driveId: v.drive_id_factura,
        });
      }
      if (v.drive_id_guia) {
        items.push({
          id: v.id + '-g',
          label: v.numero_guia ?? v.descripcion ?? 'Guía',
          tipo: 'guia',
          sub: v.descripcion ?? '',
          driveId: v.drive_id_guia,
        });
      }
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, items]) => ({ key, mesLabel: labelMap.get(key) ?? key, items }));
  }, [viajes]);

  const balancePorCobrar = useMemo(() => {
    const fletes = viajes.filter(v => v.tipo === 'viaje').reduce((s, v) => s + Number(v.monto), 0);
    const depositos = viajes.filter(v => v.tipo === 'deposito').reduce((s, v) => s + Number(v.monto), 0);
    const saldoAnterior = viajes.filter(v => v.tipo === 'saldo_anterior').reduce((s, v) => s + Number(v.monto), 0);
    return saldoAnterior + fletes - depositos;
  }, [viajes]);

  // Auto-open most recent month
  useEffect(() => {
    if (monthGroups.length > 0 && openMonths.size === 0) {
      setOpenMonths(new Set([monthGroups[0].key]));
    }
  }, [monthGroups]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMonth = (key: string) => {
    setOpenMonths(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleSecretariaAccess = async () => {
    if (secretariaUrl) {
      await navigator.clipboard.writeText(secretariaUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
      return;
    }
    setLoadingToken(true);
    try {
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_nombre: 'Secretaria' }),
      });
      const data = await res.json();
      const url = `${window.location.origin}/secretaria?token=${data.token}`;
      setSecretariaUrl(url);
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // silent
    } finally {
      setLoadingToken(false);
    }
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
          <div className="space-y-0.5">
            {monthGroups.map(group => {
              const isOpen = openMonths.has(group.key);
              return (
                <div key={group.key}>
                  <button
                    onClick={() => toggleMonth(group.key)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors"
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--canvas)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                  >
                    <div className="flex items-center gap-1.5">
                      <span style={{ fontSize: 12 }}>{isOpen ? '📂' : '📁'}</span>
                      <span style={{ fontWeight: 600, fontSize: 12, letterSpacing: '-0.01em', color: 'var(--ink)', textTransform: 'capitalize' }}>
                        {group.mesLabel}
                      </span>
                      <span className="badge-pill" style={{ background: 'var(--canvas)', color: 'var(--slate)', fontSize: 9, padding: '1px 5px' }}>
                        {group.items.length}
                      </span>
                    </div>
                    {isOpen
                      ? <ChevronUp size={11} style={{ color: 'var(--slate)' }} />
                      : <ChevronDown size={11} style={{ color: 'var(--slate)' }} />}
                  </button>

                  {isOpen && (
                    <div className="mt-0.5 space-y-0.5 pl-1">
                      {group.items.map(item => (
                        <button
                          key={item.id}
                          onClick={() => setPreview({ driveId: item.driveId, label: item.label })}
                          className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl transition-all text-left"
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--canvas)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-float)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText size={12} style={{ color: item.tipo === 'factura' ? 'var(--signal-light)' : '#60A5FA', flexShrink: 0 }} />
                            <div className="min-w-0">
                              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em', fontFamily: 'monospace', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.label}
                              </p>
                              <p style={{ fontSize: 9, color: 'var(--slate)', lineHeight: 1.3, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                                {item.tipo === 'factura' ? 'Factura' : 'Guía'}
                              </p>
                            </div>
                          </div>
                          <Eye size={11} style={{ color: 'var(--dust)', flexShrink: 0 }} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Acceso secretaria — solo admin */}
      {isAdmin && (
        <>
          <div style={{ height: 1, background: 'rgba(20,20,19,.08)' }} />
          <div>
            <p className="eyebrow px-1 mb-2">Acceso secretaria</p>
            <button
              onClick={handleSecretariaAccess}
              disabled={loadingToken}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all"
              style={{
                fontSize: 11,
                fontWeight: 500,
                border: copiedLink ? '1px solid #86EFAC' : '1px solid rgba(20,20,19,.18)',
                background: copiedLink ? '#DCFCE7' : 'transparent',
                color: copiedLink ? '#16A34A' : 'var(--ink)',
                cursor: loadingToken ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (!loadingToken && !copiedLink) (e.currentTarget as HTMLElement).style.background = 'var(--canvas)'; }}
              onMouseLeave={e => { if (!loadingToken && !copiedLink) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {loadingToken ? (
                <Loader2 size={11} className="animate-spin" />
              ) : copiedLink ? (
                <Check size={11} />
              ) : secretariaUrl ? (
                <Copy size={11} />
              ) : (
                <Link size={11} />
              )}
              {loadingToken ? 'Generando…' : copiedLink ? '¡Copiado!' : secretariaUrl ? 'Copiar link' : 'Generar acceso'}
            </button>
            {secretariaUrl && !copiedLink && (
              <p style={{ fontSize: 9, color: 'var(--dust)', marginTop: 4, paddingLeft: 4 }}>
                Solo lectura · sin contraseña
              </p>
            )}
          </div>
        </>
      )}

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
