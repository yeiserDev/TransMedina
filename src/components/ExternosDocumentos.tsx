'use client';

import { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, ImageIcon, Loader2, Paperclip, Plus, Upload, X } from 'lucide-react';
import type { DocumentoExterno, ViajeExterno } from '@/lib/externos';
import { soles } from '@/lib/externos';
import styles from './ExternosWorkspace.module.css';
import DocumentoThumbnail from './DocumentoThumbnail';

const types = [{ id: 'guia', name: 'Guía' }, { id: 'factura', name: 'Factura' }, { id: 'detraccion', name: 'Detracción' }, { id: 'comprobante', name: 'Comprobante' }, { id: 'otro', name: 'Otro' }];
const accepted = ['application/pdf', 'image/jpeg', 'image/png'];
const maxSize = 10485760;
const maxFiles = 20;
const sizeLabel = (bytes: number) => bytes < 1048576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
const fileKey = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;
type Item = { key: string; file: File; status: 'pendiente' | 'subiendo' | 'guardando' | 'error'; progress: number; error?: string };

export default function ExternosDocumentos({ viaje, busy, onUpload, onPreview }: {
  viaje: ViajeExterno; busy: boolean; onUpload: (data: FormData, progress: (percent: number) => void) => Promise<void>; onPreview: (doc: DocumentoExterno) => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [tipo, setTipo] = useState('guia');
  const [abonoId, setAbonoId] = useState('');
  const [active, setActive] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'done' | 'error'; text: string } | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const uploading = useRef(false);
  const abonos = viaje.externos_abonos.filter(a => !a.anulado);
  const patch = (key: string, changes: Partial<Item>) => setItems(current => current.map(item => item.key === key ? { ...item, ...changes } : item));

  function add(list: FileList | null) {
    if (!list?.length || active) return;
    const known = new Set(items.map(item => item.key));
    const valid: Item[] = [];
    let rejected = 0;
    for (const file of Array.from(list)) {
      if (!accepted.includes(file.type) || file.size === 0 || file.size > maxSize) { rejected++; continue; }
      const key = fileKey(file);
      if (known.has(key)) continue;
      known.add(key);
      valid.push({ key, file, status: 'pendiente', progress: 0 });
    }
    const room = Math.max(0, maxFiles - items.length);
    setItems([...items, ...valid.slice(0, room)]);
    setNotice(rejected > 0 ? { kind: 'error', text: `${rejected === 1 ? 'Se omitió 1 archivo' : `Se omitieron ${rejected} archivos`}: solo PDF, JPG o PNG de hasta 10 MB.` } : valid.length > room ? { kind: 'error', text: `Puedes subir hasta ${maxFiles} archivos por vez.` } : null);
  }

  async function submit() {
    if (uploading.current || busy || items.length === 0) return;
    uploading.current = true; setActive(true); setNotice(null);
    let saved = 0, failed = 0;
    // Uno por uno: cada archivo es una solicitud independiente, así un fallo no pierde los demás.
    for (const item of items) {
      const data = new FormData();
      data.set('file', item.file); data.set('viaje_id', viaje.id); data.set('tipo', tipo); data.set('abono_id', abonoId);
      patch(item.key, { status: 'subiendo', progress: 0, error: undefined });
      try {
        await onUpload(data, percent => patch(item.key, percent === 100 ? { status: 'guardando', progress: 100 } : { progress: percent }));
        saved++;
        setItems(current => current.filter(other => other.key !== item.key));
      } catch (err) {
        failed++;
        patch(item.key, { status: 'error', error: err instanceof Error ? err.message : 'No se pudo subir el documento.' });
      }
    }
    uploading.current = false; setActive(false);
    const savedText = saved === 1 ? '1 documento guardado' : `${saved} documentos guardados`;
    setNotice(failed === 0 ? { kind: 'done', text: `${savedText}. Ya puedes abrir su vista previa.` } : { kind: 'error', text: `${saved > 0 ? `${savedText}. ` : ''}${failed === 1 ? '1 archivo no se pudo subir' : `${failed} archivos no se pudieron subir`}. Revisa la lista y vuelve a intentarlo.` });
  }

  return <section className={styles.documentSection} aria-label="Documentos del viaje">
    <div className={styles.sectionTitle}><h3><Paperclip size={16} /> Documentos <span className={styles.count}>{viaje.externos_documentos.length}</span></h3><button type="button" disabled={active} onClick={() => setShowUpload(!showUpload)} aria-expanded={showUpload} aria-controls="external-upload">{showUpload ? <X size={14} /> : <Plus size={14} />}{showUpload ? 'Cerrar' : 'Adjuntar'}</button></div>
    {viaje.externos_documentos.length ? <div className={styles.thumbnailGrid}>{viaje.externos_documentos.map(doc => <DocumentoThumbnail key={doc.id} doc={doc} onOpen={() => onPreview(doc)} />)}</div> : <p className={styles.compactEmpty}>Sin archivos adjuntos. Añade una guía, factura o comprobante.</p>}
    {showUpload && <form className={styles.uploadCard} id="external-upload" onSubmit={e => { e.preventDefault(); void submit(); }}>
      <div className={styles.uploadHead}><strong>Adjuntar documentos</strong><span>Puedes subir varios archivos a la vez.</span></div>
      <fieldset disabled={active} className={styles.uploadOptions}>
        <div role="group" aria-label="Tipo de documento" className={styles.typeChips}>
          <span>Tipo</span>
          {types.map(t => <button type="button" key={t.id} aria-pressed={tipo === t.id} onClick={() => setTipo(t.id)}>{t.name}</button>)}
        </div>
        {abonos.length > 0 && <label className={styles.uploadLink}><span>Asociar a</span><select value={abonoId} onChange={e => setAbonoId(e.target.value)}><option value="">Este viaje</option>{abonos.map(a => <option key={a.id} value={a.id}>Abono {a.fecha} · {soles(a.monto)}</option>)}</select></label>}
      </fieldset>
      <label className={styles.dropzone} data-dragging={dragging} data-disabled={active}
        onDragOver={e => { e.preventDefault(); if (!active) setDragging(true); }} onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); add(e.dataTransfer.files); }}>
        <span className={styles.dropIcon}><Upload size={18} /></span>
        <strong>{dragging ? 'Suelta los archivos aquí' : items.length ? 'Añadir más archivos' : 'Arrastra tus archivos o haz clic para elegirlos'}</strong>
        <small>PDF, JPG o PNG · máximo 10 MB cada uno</small>
        <input type="file" multiple disabled={active} accept={accepted.join(',')} onChange={e => { add(e.target.files); e.target.value = ''; }} />
      </label>
      {items.length > 0 && <ul className={styles.fileList}>{items.map(item => <li key={item.key} data-status={item.status}>
        <span className={styles.fileIcon}>{item.file.type === 'application/pdf' ? <FileText size={16} /> : <ImageIcon size={16} />}</span>
        <div><strong>{item.file.name}</strong><small role={item.status === 'error' ? 'alert' : undefined}>{item.status === 'subiendo' ? `Subiendo · ${item.progress} %` : item.status === 'guardando' ? 'Guardando…' : item.status === 'error' ? item.error : sizeLabel(item.file.size)}</small>
          {(item.status === 'subiendo' || item.status === 'guardando') && <div className={styles.uploadTrack} data-saving={item.status === 'guardando'} role="progressbar" aria-label={`Subiendo ${item.file.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.progress}><span style={{ width: `${item.progress}%` }} /></div>}
        </div>
        {item.status === 'subiendo' || item.status === 'guardando' ? <Loader2 size={16} className={styles.spinner} /> : <>{item.status === 'error' && <AlertCircle size={16} />}<button type="button" disabled={active} aria-label={`Quitar ${item.file.name}`} onClick={() => setItems(items.filter(other => other.key !== item.key))}><X size={14} /></button></>}
      </li>)}</ul>}
      {notice && <div className={styles.uploadStatus} data-phase={notice.kind} role={notice.kind === 'error' ? 'alert' : 'status'}><div>{notice.kind === 'done' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}<span>{notice.text}</span></div></div>}
      <div className={styles.uploadFooter}>
        <span>{items.length === 0 ? 'Ningún archivo seleccionado' : `${items.length} ${items.length === 1 ? 'archivo' : 'archivos'} · se ${items.length === 1 ? 'guardará' : 'guardarán'} como ${types.find(t => t.id === tipo)?.name}`}</span>
        <button type="submit" className={styles.primary} disabled={busy || active || items.length === 0}>{active && <Loader2 className={styles.spinner} size={16} />}{active ? 'Subiendo…' : items.length > 1 ? `Subir ${items.length} documentos` : 'Subir documento'}</button>
      </div>
    </form>}
  </section>;
}
