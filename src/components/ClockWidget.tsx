'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DIAS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio',
  'Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function ClockWidget() {
  const [now, setNow] = useState<Date | null>(null);
  const [viewDate, setViewDate] = useState(() => new Date());

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');
  const h = now ? pad(now.getHours())   : '──';
  const m = now ? pad(now.getMinutes()) : '──';
  const s = now ? pad(now.getSeconds()) : '──';

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="card-stadium overflow-hidden">

      {/* Clock */}
      <div className="px-5 py-6" style={{ background: 'var(--ink)' }}>
        <div className="flex items-center justify-center gap-1.5">
          {[
            { val: h, label: 'HORAS' },
            { val: m, label: 'MINUTOS' },
            { val: s, label: 'SEGUNDOS' },
          ].map(({ val, label }, i) => (
            <div key={label} className="flex items-center gap-1.5">
              {i > 0 && (
                <span style={{ color: 'rgba(243,240,238,.3)', fontSize: 20, fontWeight: 200, lineHeight: 1 }}>
                  :
                </span>
              )}
              <div className="flex flex-col items-center gap-1">
                <span style={{
                  fontVariantNumeric: 'tabular-nums',
                  fontFamily: 'monospace',
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color: 'var(--canvas)',
                  lineHeight: 1,
                }}>
                  {val}
                </span>
                <span style={{
                  fontSize: 7,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: 'rgba(243,240,238,.38)',
                }}>
                  {label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="p-4" style={{ background: 'var(--white)' }}>

        {/* Nav */}
        <div className="flex items-center justify-between mb-3 px-0.5">
          <button
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style={{ color: 'var(--slate)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--canvas)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <ChevronLeft size={13} />
          </button>
          <p style={{ fontWeight: 600, fontSize: 13, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
            {MESES_ES[month]} {year}
          </p>
          <button
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style={{ color: 'var(--slate)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--canvas)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <ChevronRight size={13} />
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 mb-0.5">
          {DIAS.map(d => (
            <div key={d} className="text-center py-0.5"
              style={{ fontSize: 9, fontWeight: 700, color: 'var(--dust)', letterSpacing: '0.05em' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => (
            <div key={i} className="flex items-center justify-center" style={{ height: 27 }}>
              {day && (
                <div className="w-7 h-7 flex items-center justify-center" style={{
                  borderRadius: '50%',
                  background: isToday(day) ? 'var(--ink)' : 'transparent',
                  color: isToday(day) ? 'var(--canvas)' : 'var(--ink)',
                  fontWeight: isToday(day) ? 700 : 400,
                  fontSize: 11,
                }}>
                  {day}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
