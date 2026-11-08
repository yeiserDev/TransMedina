'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Viaje } from '@/types';
import CalendarDayModal from './CalendarDayModal';
import styles from './ClockWidget.module.css';

const DIAS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
const MESES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
  'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function ClockWidget({ initialViajes }: { initialViajes?: Viaje[] }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [viajes, setViajes] = useState<Viaje[]>(initialViajes ?? []);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

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

  const dates = useMemo(() => {
    const map = new Map<string, { count: number; retorno: boolean }>();
    for (const v of viajes) {
      if (v.tipo !== 'viaje' || !v.fecha_traslado || v.fecha_traslado.startsWith('1900')) continue;
      const previous = map.get(v.fecha_traslado);
      map.set(v.fecha_traslado, { count: (previous?.count ?? 0) + 1, retorno: !!previous?.retorno || Number(v.monto) === 0 });
    }
    return map;
  }, [viajes]);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const today = new Date();
  const cells: (number | null)[] = Array(new Date(year, month, 1).getDay()).fill(null);
  for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) cells.push(day);
  const monthTrips = [...dates].reduce((sum, [date, value]) => sum + (date.startsWith(prefix) ? value.count : 0), 0);

  return <>
    <section className={styles.calendar} aria-label="Calendario de viajes">
      <header className={styles.header}>
      <div className={styles.heading}><h2>Calendario</h2><button className={styles.today} onClick={() => setViewDate(new Date())}>Hoy</button></div>
      <div className={styles.navigation}>
        <button aria-label="Mes anterior" onClick={() => setViewDate(new Date(year, month - 1, 1))}><ChevronLeft size={16} /></button>
        <div aria-live="polite"><strong>{MESES_ES[month]}</strong><span>{year}</span></div>
        <button aria-label="Mes siguiente" onClick={() => setViewDate(new Date(year, month + 1, 1))}><ChevronRight size={16} /></button>
      </div>
      </header>
      <div className={styles.grid}>
        {DIAS.map(d => <span key={d} className={styles.weekday}>{d}</span>)}
        {cells.map((day, i) => {
          if (!day) return <span key={`empty-${i}`} />;
          const key = `${prefix}-${String(day).padStart(2, '0')}`;
          const { count = 0, retorno = false } = dates.get(key) ?? {};
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          return <button key={key} className={styles.day} data-kind={retorno ? 'retorno' : count ? 'viaje' : undefined}
            aria-current={isToday ? 'date' : undefined}
            aria-label={`${day} de ${MESES_ES[month]} de ${year}${isToday ? ', hoy' : ''}, ${count} viajes${retorno ? ', retorno gratis' : ''}`}
            title={count ? `${count} viajes${retorno ? ' · Retorno gratis' : ''}` : undefined}
            disabled={!count} aria-haspopup={count ? 'dialog' : undefined} onClick={() => setSelectedDate(key)}>
            <span>{day}</span><small aria-hidden="true">{count > 1 ? `×${count}` : count ? '·' : '\u00a0'}</small>
          </button>;
        })}
      </div>
      <footer className={styles.footer}>
        <div className={styles.legend}><span><i data-kind="viaje" />Viaje</span><span><i data-kind="retorno" />Retorno gratis</span></div>
        <p>{monthTrips === 0 ? 'Sin viajes este mes' : `${monthTrips} ${monthTrips === 1 ? 'viaje' : 'viajes'} este mes · toca un día`}</p>
      </footer>
      {loadError && <p role="status" className={styles.error}>No se pudo actualizar. Recarga para reintentar.</p>}
    </section>
    {selectedDate && <CalendarDayModal date={selectedDate} viajes={viajes.filter(v => v.tipo === 'viaje' && v.fecha_traslado === selectedDate)} onClose={() => setSelectedDate(null)} />}
  </>;
}
  
