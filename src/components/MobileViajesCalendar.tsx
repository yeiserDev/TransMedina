'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { addDays, addMonths, format, parseISO, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowDownCircle, ChevronLeft, ChevronRight, Truck, Wallet } from 'lucide-react';
import type { Viaje } from '@/types';
import { agruparCalendario, fechaRegistro } from '@/lib/calendario-viajes';
import { cadenaDe, nombreCadena } from '@/lib/cadenas';
import CadenaLabel from './CadenaLabel';
import styles from './MobileViajesCalendar.module.css';

const money = (monto: number) => `S/ ${Number(monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

export default function MobileViajesCalendar({ viajes, mes, onMonthChange, onOpen, loading }: {
  viajes: Viaje[]; mes: string; onMonthChange: (mes: string) => void; onOpen: (id: string) => void; loading: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [verSinFecha, setVerSinFecha] = useState(false);
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});
  const datos = useMemo(() => agruparCalendario(viajes, mes), [viajes, mes]);
  const month = parseISO(`${mes}-01`);
  const first = startOfWeek(month, { weekStartsOn: 1 });
  const offset = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const dates = Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, index) => addDays(first, index));
  const today = format(new Date(), 'yyyy-MM-dd');
  const ultimo = [...datos.dias.keys()].sort().at(-1);
  const selectedDay = selected?.startsWith(`${mes}-`) ? selected : ultimo ?? `${mes}-01`;
  const registros = verSinFecha ? datos.sinFecha : datos.dias.get(selectedDay) ?? [];
  const showAgenda = verSinFecha || Boolean(selected?.startsWith(`${mes}-`) && registros.length !== 1);
  const years = [...new Set([month.getFullYear(), new Date().getFullYear(), 2025, 2026,
    ...viajes.flatMap(v => fechaRegistro(v)?.slice(0, 4) ?? []).map(Number)])].sort((a, b) => b - a);

  const navigate = (next: string) => { setSelected(null); setVerSinFecha(false); onMonthChange(next); };
  const chooseDay = (date: string) => {
    setSelected(date);
    setVerSinFecha(false);
    const items = datos.dias.get(date) ?? [];
    if (items.length === 1) onOpen(items[0].id);
  };

  return <section className={styles.calendar} aria-label="Calendario de viajes" aria-busy={loading}>
    <header className={styles.header}>
      <button type="button" onClick={() => navigate(format(addMonths(month, -1), 'yyyy-MM'))} aria-label="Mes anterior"><ChevronLeft size={20} /></button>
      <div className={styles.period}>
        <select aria-label="Mes del calendario" value={month.getMonth()} onChange={e => navigate(`${month.getFullYear()}-${String(Number(e.target.value) + 1).padStart(2, '0')}`)}>
          {Array.from({ length: 12 }, (_, m) => <option key={m} value={m}>{format(new Date(2026, m, 1), 'MMMM', { locale: es })}</option>)}
        </select>
        <select aria-label="Año del calendario" value={month.getFullYear()} onChange={e => navigate(`${e.target.value}-${mes.slice(5)}`)}>
          {years.map(year => <option key={year} value={year}>{year}</option>)}
        </select>
      </div>
      <button type="button" onClick={() => navigate(format(addMonths(month, 1), 'yyyy-MM'))} aria-label="Mes siguiente"><ChevronRight size={20} /></button>
    </header>
    <div className={styles.monthSummary}><span>{datos.totalViajes} viajes · {datos.depositos} depósitos</span><button type="button" onClick={() => { navigate(today.slice(0, 7)); setSelected(today); }}>Hoy</button></div>
    <div className={styles.weekdays} aria-hidden="true">{['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map(day => <span key={day}>{day}</span>)}</div>
    {loading ? <div className={`skeleton ${styles.loading}`} role="status" aria-label="Cargando calendario" /> :
      <div className={styles.grid} role="group" aria-label={format(month, 'MMMM yyyy', { locale: es })}>
        {dates.map(date => {
          const key = format(date, 'yyyy-MM-dd');
          const outside = !key.startsWith(`${mes}-`);
          const items = datos.dias.get(key) ?? [];
          const groups = [...new Map(items.map(v => [`${v.tipo}-${cadenaDe(v)}`, v])).values()];
          const label = `${format(date, "EEEE d 'de' MMMM", { locale: es })}${items.length ? `: ${items.map(v => v.tipo === 'viaje' ? `Viaje ${nombreCadena(cadenaDe(v))}` : v.tipo === 'deposito' ? 'Depósito' : 'Saldo').join(', ')}` : ', sin movimientos'}`;
          return <button type="button" key={key} ref={el => { buttons.current[key] = el; }}
            className={styles.day} disabled={outside} data-selected={!verSinFecha && key === selectedDay} data-today={key === today} data-outside={outside}
            aria-label={label} aria-pressed={!verSinFecha && key === selectedDay} aria-current={key === today ? 'date' : undefined}
            onClick={() => chooseDay(key)} onKeyDown={event => {
              const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
              if (step === undefined) return;
              event.preventDefault();
              buttons.current[format(addDays(date, step), 'yyyy-MM-dd')]?.focus();
            }}>
            <span className={styles.dayNumber}>{date.getDate()}</span>
            <span className={styles.markers} aria-hidden="true">
              {groups.slice(0, 2).map(v => {
                const cadena = cadenaDe(v);
                return <span key={`${v.tipo}-${cadena}`} className={styles.marker} data-deposito={v.tipo === 'deposito'}>
                  {v.tipo === 'viaje' ? <Truck size={12} /> : v.tipo === 'deposito' ? <ArrowDownCircle size={12} /> : <Wallet size={12} />}
                  {v.tipo === 'viaje' && cadena && <Image src={cadena === 'ripley' ? '/brands/ripley.ico' : '/brands/oechsle.svg'} alt="" width={cadena === 'ripley' ? 11 : 16} height={11} unoptimized />}
                </span>;
              })}
              {items.length > 1 && <span className={styles.count}>{items.length}</span>}
            </span>
          </button>;
        })}
      </div>}
    <div className={styles.legend}><span><Truck size={12} /> Viaje</span><span><ArrowDownCircle size={12} /> Depósito</span><span>Toca una fecha para ver el detalle</span></div>
    {showAgenda && <div className={styles.agenda} aria-live="polite">
      <div className={styles.agendaHeading}><h2>{verSinFecha ? 'Registros sin fecha' : format(parseISO(selectedDay), "EEEE d 'de' MMMM", { locale: es })}</h2><span>{registros.length}</span></div>
      <div className={styles.agendaList}>
        {registros.length === 0 ? <p className={styles.empty}>No hay movimientos para esta fecha{viajes.length === 0 ? '. Revisa los filtros activos.' : '.'}</p>
          : registros.map(v => <button type="button" key={v.id} className={styles.agendaItem} onClick={() => onOpen(v.id)}>
            <span className={styles.agendaIcon} data-deposito={v.tipo === 'deposito'}>{v.tipo === 'viaje' ? <Truck size={18} /> : v.tipo === 'deposito' ? <ArrowDownCircle size={18} /> : <Wallet size={18} />}</span>
            <span className={styles.agendaInfo}><strong>{v.tipo === 'viaje' ? v.descripcion : v.tipo === 'deposito' ? 'Depósito recibido' : 'Saldo anterior'}</strong><CadenaLabel cadena={cadenaDe(v)} /></span>
            <span className={styles.amount}>{v.tipo === 'deposito' ? '+' : ''}{money(v.monto)}<ChevronRight size={14} /></span>
          </button>)}
      </div>
    </div>}
    {datos.sinFecha.length > 0 && <button type="button" className={styles.undated} onClick={() => setVerSinFecha(value => !value)}>{verSinFecha ? 'Volver al día seleccionado' : `Saldos y registros sin fecha (${datos.sinFecha.length})`}</button>}
  </section>;
}
