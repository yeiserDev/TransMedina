'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, Loader2, X } from 'lucide-react';
import type { DocumentoExterno } from '@/lib/externos';
import styles from './ExternosWorkspace.module.css';

export default function ExternoDocumentPreview({ document: file, onClose }: { document: DocumentoExterno; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [loaded, setLoaded] = useState<{ url: string; type: string } | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const source = `/api/externos/documentos?id=${file.id}`;
  useEffect(() => {
    const element = dialog.current;
    const previous = window.document.activeElement as HTMLElement | null;
    const overflow = window.document.body.style.overflow;
    element?.showModal();
    window.document.body.style.overflow = 'hidden';
    return () => { element?.close(); window.document.body.style.overflow = overflow; previous?.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;
    fetch(source, { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error(response.status === 401 ? 'Tu sesión expiró. Vuelve a iniciar sesión para abrir el archivo.' : 'No se pudo cargar el documento.');
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      if (!['application/pdf', 'image/png', 'image/jpeg'].includes(blob.type.split(';')[0])) throw new Error('Este formato no permite vista previa. Puedes abrirlo en otra pestaña.');
      objectUrl = URL.createObjectURL(blob);
      setLoaded({ url: objectUrl, type: blob.type });
    }).catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'No se pudo abrir el documento.'); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [source, retry]);
  return <dialog ref={dialog} className={styles.previewDialog} aria-label={`Vista previa: ${file.nombre}`} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) onClose();
  }}>
    <div className={styles.previewShell}>
      <header className={styles.previewHeader}><div><strong>{file.nombre}</strong><span>Vista previa del documento</span></div><a href={source} target="_blank" rel="noopener noreferrer" aria-label="Abrir en otra pestaña"><ExternalLink size={18} /></a>{loaded && <a href={loaded.url} download={file.nombre} aria-label="Descargar documento"><Download size={18} /></a>}<button autoFocus type="button" onClick={onClose} aria-label="Cerrar vista previa"><X size={20} /></button></header>
      {error ? <div className={styles.previewMessage} role="alert"><p>{error}</p><button onClick={() => { setError(''); setLoaded(null); setRetry(n => n + 1); }}>Volver a intentar</button></div> : !loaded ? <div className={styles.previewMessage} role="status"><Loader2 className={styles.spinner} size={28} /><p>Cargando documento…</p></div> : loaded.type.startsWith('image/') ? <div className={styles.previewImage}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={loaded.url} alt={file.nombre} onError={() => setError('No se pudo mostrar la imagen.')} />
      </div> : <iframe className={styles.previewFrame} src={loaded.url} title={file.nombre} />}
      <footer className={styles.previewFooter}>Si tu navegador no muestra el archivo, utiliza «Abrir en otra pestaña».</footer>
    </div>
  </dialog>;
}
