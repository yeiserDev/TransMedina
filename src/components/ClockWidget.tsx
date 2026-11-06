'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Viaje } from '@/types';
import CalendarDayModal from './CalendarDayModal';

const DIAS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
const MESES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
  'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function ClockWidget({ initialViajes }: { initialViajes?: Viaje[] }) {
  const [now, setNow] = useState<Date | null>(null);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [viajes, setViajes] = useState<Viaje[]>(initialViajes ?? []);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setNow(new Date()));
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => { cancelAnimationFrame(frame); clearInterval(id); };
  }, []);

  useEffect(() => {
    let controller: AbortController | undefined;
    const refresh = async () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const response = await fetch('/api/viajes', { signal: request.signal });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error();
        setViajes(data);
        setLoadError(false);
      } catch {
        if (!request.signal.aborted) setLoadError(true);
      }
    };
    if (!initialViajes) void refresh();
    window.addEventListener('viajes-updated', refresh);
    return () => { controller?.abort(); window.removeEventListener('viajes-updated', refresh); };
  }, [initialViajes]);

  // Build a map: 'YYYY-MM-DD' → count of viajes
  const viajesDates = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of viajes) {
      if (v.tipo !== 'viaje') continue;
      if (!v.fecha_traslado || v.fecha_traslado.startsWith('1900')) continue;
      map.set(v.fecha_traslado, (map.get(v.fecha_traslado) ?? 0) + 1);
    }
    return map;
  }, [viajes]);

  const pad = (n: number) => String(n).padStart(2, '0');
  const h = now ? pad(now.getHours()) : '──';
  const m = now ? pad(now.getMinutes()) : '──';
  const s = now ? pad(now.getSeconds()) : '──';

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const dayKey = (d: number) => {
    const yy = year;
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  const handleDayClick = (d: number) => {
    const key = dayKey(d);
    if (!viajesDates.has(key)) return;
    setSelectedDate(key);
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <>
    <div className="card-stadium overflow-hidden" style={{ borderRadius: 'var(--r-panel)' }}>

      {/* Clock */}
      <div className="px-5 py-6" style={{ background: 'var(--ink)' }}>
        <div className="flex items-center justify-center gap-2">
          {[
            { val: h, label: 'HORAS' },
            { val: m, label: 'MIN' },
            { val: s, label: 'SEG' },
          ].map(({ val, label }, i) => (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && (
                <span style={{ color: 'rgba(243,240,238,.3)', fontSize: 24, fontWeight: 200, lineHeight: 1 }}>:</span>
              )}
              <div className="flex flex-col items-center gap-1">
                <span style={{
                  fontVariantNumeric: 'tabular-nums',
                  fontFamily: 'monospace',
                  fontSize: 32,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: 'var(--canvas)',
                  lineHeight: 1,
                }}>
                  {val}
                </span>
                <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(243,240,238,.38)' }}>
                  {label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="px-4 pt-4 pb-5" style={{ background: 'var(--white)' }}>

        {/* Nav */}
        <div className="flex items-center justify-between mb-4 px-0.5">
          <button
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            aria-label="Mes anterior"
            className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center transition-colors"
            style={{ color: 'var(--slate)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--canvas)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <ChevronLeft size={14} />
          </button>
          <p className="text-center" style={{ fontWeight: 700, fontSize: 12, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
            {MESES_ES[month]} {year}
          </p>
          <button
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            aria-label="Mes siguiente"
            className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center transition-colors"
            style={{ color: 'var(--slate)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--canvas)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 mb-1">
          {DIAS.map(d => (
            <div key={d} className="text-center py-1"
              style={{ fontSize: 9, fontWeight: 700, color: 'var(--dust)', letterSpacing: '0.05em' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 mb-2 px-0.5">
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--signal-light)', flexShrink: 0 }} />
          <span style={{ fontSize: 9, color: 'var(--slate)', fontWeight: 450 }}>Día con viaje · ver detalle</span>
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const key = dayKey(day);
            const count = viajesDates.get(key) ?? 0;
            const hasViaje = count > 0;
            const today_ = isToday(day);

            return (
              <button
                key={i}
                aria-label={`${day} de ${MESES_ES[month]} de ${year}${hasViaje ? `, ${count} viajes. Ver viajes de este día` : ''}`}
                onClick={() => handleDayClick(day)}
                disabled={!hasViaje}
                aria-haspopup={hasViaje ? 'dialog' : undefined}
                className="flex flex-col items-center justify-center transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)]"
                style={{
                  height: 38,
                  borderRadius: 10,
                  cursor: hasViaje ? 'pointer' : 'default',
                  background: today_ ? 'var(--ink)' : hasViaje ? 'rgba(243,115,56,.08)' : 'transparent',
                  border: hasViaje && !today_ ? '1px solid rgba(243,115,56,.25)' : '1px solid transparent',
                }}
                onMouseEnter={e => {
                  if (hasViaje && !today_)
                    (e.currentTarget as HTMLElement).style.background = 'rgba(243,115,56,.18)';
                }}
                onMouseLeave={e => {
                  if (hasViaje && !today_)
                    (e.currentTarget as HTMLElement).style.background = 'rgba(243,115,56,.08)';
                }}
              >
                <span style={{
                  fontWeight: today_ ? 700 : hasViaje ? 600 : 400,
                  fontSize: 12,
                  color: today_ ? 'var(--canvas)' : hasViaje ? 'var(--signal)' : 'var(--ink)',
                  lineHeight: 1,
                }}>
                  {day}
                </span>
                {hasViaje && (
                  <span style={{
                    fontSize: 8,
                    fontWeight: 700,
                    color: today_ ? 'rgba(255,255,255,.7)' : 'var(--signal-light)',
                    lineHeight: 1,
                    marginTop: 2,
                  }}>
                    {count > 1 ? `×${count}` : '·'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {loadError && <p role="status" className="mt-2 text-[11px]" style={{ color: 'var(--signal)' }}>No se pudo actualizar el calendario. Recarga para reintentar.</p>}
      </div>
    </div>
    {selectedDate && <CalendarDayModal date={selectedDate} viajes={viajes.filter(v => v.tipo === 'viaje' && v.fecha_traslado === selectedDate)} onClose={() => setSelectedDate(null)} />}
    </>
  );
}
