'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Viaje } from '@/types';
import { montoDetraccion } from '@/lib/detracciones';
import DrivePreviewModal from './DrivePreviewModal';
import DetraccionesFilter from './DetraccionesFilter';
import styles from './DetraccionesModal.module.css';

const mesDe = (v: Viaje) => v.fecha_traslado?.slice(0, 7) || 'sin-fecha';
const mesLabel = (mes: string) => /^\d{4}-\d{2}$/.test(mes) ? new Date(`${mes}-01T12:00:00`).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }) : 'Sin fecha';
const money = (n: number) => `S/ ${n.toFixed(2)}`;

export default function DetraccionesModal({ viajes, canManage, onClose }: { viajes: Viaje[]; canManage: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const [month, setMonth] = useState('todos');
  const [filter, setFilter] = useState('pendientes');
  const [busy, setBusy] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{ driveId: string; label: string } | null>(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal(); document.body.style.overflow = 'hidden';
    return () => { element?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  const all = viajes.filter(v => v.tipo === 'viaje').map(v => uploaded[v.id] ? { ...v, drive_id_detraccion: uploaded[v.id], detraccion: 'realizado' as const } : v);
  const months = [...new Set(all.map(mesDe))].sort().reverse();
  const visible = all.filter(v => (month === 'todos' || mesDe(v) === month) && (filter === 'todos' || (filter === 'pendientes' && v.detraccion === 'pendiente') || (filter === 'sin-archivo' && !v.drive_id_detraccion) || (filter === 'pagadas' && v.detraccion === 'realizado')));
  const groups = months.map(m => ({ month: m, rows: visible.filter(v => mesDe(v) === m).sort((a, b) => b.fecha_traslado.localeCompare(a.fecha_traslado)) })).filter(g => g.rows.length);
  async function upload(v: Viaje, file: File) {
    if (!canManage || lock.current) return;
    if (!/\.(pdf|png|jpe?g)$/i.test(file.name)) { toast.error('Selecciona un PDF, JPG o PNG.'); return; }
    lock.current = true; setBusy(v.id);
    try {
      const data = new FormData(); data.append('file', file); data.append('viajeId', v.id); data.append('tipo', 'detracciones');
      const response = await fetch('/api/drive', { method: 'POST', body: data });
      const result = await response.json();
      if (!response.ok || !result.driveId) throw new Error(result.error || 'No se pudo subir la constancia.');
      setUploaded(old => ({ ...old, [v.id]: result.driveId }));
      window.dispatchEvent(new CustomEvent('viajes-updated'));
      toast.success('Constancia guardada. Detracción marcada como pagada.');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo subir. Intenta otra vez.'); }
    finally { lock.current = false; setBusy(null); }
  }
  return createPortal(<>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="detracciones-title" onCancel={e => { e.preventDefault(); if (!lock.current) onClose(); }}>
      <header className={styles.header}><div><h2 id="detracciones-title">Detracciones por mes</h2><p>Revisa los viajes y adjunta las constancias que faltan.</p></div><button aria-label="Cerrar detracciones" disabled={!!busy} onClick={onClose}><X size={20} /></button></header>
      <div className={styles.filters}>
        <DetraccionesFilter label="Mes" calendar value={month} onChange={setMonth} options={[{ value: 'todos', label: 'Todos los meses' }, ...months.map(m => ({ value: m, label: mesLabel(m) }))]} />
        <DetraccionesFilter label="Mostrar" value={filter} onChange={setFilter} options={[{ value: 'pendientes', label: 'Por pagar' }, { value: 'sin-archivo', label: 'Sin constancia' }, { value: 'pagadas', label: 'Pagadas' }, { value: 'todos', label: 'Todas' }]} />
        <p aria-live="polite">{visible.length} detracciones <strong>{money(visible.reduce((s, v) => s + montoDetraccion(v.descripcion), 0))}</strong></p>
      </div>
      <div className={styles.content} aria-busy={!!busy}>
        {groups.length === 0 && <p className={styles.empty}>No hay detracciones con estos filtros.</p>}
        {groups.map(g => <section key={g.month} className={styles.group}><h3>{mesLabel(g.month)} <span>{g.rows.length} viajes</span></h3>
          <div className={styles.tableWrap}><table><thead><tr><th>Fecha / ruta</th><th>Guía / factura</th><th>Importe</th><th>Estado</th><th>Constancia</th></tr></thead><tbody>
            {g.rows.map(v => <tr key={v.id}><td><small>{v.fecha_traslado}</small><strong>{v.descripcion}</strong></td><td>{v.numero_guia || 'Sin guía'}<small>{v.numero_factura || 'Sin factura'}</small></td><td>{money(montoDetraccion(v.descripcion))}</td><td><span className={styles.status} data-paid={v.detraccion === 'realizado'}>{v.detraccion === 'realizado' ? 'Pagada' : 'Por pagar'}</span></td><td>
              {v.drive_id_detraccion ? <button onClick={() => setPreview({ driveId: v.drive_id_detraccion!, label: `Detracción · ${v.descripcion}` })}>Ver constancia</button> : canManage ? <label className={styles.upload} aria-disabled={!!busy}>
                {busy === v.id ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}{busy === v.id ? 'Subiendo…' : 'Subir constancia'}
                <input type="file" aria-label={`Subir constancia de ${v.descripcion}, ${v.fecha_traslado}`} accept=".pdf,.jpg,.jpeg,.png" disabled={!!busy} onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void upload(v, f); }} />
              </label> : <small>Sin adjuntar</small>}
            </td></tr>)}
          </tbody></table></div>
        </section>)}
      </div>
      <footer className={styles.footer}>{busy ? 'Subiendo constancia. Espera antes de cerrar.' : 'PDF, JPG o PNG · Al subir la constancia, se marca la detracción como pagada.'}</footer>
    </dialog>
    {preview && <DrivePreviewModal {...preview} onClose={() => setPreview(null)} />}
  </>, document.body);
}
