'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Eye, Pencil, Trash2, X } from 'lucide-react';
import type { EstadoDetraccion, Viaje } from '@/types';
import { cadenaDe } from '@/lib/cadenas';
import { formatDoc } from '@/lib/documentos';
import CadenaLabel from './CadenaLabel';
import { BadgeEstado, ToggleDetraccion } from './BadgeEstado';
import ArchivosDrive from './ArchivosDrive';
import styles from './MobileViajeDetail.module.css';

const dateLabel = (fecha: string) => !fecha || fecha.startsWith('1900') || !Number.isFinite(Date.parse(`${fecha}T12:00:00`)) ? 'Sin fecha' : new Date(`${fecha}T12:00:00`).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

export default function MobileViajeDetail({ viaje, readOnly, toggling, onClose, onEdit, onDelete, onToggle, onPreview, onUploaded }: {
  viaje: Viaje; readOnly: boolean; toggling: boolean; onClose: () => void;
  onEdit: () => void; onDelete: () => void;
  onToggle: (id: string, value: EstadoDetraccion) => void;
  onPreview: (driveId: string, label: string) => void;
  onUploaded: (tipo: 'guias' | 'facturas', driveId: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const isViaje = viaje.tipo === 'viaje';
  const title = isViaje ? 'Detalle del viaje' : viaje.tipo === 'deposito' ? 'Depósito recibido' : 'Saldo anterior';
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = 'hidden';
    return () => { element?.close(); document.body.style.overflow = overflow; previousFocus?.focus({ preventScroll: true }); };
  }, []);

  return createPortal(<dialog ref={dialog} className={styles.sheet} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    } }}>
    <header className={styles.header}><div><h2 id={titleId}>{title}</h2><CadenaLabel cadena={cadenaDe(viaje)} /></div><button type="button" onClick={onClose} aria-label="Cerrar detalle" autoFocus><X size={20} /></button></header>
    <div className={styles.body}>
      <h3 className={styles.route}>{viaje.descripcion || title}</h3>
      <dl className={styles.fields}>
        <div className={styles.price}><dt>{isViaje ? 'Monto del flete' : 'Importe'}</dt><dd>{viaje.tipo === 'deposito' ? '+' : ''}S/ {Number(viaje.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</dd></div>
        <div><dt>{isViaje ? 'Contratante' : 'Cuenta'}</dt><dd>FART</dd></div>
        {isViaje && <div><dt>Fecha de carga</dt><dd>{dateLabel(viaje.fecha_carga)}</dd></div>}
        <div><dt>{isViaje ? 'Fecha de traslado' : viaje.tipo === 'deposito' ? 'Fecha de depósito' : 'Período'}</dt><dd>{viaje.tipo === 'saldo_anterior' ? viaje.mes : dateLabel(viaje.fecha_traslado)}</dd></div>
      </dl>
      {isViaje && <>
        <div className={styles.statuses}><div><p>Factura</p><BadgeEstado estado={viaje.estado} /></div><div><p>Detracción</p>
          {readOnly ? <span className="badge-pill" style={{ background: 'var(--canvas)' }}>{viaje.detraccion === 'realizado' ? 'Realizada' : 'Pendiente'}</span>
            : <ToggleDetraccion detraccion={viaje.detraccion} descripcion={viaje.descripcion} viajeId={viaje.id} onToggle={onToggle} loading={toggling} />}
        </div></div>
        <section className={styles.documents} aria-label="Documentos del viaje"><h3>Documentos</h3>
          {readOnly ? (['guia', 'factura'] as const).map(tipo => {
            const numero = tipo === 'guia' ? viaje.numero_guia : viaje.numero_factura;
            const driveId = tipo === 'guia' ? viaje.drive_id_guia : viaje.drive_id_factura;
            const label = tipo === 'guia' ? 'Guía' : 'Factura';
            return <div key={tipo} className={styles.docRow}><span><strong>{label}</strong><span>{formatDoc(numero) || 'Sin número registrado'}</span></span>
              {driveId ? <button type="button" onClick={() => onPreview(driveId, `${label} ${numero ?? ''}`)}><Eye size={16} />Ver PDF</button> : <small>Sin PDF adjunto</small>}
            </div>;
          }) : <ArchivosDrive viajeId={viaje.id} driveIdGuia={viaje.drive_id_guia} driveIdFactura={viaje.drive_id_factura}
            numeroGuia={viaje.numero_guia} numeroFactura={viaje.numero_factura} onUploaded={onUploaded} />}
        </section>
      </>}
    </div>
    {!readOnly && <footer className={styles.footer}><button type="button" onClick={onEdit}><Pencil size={16} />Editar {isViaje ? 'viaje' : 'registro'}</button><button type="button" onClick={onDelete}><Trash2 size={16} />Eliminar</button></footer>}
  </dialog>, document.body);
}
