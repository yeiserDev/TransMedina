'use client';

import { X, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  driveId: string;
  label?: string;
  onClose: () => void;
  secretToken?: string;
}

export default function DrivePreviewModal({ driveId, label, onClose, secretToken }: Props) {
  const src = secretToken
    ? `/api/drive/preview?fileId=${encodeURIComponent(driveId)}&t=${encodeURIComponent(secretToken)}`
    : `/api/drive/preview?fileId=${encodeURIComponent(driveId)}`;

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!mounted) return null;

  // createPortal saca el modal del stacking context del aside/sticky
  // para que siempre quede por encima de todo el contenido de la página
  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)', zIndex: 9999 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative flex flex-col rounded-2xl overflow-hidden"
        style={{
          width: 'min(92vw, 880px)',
          height: 'min(88vh, 920px)',
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors"
              style={{ fontSize: 11, color: 'var(--link)', border: '1px solid rgba(20,20,19,.15)', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--canvas)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
            >
              <ExternalLink size={11} />
              Abrir en Drive
            </a>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
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
    </div>,
    document.body
  );
}
