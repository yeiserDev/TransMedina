'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, Eye, Pencil, Trash2, Truck, X } from 'lucide-react';
import type { EstadoDetraccion, Viaje } from '@/types';
import { cadenaDe } from '@/lib/cadenas';
import { formatDoc } from '@/lib/documentos';
import CadenaLabel from './CadenaLabel';
import { BadgeEstado, ToggleDetraccion } from './BadgeEstado';
import ArchivosDrive from './ArchivosDrive';
import styles from './MobileViajeDetail.module.css';
import docStyles from './DocumentCards.module.css';
import IconoPdf from './IconoPdf';

const dateLabel = (fecha: string) => !fecha || fecha.startsWith('1900') || !Number.isFinite(Date.parse(`${fecha}T12:00:00`)) ? 'Sin fecha' : new Date(`${fecha}T12:00:00`).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

function RouteOverview({ description }: { description: string }) {
  const places = description.split(/\s+[–—-]\s+/);
  if (places.length !== 2 || places.some(place => !place.trim())) return <h3 className={styles.route}>{description || 'Ruta sin registrar'}</h3>;
  const [origin, destination] = places.map(place => place.trim());
  const mapUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${origin}, Perú`)}&destination=${encodeURIComponent(`${destination}, Perú`)}&travelmode=driving`;
  return <section className={styles.routeMap} aria-label={`Ruta de ${origin} a ${destination}`}>
    <div className={styles.mapHeader}><span><Truck size={14} />Ruta del viaje</span><a href={mapUrl} target="_blank" rel="noopener noreferrer">Abrir mapa<ArrowUpRight size={14} /></a></div>
    <svg viewBox="0 0 340 85" preserveAspectRatio="none" className={styles.routeGraphic} aria-hidden="true">
      <path d="M-10 65 C55 15 65 88 130 45 S240 10 355 35 M-10 20 C60 85 155 -20 220 65 S300 75 355 55" fill="none" stroke="#e3ddd5" strokeWidth="1.5" />
      <path d="M25 62 C80 62 75 22 130 22 S205 65 240 40 S280 22 315 22" fill="none" stroke="#fff" strokeWidth="9" />
      <path d="M25 62 C80 62 75 22 130 22 S205 65 240 40 S280 22 315 22" fill="none" stroke="var(--signal)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 5" />
      <circle cx="25" cy="62" r="5" fill="var(--ink)" stroke="white" strokeWidth="3" />
      <circle cx="315" cy="22" r="6" fill="var(--signal)" stroke="white" strokeWidth="3" />
    </svg>
    <div className={styles.endpoints}><div><span>Origen</span><h3>{origin}</h3></div><div><span>Destino</span><h3>{destination}</h3></div></div>
    <p className={styles.mapNote}>Ruta referencial</p>
  </section>;
}

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
    <header className={styles.header}><div><h2 id={titleId}>{title}</h2><div className={styles.context}><CadenaLabel cadena={cadenaDe(viaje)} /><span>Contratante FART</span></div></div><button type="button" onClick={onClose} aria-label="Cerrar detalle" autoFocus><X size={20} /></button></header>
    <div className={styles.body}>
      {isViaje ? <RouteOverview description={viaje.descripcion} /> : <h3 className={styles.route}>{viaje.descripcion || title}</h3>}
      <dl className={styles.fields}>
        <div className={styles.price}><dt>{isViaje ? 'Monto del flete' : 'Importe'}</dt><dd>{viaje.tipo === 'deposito' ? '+' : ''}S/ {Number(viaje.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</dd></div>
        {!isViaje && <div><dt>Cuenta</dt><dd>FART</dd></div>}
        {isViaje && <div><dt>Fecha de carga</dt><dd>{dateLabel(viaje.fecha_carga)}</dd></div>}
        <div><dt>{isViaje ? 'Fecha de traslado' : viaje.tipo === 'deposito' ? 'Fecha de depósito' : 'Período'}</dt><dd>{viaje.tipo === 'saldo_anterior' ? viaje.mes : dateLabel(viaje.fecha_traslado)}</dd></div>
      </dl>
      {isViaje && <>
        <div className={styles.statuses}><div><p>Factura</p><BadgeEstado estado={viaje.estado} /></div><div><p>Detracción</p>
          <ToggleDetraccion readOnly={readOnly} detraccion={viaje.detraccion} descripcion={viaje.descripcion} viajeId={viaje.id} onToggle={onToggle} loading={toggling} />
          <small className={styles.statusHint}>{readOnly ? 'Estado registrado manualmente' : 'Toca para cambiar el estado'}</small>
        </div></div>
        <section className={styles.documents} aria-label="Documentos del viaje"><h3>Documentos</h3>
          {readOnly ? <div className={docStyles.grid}>{(['guia', 'factura'] as const).map(tipo => {
            const numero = tipo === 'guia' ? viaje.numero_guia : viaje.numero_factura;
            const driveId = tipo === 'guia' ? viaje.drive_id_guia : viaje.drive_id_factura;
            const label = tipo === 'guia' ? 'Guía' : 'Factura';
            return <article key={tipo} className={docStyles.card} data-empty={!driveId}>
              <div className={docStyles.top}><span className={docStyles.icon}><IconoPdf size={22} /></span><span>{driveId ? 'Adjunto' : 'Sin archivo'}</span></div>
              <h4>{label}</h4><p className={docStyles.number}>{formatDoc(numero) || 'Sin número'}</p>
              {driveId ? <button type="button" className={docStyles.primary} onClick={() => onPreview(driveId, `${label} ${numero ?? ''}`)}><Eye size={16} />Ver documento</button> : <p className={docStyles.feedback}>Sin PDF adjunto</p>}
            </article>;
          })}</div> : <ArchivosDrive variant="cards" viajeId={viaje.id} driveIdGuia={viaje.drive_id_guia} driveIdFactura={viaje.drive_id_factura}
            numeroGuia={viaje.numero_guia} numeroFactura={viaje.numero_factura} onUploaded={onUploaded} />}
        </section>
      </>}
    </div>
    {!readOnly && <footer className={styles.footer}><button type="button" onClick={onEdit}><Pencil size={16} />Editar {isViaje ? 'viaje' : 'registro'}</button><button type="button" onClick={onDelete}><Trash2 size={16} />Eliminar</button></footer>}
  </dialog>, document.body);
}
