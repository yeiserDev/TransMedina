'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, CircleHelp, FileSpreadsheet, X } from 'lucide-react';
import styles from './ExportExcelButton.module.css';

export default function ExportExcelButton({ total, loading, onExport }: {
  total: number; loading: boolean; onExport: () => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 12 });
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); trigger.current?.focus({ preventScroll: true }); };

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const height = panel.current?.offsetHeight ?? 260;
      setPosition({
        left: Math.max(12, Math.min(rect.right - 296, window.innerWidth - 308)),
        top: Math.max(12, Math.min(rect.bottom + 10, window.innerHeight - height - 12)),
      });
    };
    place();
    closeButton.current?.focus({ preventScroll: true });
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: Event) => {
      if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <div className={styles.group}>
      <button type="button" className={styles.export} onClick={onExport} disabled={loading || total === 0}
        title="Descargar los registros filtrados en un archivo Excel (.xlsx)">
        <FileSpreadsheet size={15} aria-hidden="true" />
        <span>{loading ? 'Generando Excel…' : `Exportar Excel (${total})`}</span>
      </button>
      <button ref={trigger} type="button" className={styles.help} aria-label="Cómo exportar a Excel"
        aria-expanded={open} aria-haspopup="dialog" aria-controls={open ? id : undefined} onClick={() => setOpen(value => !value)}>
        <CircleHelp size={15} aria-hidden="true" />
      </button>
      {open && createPortal(
        <div ref={panel} id={id} role="dialog" aria-labelledby={`${id}-title`} className={styles.panel} style={position}>
          <div className={styles.heading}>
            <h2 id={`${id}-title`}>Exportar a Excel</h2>
            <button ref={closeButton} type="button" aria-label="Cerrar ayuda" onClick={close}><X size={15} /></button>
          </div>
          <ol className={styles.steps}>
            <li><CalendarDays size={17} aria-hidden="true" /><div><strong>Elige el período</strong><p>Selecciona Desde y Hasta en el calendario.</p></div></li>
            <li><FileSpreadsheet size={17} aria-hidden="true" /><div><strong>Descarga tu Excel</strong><p>Pulsa Exportar Excel. Se incluyen solo los registros filtrados.</p></div></li>
          </ol>
          <p className={styles.note}>Las fechas son opcionales. También se respetan los demás filtros.</p>
        </div>, document.body,
      )}
    </div>
  );
}
