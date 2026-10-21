'use client';

import { X, ExternalLink } from 'lucide-react';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  driveId: string;
  label?: string;
  onClose: () => void;
  secretToken?: string;
}

const emptySubscribe = () => () => {};

export default function DrivePreviewModal({ driveId, label, onClose, secretToken }: Props) {
  const src = secretToken
    ? `/api/drive/preview?fileId=${encodeURIComponent(driveId)}&t=${encodeURIComponent(secretToken)}`
    : `/api/drive/preview?fileId=${encodeURIComponent(driveId)}`;

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!mounted) return;
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, [mounted]);

  if (!mounted) return null;

  // createPortal saca el modal del stacking context del aside/sticky
  // para que siempre quede por encima de todo el contenido de la página
  return createPortal(
    <dialog ref={dialog} className="drive-preview-dialog" aria-label={label ?? 'Vista previa del documento'}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
      } }}
    >
      <div
        className="relative flex flex-col rounded-2xl overflow-hidden"
        style={{
          width: '100%',
          height: '100%',
          background: '#fff',
          boxShadow: '0 24px 80px rgba(0,0,0,.3)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderBottom: '1px solid rgba(20,20,19,.08)' }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
            {label ?? 'Documento'}
          </span>
          <div className="flex items-center gap-2">
            <a
              href={`https://drive.google.com/file/d/${driveId}/view`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ fontSize: 11, color: 'var(--link)', border: '1px solid rgba(20,20,19,.15)', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--canvas)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
            >
              <ExternalLink size={11} />
              Abrir en Drive
            </a>
            <button
              onClick={onClose}
              aria-label="Cerrar documento"
              autoFocus
              className="w-11 h-11 rounded-full flex items-center justify-center transition-all focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: 'var(--slate)', border: '1px solid rgba(20,20,19,.12)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--canvas)'; (e.currentTarget as HTMLElement).style.color = 'var(--ink)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--slate)'; }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* iframe — served via proxy to avoid Google auth wall */}
        <iframe
          src={src}
          style={{ flex: 1, border: 'none', width: '100%' }}
          title={label ?? 'Documento'}
        />
      </div>
    </dialog>,
    document.body
  );
}
