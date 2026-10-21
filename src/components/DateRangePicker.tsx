'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { addDays, addMonths, endOfMonth, format, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import styles from './DateRangePicker.module.css';

type Field = 'desde' | 'hasta';
type Range = { fecha_desde?: string; fecha_hasta?: string };

const iso = (date: Date) => format(date, 'yyyy-MM-dd');
const display = (value?: string) => value ? format(parseISO(value), 'dd MMM yyyy', { locale: es }) : 'Elegir fecha';

export default function DateRangePicker({ fecha_desde, fecha_hasta, onChange }: Range & {
  onChange: (range: Range) => void;
}) {
  const id = useId();
  const [field, setField] = useState<Field | null>(null);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [focused, setFocused] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0, maxHeight: 480 });
  const anchor = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const triggers = useRef<Partial<Record<Field, HTMLButtonElement | null>>>({});
  const days = useRef<Record<string, HTMLButtonElement | null>>({});
  const returnTo = useRef<Field>('desde');
  const hasRange = Boolean(fecha_desde || fecha_hasta);

  const close = () => {
    setField(null);
    triggers.current[returnTo.current]?.focus();
  };

  const open = (next: Field) => {
    returnTo.current = next;
    const value = (next === 'desde' ? fecha_desde : fecha_hasta) || fecha_desde || iso(new Date());
    setMonth(startOfMonth(parseISO(value)));
    setFocused(value);
    setField(current => current === next ? null : next);
  };

  useLayoutEffect(() => {
    if (!field) return;
    const place = () => {
      const rect = anchor.current?.getBoundingClientRect();
      if (!rect) return;
      const height = panel.current?.getBoundingClientRect().height || 430;
      const below = window.innerHeight - rect.bottom - 16;
      const above = rect.top - 16;
      const upwards = below < height && above > below;
      setPosition({
        left: Math.max(12, Math.min(rect.left, window.innerWidth - 340)),
        top: upwards ? Math.max(12, rect.top - Math.min(height, above) - 8) : rect.bottom + 8,
        maxHeight: Math.max(120, upwards ? above : below),
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [field]);

  useEffect(() => {
    if (!field) return;
    days.current[focused]?.focus({ preventScroll: true });
  }, [field, focused, month]);

  useEffect(() => {
    if (!field) return;
    const outside = (event: Event) => {
      if (!anchor.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) setField(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setField(null);
        triggers.current[returnTo.current]?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [field]);

  const select = (value: string) => {
    if (field === 'desde') {
      onChange({ fecha_desde: value, fecha_hasta: fecha_hasta && fecha_hasta >= value ? fecha_hasta : undefined });
      setField('hasta');
      setFocused(value);
    } else {
      onChange({ fecha_desde, fecha_hasta: value });
      close();
    }
  };

  const moveMonth = (amount: number) => {
    const next = addMonths(month, amount);
    setMonth(next);
    setFocused(field === 'hasta' && fecha_desde && fecha_desde > iso(next) && fecha_desde <= iso(endOfMonth(next)) ? fecha_desde : iso(next));
  };

  const first = startOfWeek(month, { weekStartsOn: 1 });
  const dates = Array.from({ length: 42 }, (_, i) => addDays(first, i));
  const today = iso(new Date());

  return (
    <div ref={anchor} className={styles.triggerGroup} data-active={hasRange || !!field}>
      <CalendarDays size={14} aria-hidden="true" className={styles.calendarIcon} />
      {(['desde', 'hasta'] as const).map((item, index) => (
        <span key={item} className={styles.triggerPart}>
          {index === 1 && <ArrowRight size={12} aria-hidden="true" className={styles.arrow} />}
          <button type="button" ref={el => { triggers.current[item] = el; }}
            className={styles.trigger} onClick={() => open(item)}
            aria-label={`${item === 'desde' ? 'Desde' : 'Hasta'}: ${display(item === 'desde' ? fecha_desde : fecha_hasta)}`}
            aria-haspopup="dialog" aria-expanded={field === item} aria-controls={field ? id : undefined}>
            <span className={styles.triggerLabel}>{item === 'desde' ? 'Desde' : 'Hasta'}</span>
            <span>{display(item === 'desde' ? fecha_desde : fecha_hasta)}</span>
          </button>
        </span>
      ))}
      {hasRange && <button type="button" className={styles.clearTrigger} aria-label="Limpiar rango de fechas"
        onClick={() => { onChange({}); setField(null); }}><X size={13} /></button>}

      {field && createPortal(
        <div ref={panel} id={id} role="dialog" aria-label="Seleccionar rango de fechas" className={styles.panel}
          style={{ top: position.top, left: position.left, maxHeight: position.maxHeight }}>
          <div className={styles.heading}>
            <h2>Seleccionar fechas</h2>
            <button type="button" className={styles.iconButton} aria-label="Cerrar calendario" onClick={close}><X size={16} /></button>
          </div>
          <div className={styles.rangeFields}>
            {(['desde', 'hasta'] as const).map(item => (
              <button key={item} type="button" data-selected={field === item} onClick={() => {
                setField(item);
                const value = (item === 'desde' ? fecha_desde : fecha_hasta) || fecha_desde || today;
                setMonth(startOfMonth(parseISO(value)));
                setFocused(value);
              }}>
                <span>{item === 'desde' ? 'Desde' : 'Hasta'}</span>
                <strong>{display(item === 'desde' ? fecha_desde : fecha_hasta)}</strong>
              </button>
            ))}
          </div>
          <div className={styles.monthNav}>
            <button type="button" className={styles.iconButton} aria-label="Mes anterior" onClick={() => moveMonth(-1)}><ChevronLeft size={17} /></button>
            <span aria-live="polite">{format(month, 'MMMM yyyy', { locale: es })}</span>
            <button type="button" className={styles.iconButton} aria-label="Mes siguiente" onClick={() => moveMonth(1)}><ChevronRight size={17} /></button>
          </div>
          <div role="grid" aria-label={format(month, 'MMMM yyyy', { locale: es })} className={styles.grid}>
            <div role="row" className={styles.week}>
              {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map(day => <span role="columnheader" key={day} className={styles.weekday}>{day}</span>)}
            </div>
            {Array.from({ length: 6 }, (_, row) => <div role="row" key={row} className={styles.week}>
              {dates.slice(row * 7, row * 7 + 7).map(date => {
                const value = iso(date);
                const endpoint = value === fecha_desde || value === fecha_hasta;
                const disabled = field === 'hasta' && !!fecha_desde && value < fecha_desde;
                return <div role="gridcell" key={value} aria-selected={endpoint}
                  className={styles.cell} data-between={!!fecha_desde && !!fecha_hasta && value > fecha_desde && value < fecha_hasta}
                  data-start={value === fecha_desde && !!fecha_hasta} data-end={value === fecha_hasta && !!fecha_desde}>
                  <button type="button" ref={el => { days.current[value] = el; }} className={styles.day}
                    tabIndex={value === focused ? 0 : -1} disabled={disabled}
                    data-outside={date.getMonth() !== month.getMonth()} data-selected={endpoint} data-today={value === today}
                    aria-current={value === today ? 'date' : undefined}
                    aria-label={format(date, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
                    onClick={() => select(value)} onKeyDown={event => {
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
                      event.preventDefault();
                      if (field === 'hasta' && fecha_desde && iso(next) < fecha_desde) next = parseISO(fecha_desde);
                      setFocused(iso(next));
                      if (next < month || next > endOfMonth(month)) setMonth(startOfMonth(next));
                    }}>{date.getDate()}</button>
                </div>;
              })}
            </div>)}
          </div>
          <p className={styles.hint} aria-live="polite">{field === 'desde' ? 'Elige la fecha de inicio.' : 'Elige la fecha de fin.'}</p>
          <div className={styles.footer}>
            <button type="button" className={styles.clearButton} disabled={!hasRange} onClick={() => { onChange({}); close(); }}>Limpiar fechas</button>
            <button type="button" className={styles.todayButton}
              disabled={field === 'hasta' && !!fecha_desde && fecha_desde > today} onClick={() => {
              setMonth(startOfMonth(parseISO(today)));
              setFocused(today);
            }}>Ir a hoy</button>
          </div>
        </div>, document.body,
      )}
    </div>
  );
}
