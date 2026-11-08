'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, Loader2, Paperclip, Plus, Upload, X } from 'lucide-react';
import type { DocumentoExterno, ViajeExterno } from '@/lib/externos';
import { soles } from '@/lib/externos';
import styles from './ExternosWorkspace.module.css';
import DocumentoThumbnail from './DocumentoThumbnail';

const types = [{ id: 'guia', name: 'Guías' }, { id: 'factura', name: 'Facturas' }, { id: 'detraccion', name: 'Detracciones' }, { id: 'comprobante', name: 'Comprobantes' }, { id: 'otro', name: 'Otros archivos' }];
export default function ExternosDocumentos({ viaje, busy, onUpload, onPreview }: {
  viaje: ViajeExterno; busy: boolean; onUpload: (data: FormData, progress: (percent: number) => void) => Promise<void>; onPreview: (doc: DocumentoExterno) => void;
}) {
  const [fileName, setFileName] = useState('');
  const form = useRef<HTMLFormElement>(null);
  const uploading = useRef(false);
  const [phase, setPhase] = useState<'idle' | 'sending' | 'saving' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const active = phase === 'sending' || phase === 'saving';
  async function submit(data: FormData) {
    if (uploading.current || busy) return;
    const file = data.get('file');
    if (!(file instanceof File) || file.size === 0 || file.size > 10485760 || !['application/pdf','image/jpeg','image/png'].includes(file.type)) { setError('Selecciona un PDF, JPG o PNG de hasta 10 MB.'); setPhase('error'); return; }
    uploading.current = true; setError(''); setProgress(0); setPhase('sending');
    try {
      await onUpload(data, percent => { setProgress(percent); if (percent === 100) setPhase('saving'); });
      setPhase('done'); form.current?.reset(); setFileName('');
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo subir el documento.'); setPhase('error'); }
    finally { uploading.current = false; }
  }
  return <section className={styles.documentSection} aria-label="Documentos del viaje">
    <div className={styles.sectionTitle}><h3><Paperclip size={16} /> Documentos <span className={styles.count}>{viaje.externos_documentos.length}</span></h3><button type="button" disabled={active} onClick={() => setShowUpload(!showUpload)} aria-expanded={showUpload} aria-controls="external-upload">{showUpload ? <X size={14} /> : <Plus size={14} />}{showUpload ? 'Cerrar' : 'Adjuntar'}</button></div>
    {viaje.externos_documentos.length ? <div className={styles.thumbnailGrid}>{viaje.externos_documentos.map(doc => <DocumentoThumbnail key={doc.id} doc={doc} onOpen={() => onPreview(doc)} />)}</div> : <p className={styles.compactEmpty}>Sin archivos adjuntos. Añade una guía, factura o comprobante.</p>}
    {showUpload && <div className={styles.uploadDetails} id="external-upload">
      <form ref={form} onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); data.set('viaje_id', viaje.id); void submit(data); }}>
        <fieldset disabled={busy || active} className={styles.fields}>
          <label>Tipo de documento<select name="tipo">{types.map(t => <option value={t.id} key={t.id}>{t.name}</option>)}</select></label>
          <label>Asociar a<select name="abono_id"><option value="">Este viaje</option>{viaje.externos_abonos.filter(a => !a.anulado).map(a => <option key={a.id} value={a.id}>Abono {a.fecha} · {soles(a.monto)}</option>)}</select></label>
          <label className={`${styles.fileUpload} ${styles.full}`}><Upload size={20} /><strong>{fileName || 'Seleccionar archivo'}</strong><span>PDF, JPG o PNG · máximo 10 MB</span><input required name="file" type="file" accept="application/pdf,image/jpeg,image/png" onChange={e => { setFileName(e.target.files?.[0]?.name ?? ''); setPhase('idle'); setError(''); }} /></label>
          <div className={styles.actions}><button type="submit" className={styles.primary}>{active && <Loader2 className={styles.spinner} size={16} />}{phase === 'sending' ? 'Subiendo archivo…' : phase === 'saving' ? 'Guardando documento…' : 'Guardar documento'}</button></div>
        </fieldset>
        {phase !== 'idle' && <div className={styles.uploadStatus} data-phase={phase}>
          <div role={phase === 'error' ? 'alert' : 'status'}>{active ? <Loader2 size={17} className={styles.spinner} /> : phase === 'done' ? <CheckCircle2 size={18} /> : null}<span>{phase === 'sending' ? `Enviando archivo · ${progress} %` : phase === 'saving' ? 'Archivo enviado. Confirmando el guardado…' : phase === 'done' ? 'Documento guardado. Ya puedes abrir su vista previa.' : error}</span></div>
          {active && <div className={styles.uploadTrack} role="progressbar" aria-label={phase === 'saving' ? 'Confirmando guardado' : 'Enviando archivo'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={phase === 'sending' ? progress : undefined}><span style={{ width: `${progress}%` }} /></div>}
        </div>}
      </form>
    </div>}
  </section>;
}
