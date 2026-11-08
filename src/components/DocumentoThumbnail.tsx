'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Maximize2, FileWarning } from 'lucide-react';
import type { DocumentoExterno } from '@/lib/externos';
import styles from './ExternosWorkspace.module.css';

const labels: Record<string, string> = { guia: 'Guía', factura: 'Factura', detraccion: 'Detracción', comprobante: 'Comprobante', otro: 'Documento' };
export default function DocumentoThumbnail({ doc, onOpen }: { doc: DocumentoExterno; onOpen: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [pages, setPages] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    let imageUrl: string | undefined;
    let task: { destroy: () => Promise<void> } | undefined;
    async function render() {
      const response = await fetch(`/api/externos/documentos?id=${doc.id}`, { signal: abort.signal, cache: 'no-store' });
      if (!response.ok) throw new Error('No disponible');
      const blob = await response.blob();
      if (abort.signal.aborted) return;
      if (blob.type.startsWith('image/')) {
        imageUrl = URL.createObjectURL(blob); setImage(imageUrl); return;
      }
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
      const data = new Uint8Array(await blob.arrayBuffer());
      if (abort.signal.aborted) return;
      const loading = pdfjs.getDocument({ data, isEvalSupported: false, standardFontDataUrl: '/pdfjs/standard_fonts/', cMapUrl: '/pdfjs/cmaps/', cMapPacked: true });
      task = loading;
      const pdf = await loading.promise;
      const page = await pdf.getPage(1);
      if (abort.signal.aborted || !canvas.current) return;
      const normal = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(460 / normal.width, 360 / normal.height) });
      const context = canvas.current.getContext('2d');
      if (!context) throw new Error('Canvas no disponible');
      canvas.current.width = Math.ceil(viewport.width);
      canvas.current.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: context, viewport }).promise;
      if (!abort.signal.aborted) { setPages(pdf.numPages); setStatus('ready'); }
    }
    void render().catch(() => { if (!abort.signal.aborted) setStatus('error'); });
    return () => { abort.abort(); if (imageUrl) URL.revokeObjectURL(imageUrl); void task?.destroy(); };
  }, [doc.id]);
  return <button type="button" className={styles.thumbnail} onClick={onOpen} aria-label={`Ampliar ${doc.nombre}`}>
    <span className={styles.thumbnailPaper}>
      <canvas ref={canvas} aria-hidden="true" hidden={!!image || status !== 'ready'} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {image && <img src={image} alt={`Vista previa de ${doc.nombre}`} onLoad={() => setStatus('ready')} onError={() => setStatus('error')} />}
      {status === 'loading' && <span className={styles.thumbnailLoading} role="status"><Loader2 size={20} className={styles.spinner} />Cargando vista previa</span>}
      {status === 'error' && <span className={styles.thumbnailLoading}><FileWarning size={20} />No se pudo mostrar<br />Pulsa para abrir</span>}
      <span className={styles.thumbnailExpand}><Maximize2 size={14} /> Ampliar</span>
    </span>
    <span className={styles.thumbnailCaption}><strong>{labels[doc.tipo] ?? 'Documento'}</strong><small title={doc.nombre}>{doc.nombre}</small><span>{pages > 0 ? `${pages} ${pages === 1 ? 'página' : 'páginas'}` : image ? 'Imagen' : 'PDF'}{doc.abono_id ? ' · Abono vinculado' : ''}</span></span>
  </button>;
}
