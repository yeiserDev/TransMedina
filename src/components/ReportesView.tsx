'use client';

import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';

interface ResumenMes {
  mes: string; total: number; monto: number; facturados: number; det_pendientes: number;
}

export default function ReportesView() {
  const [resumen, setResumen] = useState<ResumenMes[]>([]);
  const [loading, setLoading] = useState(true);
  const [descargando, setDescargando] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/reportes?tipo=resumen')
      .then(r => r.json())
      .then(data => { setResumen(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  const descargar = async (mes?: string) => {
    const key = mes ?? 'todos'; setDescargando(key);
    const url = mes ? `/api/reportes?mes=${encodeURIComponent(mes)}` : '/api/reportes';
    const res = await fetch(url);
    const blob = await res.blob();
    const cd = res.headers.get('Content-Disposition') ?? '';
    const filename = cd.split('filename="')[1]?.replace('"','') ?? 'reporte.xlsx';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    URL.revokeObjectURL(a.href); setDescargando(null);
  };

  const totalMonto  = resumen.reduce((s,r) => s + r.monto, 0);
  const totalViajes = resumen.reduce((s,r) => s + r.total, 0);
  const totalDet    = resumen.reduce((s,r) => s + r.det_pendientes, 0);
  const maxMonto    = Math.max(...resumen.map(r => r.monto), 1);

  return (
    <div className="space-y-6 pb-16">

      {/* Ghost watermark */}
      <div className="ghost-text fixed top-1/2 right-0 translate-x-1/4 -translate-y-1/2 pointer-events-none" aria-hidden>
        Reportes
      </div>

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
              value: `S/ ${totalMonto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
              sub: 'fletes cobrados',
            },
            {
              eyebrow: 'Det. pendientes',
              value: String(totalDet),
              sub: totalDet > 0 ? 'requieren atención' : 'todo al día ✓',
              warning: totalDet > 0,
            },
          ].map(({ eyebrow, value, sub, warning }) => (
            <div
              key={eyebrow}
              className="rounded-3xl p-6 flex flex-col gap-2 anim-fade-up"
              style={{ background: 'var(--white)', boxShadow: 'var(--shadow-card)' }}
            >
              <p className="eyebrow">{eyebrow}</p>
              <p
                className="text-2xl leading-none"
                style={{ fontWeight: 500, letterSpacing: '-0.02em', color: warning ? 'var(--signal)' : 'var(--ink)' }}
              >
                {value}
              </p>
              {sub && <p className="text-xs" style={{ color: 'var(--slate)', fontWeight: 450 }}>{sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Tabla mensual */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({length:3}).map((_,i) => (
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
          {/* Tabla header */}
          <div
            className="px-6 py-4"
            style={{ borderBottom: '1px solid rgba(20,20,19,.08)', background: 'var(--canvas-lifted)' }}
          >
            <p className="eyebrow">Desglose mensual</p>
          </div>

          <div>
            {resumen.map((r, idx) => {
              const pct = Math.round((r.monto / maxMonto) * 100);
              return (
                <div
                  key={r.mes}
                  className="px-6 py-5 transition-colors duration-100 anim-fade-up"
                  style={{
                    borderBottom: idx < resumen.length - 1 ? '1px solid rgba(20,20,19,.06)' : 'none',
                    animationDelay: `${idx * 50}ms`,
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--canvas-lifted)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="text-base capitalize" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>
                        {r.mes}
                      </p>
                      <span
                        className="badge-pill"
                        style={{ background: 'var(--canvas)', color: 'var(--slate)', fontSize: 11 }}
                      >
                        {r.total} viaje{r.total !== 1 ? 's' : ''}
                      </span>
                      {r.det_pendientes > 0 && (
                        <span
                          className="badge-pill"
                          style={{ background: '#FFF8F5', color: 'var(--signal)', fontSize: 11 }}
                        >
                          {r.det_pendientes} det. pendiente{r.det_pendientes !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="text-base" style={{ fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
                        S/ {r.monto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </p>
                      <button
                        onClick={() => descargar(r.mes)}
                        disabled={descargando === r.mes}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all duration-150 disabled:opacity-50"
                        style={{
                          borderRadius: 'var(--r-pill)',
                          border: '1.5px solid var(--ink)',
                          color: 'var(--ink)',
                          background: 'transparent',
                          fontWeight: 500,
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = 'var(--ink)';
                          (e.currentTarget as HTMLElement).style.color = 'var(--canvas)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
                          (e.currentTarget as HTMLElement).style.color = 'var(--ink)';
                        }}
                      >
                        <Download size={12} />
                        {descargando === r.mes ? 'Generando...' : 'Excel'}
                      </button>
                    </div>
                  </div>

                  {/* Barra orbital */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--canvas)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: 'var(--ink)',
                        }}
                      />
                    </div>
                    <span className="text-xs w-12 text-right" style={{ color: 'var(--slate)', fontWeight: 450 }}>
                      {r.facturados}/{r.total}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
