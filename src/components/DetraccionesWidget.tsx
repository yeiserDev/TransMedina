'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { calcularResumenDetracciones } from '@/lib/detracciones';
import type { Viaje } from '@/types';

const soles = new Intl.NumberFormat('es-PE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const nombreMes = new Intl.DateTimeFormat('es-PE', { month: 'short', year: 'numeric', timeZone: 'UTC' });

export default function DetraccionesWidget({ initialViajes }: { initialViajes: Viaje[] }) {
  const [viajes, setViajes] = useState(initialViajes);
  const [error, setError] = useState(false);

  useEffect(() => {
    let controller: AbortController | undefined;
    const actualizar = async () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const response = await fetch('/api/viajes', { signal: request.signal });
        if (!response.ok) throw new Error('No se pudieron cargar los viajes');
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Respuesta inválida');
        setViajes(data);
        setError(false);
      } catch {
        if (!request.signal.aborted) setError(true);
      }
    };
    window.addEventListener('viajes-updated', actualizar);
    return () => {
      controller?.abort();
      window.removeEventListener('viajes-updated', actualizar);
    };
  }, []);

  const resumen = calcularResumenDetracciones(viajes);
  const proporcion = resumen.totalViajes > 0 ? resumen.pendientesCount / resumen.totalViajes : 0;
  const circunferencia = 2 * Math.PI * 58;
  const monto = `S/ ${soles.format(resumen.pendientesMonto)}`;
  const porMes = new Map<string, { etiqueta: string; cantidad: number }>();
  for (const viaje of viajes) {
    if (viaje.tipo !== 'viaje' || viaje.detraccion !== 'pendiente') continue;
    const fecha = viaje.fecha_traslado?.slice(0, 7);
    const mesValido = /^\d{4}-(0[1-9]|1[0-2])$/.test(fecha ?? '') && !fecha.startsWith('1900');
    const clave = mesValido ? fecha : 'sin-fecha';
    const grupo = porMes.get(clave) ?? {
      etiqueta: mesValido ? nombreMes.format(new Date(`${fecha}-01T12:00:00Z`)) : 'Sin fecha',
      cantidad: 0,
    };
    grupo.cantidad++;
    porMes.set(clave, grupo);
  }
  const mesesPendientes = [...porMes.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <section
      aria-label="Resumen de detracciones"
      className="mt-3 overflow-hidden"
      style={{ background: 'var(--white)', borderRadius: 'var(--r-panel)', boxShadow: 'var(--shadow-card)' }}
    >
      <div className="px-4 pt-4 pb-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Detracciones</h2>

        <div className="relative mx-auto my-1 h-24 w-24" role="img"
          aria-label={`${resumen.pendientesCount} pendientes y ${resumen.pagadasCount} pagadas de ${resumen.totalViajes} detracciones. ${monto} por pagar.`}>
          <svg viewBox="0 0 144 144" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="72" cy="72" r="58" fill="none" stroke={resumen.totalViajes ? 'var(--ink)' : 'var(--canvas)'} strokeWidth="12" />
            {proporcion > 0 && (
              <circle cx="72" cy="72" r="58" fill="none" stroke="var(--signal-light)" strokeWidth="12"
                strokeDasharray={`${proporcion * circunferencia} ${circunferencia}`}
                className="transition-[stroke-dasharray] duration-500 motion-reduce:transition-none" />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
            <span className="text-3xl font-semibold tabular-nums leading-none tracking-tight" style={{ color: 'var(--ink)' }}>{resumen.pendientesCount}</span>
            <span className="mt-1 text-xs" style={{ color: 'var(--slate)' }}>pendientes</span>
          </div>
        </div>

        <div className="text-center" aria-live="polite" aria-atomic="true">
          <p className="text-[11px]" style={{ color: 'var(--slate)' }}>Total por pagar</p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight break-words" style={{ color: resumen.pendientesCount ? 'var(--signal)' : 'var(--ink)' }}>{monto}</p>
          <span className="sr-only">{resumen.pendientesCount} detracciones pendientes</span>
        </div>

        <dl className="mt-2 flex flex-wrap justify-between gap-x-2 gap-y-1 text-[11px] tabular-nums">
          <div className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-2" style={{ color: 'var(--slate)' }}><span className="h-2 w-2 rounded-full" style={{ background: 'var(--signal-light)' }} />Pendientes</dt>
            <dd className="font-semibold">{resumen.pendientesCount}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="flex items-center gap-2" style={{ color: 'var(--slate)' }}><span className="h-2 w-2 rounded-full" style={{ background: 'var(--ink)' }} />Pagadas</dt>
            <dd className="font-semibold">{resumen.pagadasCount}</dd>
          </div>
        </dl>
        {mesesPendientes.length > 0 && (
          <div className="mt-2 border-t pt-2" style={{ borderColor: 'var(--canvas)' }}>
            <p className="mb-1 text-[11px] font-medium" style={{ color: 'var(--slate)' }}>Pendientes por mes</p>
            <div className="scrollbar-hidden max-h-[72px] overflow-y-auto overscroll-contain rounded-sm focus-visible:outline-2 focus-visible:outline-[var(--signal)]"
              tabIndex={0} role="region" aria-label="Pendientes por mes, del más antiguo al más reciente">
              <dl className="text-xs tabular-nums">
                {mesesPendientes.map(([clave, mes]) => (
                  <div key={clave} className="flex min-h-6 items-center justify-between gap-2 pr-1">
                    <dt className="capitalize" style={{ color: 'var(--slate)' }}>{mes.etiqueta}</dt>
                    <dd className="font-semibold" style={{ color: 'var(--signal)' }}>{mes.cantidad}<span className="sr-only"> pendientes</span></dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}
        {resumen.totalViajes === 0 && <p className="mt-3 text-center text-xs" style={{ color: 'var(--slate)' }}>Aún no hay viajes registrados.</p>}
        {resumen.totalViajes > 0 && resumen.pendientesCount === 0 && <p className="mt-3 text-center text-xs" style={{ color: 'var(--slate)' }}>Estás al día con tus detracciones.</p>}
        {error && <p role="status" className="mt-3 text-xs" style={{ color: 'var(--signal)' }}>No se pudo actualizar. Se muestra el último resumen disponible.</p>}
      </div>
      <Link href="/detracciones"
        className="flex min-h-9 items-center justify-center gap-1.5 text-xs font-medium transition-colors hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--signal)]"
        style={{ borderTop: '1px solid var(--canvas)', color: 'var(--ink)' }}>
        Ver detracciones <ArrowUpRight size={14} aria-hidden="true" />
      </Link>
    </section>
  );
}
