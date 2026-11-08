'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays, Check, ChevronDown, SlidersHorizontal } from 'lucide-react';
import styles from './DetraccionesModal.module.css';

export default function DetraccionesFilter({ label, value, options, onChange, calendar = false }: {
  label: string; value: string; options: { value: string; label: string }[];
  onChange: (value: string) => void; calendar?: boolean;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = Math.max(0, options.findIndex(o => o.value === value));
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  useEffect(() => {
    if (open) root.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);
  const choose = (index: number) => { onChange(options[index].value); setOpen(false); };
  const Icon = calendar ? CalendarDays : SlidersHorizontal;
  return <div ref={root} className={styles.filterField}>
    <span id={`${id}-label`} className={styles.filterLabel}>{label}</span>
    <button type="button" className={styles.filterTrigger} role="combobox" aria-labelledby={`${id}-label ${id}-value`}
      aria-expanded={open} aria-controls={`${id}-list`} aria-haspopup="listbox" aria-activedescendant={open ? `${id}-${active}` : undefined}
      onBlur={e => { if (!root.current?.contains(e.relatedTarget as Node)) setOpen(false); }}
      onClick={() => { setActive(selected); setOpen(!open); }}
      onKeyDown={e => {
        if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); setOpen(false); }
        else if (e.key === 'Tab') setOpen(false);
        else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault(); setOpen(true);
          setActive(open ? Math.max(0, Math.min(options.length - 1, active + (e.key === 'ArrowDown' ? 1 : -1))) : selected);
        } else if (open && (e.key === 'Home' || e.key === 'End')) { e.preventDefault(); setActive(e.key === 'Home' ? 0 : options.length - 1); }
        else if (open && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); choose(active); }
        else if (e.key.length === 1 && e.key !== ' ') {
          const index = options.findIndex(o => o.label.toLocaleLowerCase().startsWith(e.key.toLocaleLowerCase()));
          if (index >= 0) { e.preventDefault(); setOpen(true); setActive(index); }
        }
      }}>
      <Icon size={15} aria-hidden="true" /><span id={`${id}-value`}>{options[selected]?.label}</span><ChevronDown size={14} className={styles.filterChevron} aria-hidden="true" />
    </button>
    {open && <div id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`} className={styles.filterMenu}>
      {options.map((o, i) => <div key={o.value} id={`${id}-${i}`} role="option" aria-selected={o.value === value}
        data-index={i} data-active={active === i} className={styles.filterOption}
        onMouseDown={e => e.preventDefault()} onMouseMove={() => setActive(i)} onClick={() => choose(i)}>
        <span>{o.label}</span>{o.value === value && <Check size={14} aria-hidden="true" />}
      </div>)}
    </div>}
  </div>;
}
