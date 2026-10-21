'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { addDays, addMonths, endOfMonth, format, isValid, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import styles from './FechaPicker.module.css';

const iso = (date: Date) => format(date, 'yyyy-MM-dd');

export default function FechaPicker({ id, label, value, onChange }: {
  id: string; label: string; value: string; onChange: (value: string) => void;
}) {
  const dialogId = useId();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [focused, setFocused] = useState('');
  const [view, setView] = useState<'days' | 'months' | 'years'>('days');
  const [position, setPosition] = useState({ top: 12, left: 12, maxHeight: 480 });
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const days = useRef<Record<string, HTMLButtonElement | null>>({});
  const today = iso(new Date());
  const selected = value && isValid(parseISO(value)) ? value : '';

  function close() { setOpen(false); trigger.current?.focus({ preventScroll: true }); }
  function show() {
    const date = selected ? parseISO(selected) : new Date();
    setMonth(startOfMonth(date)); setFocused(iso(date)); setView('days'); setOpen(true);
  }

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const viewport = window.visualViewport;
      const height = viewport?.height ?? window.innerHeight;
      const width = viewport?.width ?? window.innerWidth;
      const offset = viewport?.offsetTop ?? 0;
      const panelHeight = Math.min(panel.current?.offsetHeight ?? 400, height - 24);
      const below = height + offset - rect.bottom - 8;
      setPosition({
        left: Math.max(12, Math.min(rect.left, width - 340)),
        top: Math.max(offset + 12, Math.min(below >= panelHeight ? rect.bottom + 8 : rect.top - panelHeight - 8, height + offset - panelHeight - 12)),
        maxHeight: height - 24,
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    window.visualViewport?.addEventListener('resize', place);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      window.visualViewport?.removeEventListener('resize', place);
    };
  }, [open, view]);

  useEffect(() => {
    if (open) {
      if (view === 'days') days.current[focused]?.focus({ preventScroll: true });
      else panel.current?.querySelector<HTMLButtonElement>('[data-choice="true"]')?.focus({ preventScroll: true });
    }
  }, [open, focused, view]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  function move(amount: number) {
    const next = addMonths(month, amount * (view === 'days' ? 1 : view === 'months' ? 12 : 144));
    setMonth(next); setFocused(iso(next));
  }
  function select(date: string) { onChange(date); close(); }

  const first = startOfWeek(month, { weekStartsOn: 1 });
  const dates = Array.from({ length: 42 }, (_, index) => addDays(first, index));
  const yearStart = Math.floor(month.getFullYear() / 12) * 12;

  return (
    <>
      <button ref={trigger} id={id} type="button" className={styles.trigger} data-empty={!selected}
        aria-label={`${label}: ${selected ? format(parseISO(selected), 'dd MMMM yyyy', { locale: es }) : 'Elegir fecha'}`}
        aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? dialogId : undefined} onClick={open ? close : show}>
        <span>{selected ? format(parseISO(selected), 'dd MMM yyyy', { locale: es }) : 'Elegir fecha'}</span>
        <CalendarDays size={17} aria-hidden="true" />
      </button>
      {open && createPortal(
        <div ref={panel} id={dialogId} role="dialog" aria-modal="true" aria-label={`Elegir ${label.toLowerCase()}`}
          data-date-picker-panel className={styles.panel} style={position}
          onKeyDown={event => {
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
            if (event.key === 'Tab') {
              const elements = [...(panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])].filter(el => el.tabIndex >= 0);
              const first = elements[0]; const last = elements.at(-1);
              if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
              else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
            }
          }}>
          <div className={styles.heading}><span>{label}</span><button type="button" aria-label="Cerrar calendario" onClick={close}><X size={17} /></button></div>
          <div className={styles.nav}>
            <button type="button" aria-label={view === 'days' ? 'Mes anterior' : 'Años anteriores'} onClick={() => move(-1)}><ChevronLeft size={18} /></button>
            <div aria-live="polite">
              <button type="button" onClick={() => setView(view === 'months' ? 'days' : 'months')}>{format(month, 'MMMM', { locale: es })}</button>
              <button type="button" onClick={() => setView(view === 'years' ? 'days' : 'years')}>{view === 'years' ? `${yearStart} – ${yearStart + 11}` : month.getFullYear()}</button>
            </div>
            <button type="button" aria-label={view === 'days' ? 'Mes siguiente' : 'Años siguientes'} onClick={() => move(1)}><ChevronRight size={18} /></button>
          </div>
          {view === 'days' ? <div role="grid" aria-label={format(month, 'MMMM yyyy', { locale: es })}>
            <div role="row" className={styles.week}>{['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map(day => <span role="columnheader" key={day} className={styles.weekday}>{day}</span>)}</div>
            {Array.from({ length: 6 }, (_, row) => <div key={row} role="row" className={styles.week}>
              {dates.slice(row * 7, row * 7 + 7).map(date => {
                const day = iso(date);
                return <div role="gridcell" aria-selected={selected === day} key={day}>
                  <button type="button" ref={el => { days.current[day] = el; }} className={styles.day}
                    tabIndex={focused === day ? 0 : -1} data-selected={selected === day} data-outside={date.getMonth() !== month.getMonth()}
                    aria-current={today === day ? 'date' : undefined} aria-label={format(date, "EEEE d 'de' MMMM yyyy", { locale: es })}
                    onClick={() => select(day)} onKeyDown={event => {
                      let next: Date;
                      switch (event.key) {
                        case 'ArrowLeft': next = addDays(date, -1); break;
                        case 'ArrowRight': next = addDays(date, 1); break;
                        case 'ArrowUp': next = addDays(date, -7); break;
                        case 'ArrowDown': next = addDays(date, 7); break;
                        case 'Home': next = startOfWeek(date, { weekStartsOn: 1 }); break;
                        case 'End': next = addDays(startOfWeek(date, { weekStartsOn: 1 }), 6); break;
                        case 'PageUp': next = addMonths(date, -1); break;
                        case 'PageDown': next = addMonths(date, 1); break;
                        default: return;
                      }
                      event.preventDefault(); setFocused(iso(next));
                      if (next < month || next > endOfMonth(month)) setMonth(startOfMonth(next));
                    }}>{date.getDate()}</button>
                </div>;
              })}
            </div>)}
          </div> : <div className={styles.choices}>
            {Array.from({ length: 12 }, (_, index) => {
              const date = view === 'months' ? new Date(month.getFullYear(), index, 1) : new Date(yearStart + index, month.getMonth(), 1);
              return <button type="button" key={index} data-choice="true" onClick={() => {
                setMonth(date); setFocused(iso(date)); setView(view === 'years' ? 'months' : 'days');
              }}>{view === 'months' ? format(date, 'MMM', { locale: es }) : date.getFullYear()}</button>;
            })}
          </div>}
          <div className={styles.footer}>
            <button type="button" disabled={!selected} onClick={() => { onChange(''); close(); }}>Limpiar</button>
            <button type="button" onClick={() => select(today)}>Seleccionar hoy</button>
          </div>
        </div>, document.body,
      )}
    </>
  );
}
