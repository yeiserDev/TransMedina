'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, FileQuestion, ArrowUpRight, X, Loader2 } from 'lucide-react';
import type { Viaje } from '@/types';
import { cadenaDe, nombreCadena } from '@/lib/cadenas';
import { montoDetraccion } from '@/lib/detracciones';
import { formatDoc } from '@/lib/documentos';
import DrivePreviewModal from './DrivePreviewModal';

const money = (value: number) => `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
function fecha(value: string) {
  if (!value || value.startsWith('1900')) return 'Sin fecha';
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? 'Sin fecha' : parsed.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function CalendarDayModal({ date, viajes, onClose }: { date: string; viajes: Viaje[]; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [preview, setPreview] = useState<{ id: string; label: string } | null>(null);
  const [selectedId, setSelectedId] = useState(viajes[0]?.id);
  const selectedViaje = viajes.find(v => v.id === selectedId) ?? viajes[0];
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(<>
    <dialog ref={dialog} className="calendar-day-dialog" aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose();
      }}>
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-black/10 p-5 sm:px-7">
          <div>
            <h2 id={titleId} className="text-2xl font-semibold tracking-tight">Viajes del {fecha(date)}</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--slate)' }}>{viajes.length} {viajes.length === 1 ? 'viaje' : 'viajes'} · Total {money(viajes.reduce((sum, v) => sum + Number(v.monto), 0))}</p>
          </div>
          <button type="button" autoFocus onClick={onClose} aria-label="Cerrar detalle de viajes" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-black/5"><X size={20} /></button>
        </header>
        {viajes.length > 1 && <nav aria-label="Elegir viaje del día" className="flex shrink-0 gap-2 overflow-x-auto border-b border-black/10 px-5 py-3 sm:px-7">
          {viajes.map((v, i) => <button key={v.id} type="button" aria-pressed={selectedViaje?.id === v.id} onClick={() => setSelectedId(v.id)}
            className="shrink-0 rounded-full px-4 py-2 text-sm" style={{ background: selectedViaje?.id === v.id ? 'var(--ink)' : 'var(--canvas)', color: selectedViaje?.id === v.id ? 'var(--white)' : 'var(--ink)' }}>
            {i + 1}. {nombreCadena(cadenaDe(v))} · {formatDoc(v.numero_guia) || v.descripcion}
          </button>)}
        </nav>}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6" style={{ background: 'var(--canvas)' }}>
          {viajes.length === 0 && <p className="py-8 text-sm">Ya no hay viajes registrados para esta fecha.</p>}
          {(selectedViaje ? [selectedViaje] : []).map(viaje => {
            const documentos = [
              { label: 'Guía de remisión', id: viaje.drive_id_guia, number: formatDoc(viaje.numero_guia) },
              { label: 'Factura', id: viaje.drive_id_factura, number: formatDoc(viaje.numero_factura) },
              { label: 'Constancia de detracción', id: viaje.drive_id_detraccion, number: '' },
            ];
            return <article key={viaje.id} className="calendar-trip-layout">
              <div className="calendar-trip-summary">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm" style={{ color: 'var(--slate)' }}>{nombreCadena(cadenaDe(viaje))}</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight break-words">{viaje.descripcion || 'Sin descripción'}</h3>
                </div>
                <div className="sm:text-right"><p className="text-xs" style={{ color: 'var(--slate)' }}>Monto del viaje</p><p className="text-3xl font-semibold tabular-nums tracking-tight">{money(viaje.monto)}</p></div>
              </div>
              <dl className="calendar-trip-facts">
                {[
                  ['Fecha de carga', fecha(viaje.fecha_carga)],
                  ['Fecha de traslado', fecha(viaje.fecha_traslado)],
                  ['Estado de factura', viaje.estado === 'facturado' ? 'Facturado' : 'Pendiente de facturar'],
                  ['Detracción', `${viaje.detraccion === 'realizado' ? 'Pagada' : 'Por pagar'} · ${money(montoDetraccion(viaje.descripcion))}`],
                  ['N.º de guía', formatDoc(viaje.numero_guia) || 'Sin registrar'],
                  ['N.º de factura', formatDoc(viaje.numero_factura) || 'Sin registrar'],
                ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs" style={{ color: 'var(--slate)' }}>{label}</dt><dd className="mt-1 font-medium break-words">{value}</dd></div>)}
              </dl>
              </div>
              <section className="calendar-documents" aria-label="Documentos del viaje">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h4 className="text-base font-semibold">Documentos del viaje</h4><span className="text-xs" style={{ color: 'var(--slate)' }}>{documentos.filter(d => d.id).length} de 3 adjuntos</span></div>
              <div className="calendar-document-grid">
                {documentos.map(doc => <section key={doc.label} className="calendar-document-card" data-empty={!doc.id}>
                  <header className="flex h-20 shrink-0 items-center gap-2 border-b border-black/5 px-4 py-3">
                    <FileText size={18} className="shrink-0" style={{ color: doc.id ? 'var(--signal)' : 'var(--slate)' }} />
                    <div className="min-w-0 flex-1"><h5 className="text-sm font-semibold">{doc.label}</h5><p className="mt-0.5 text-xs break-words" style={{ color: 'var(--slate)' }}>{doc.number || (doc.id ? 'Documento adjunto' : 'Sin adjuntar')}</p></div>
                    {doc.id && <button type="button" title="Ampliar documento" aria-label={`Ampliar ${doc.label}`} onClick={() => setPreview({ id: doc.id!, label: `${doc.label}${doc.number ? ` · ${doc.number}` : ''}` })} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5"><ArrowUpRight size={18} /></button>}
                  </header>
                  {doc.id ? <InlineDocument key={doc.id} id={doc.id} label={doc.label} /> : <div className="calendar-document-preview calendar-document-empty">
                    <div className="calendar-empty-symbol" aria-hidden="true"><FileQuestion size={56} strokeWidth={1.2} /></div>
                    <p className="text-base font-semibold" style={{ color: 'var(--ink)' }}>Documento pendiente</p>
                    <p className="max-w-56 text-sm leading-relaxed">{doc.label === 'Constancia de detracción' ? 'La constancia aparecerá aquí cuando se adjunte al viaje.' : `Aún no se ha adjuntado ${doc.label === 'Factura' ? 'la factura' : 'la guía de remisión'} de este viaje.`}</p>
                    <span className="calendar-empty-label">Sin archivo adjunto</span>
                  </div>}
                </section>)}
              </div>
              </section>
            </article>;
          })}
        </div>
      </div>
    </dialog>
    {preview && <DrivePreviewModal driveId={preview.id} label={preview.label} onClose={() => setPreview(null)} />}
  </>, document.body);
}

function InlineDocument({ id, label }: { id: string; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;
    async function load() {
      try {
        const response = await fetch(`/api/drive/preview?fileId=${encodeURIComponent(id)}`, { signal: controller.signal });
        if (!response.ok) throw new Error();
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        setError(false);
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    }
    void load();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [id, attempt]);
  return <div className="calendar-document-preview">
    {url ? <iframe src={`${url}#toolbar=0&navpanes=0&view=FitH`} title={`Vista previa: ${label}`} className="h-full w-full border-0" /> :
      <div className="flex h-full flex-col items-center justify-center gap-3 p-5 text-center text-sm" style={{ color: 'var(--slate)' }} role="status">
        {error ? <><p>No se pudo cargar el documento.</p><button type="button" onClick={() => { setError(false); setAttempt(n => n + 1); }} className="rounded-full border border-black/15 px-4 py-2">Reintentar</button></> : <><Loader2 size={22} className="animate-spin motion-reduce:animate-none" /><p>Cargando {label.toLowerCase()}…</p></>}
      </div>}
  </div>;
}
