'use client';

import { Trash2 } from 'lucide-react';

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title, message, confirmLabel = 'Eliminar', onConfirm, onCancel,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 anim-fade-in"
      style={{ background: 'rgba(14,14,13,.75)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="w-full max-w-sm anim-scale-in"
        style={{
          background: 'var(--white)',
          borderRadius: 'var(--r-hero)',
          boxShadow: '0 32px 80px rgba(0,0,0,.35), 0 0 0 1px rgba(20,20,19,.1)',
        }}
      >
        {/* Accent bar */}
        <div style={{
          height: 4,
          background: 'linear-gradient(90deg, var(--signal) 0%, #FF6B35 100%)',
          borderRadius: '40px 40px 0 0',
        }} />

        <div className="px-7 py-6 space-y-5">
          {/* Icon + title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
              style={{ background: '#FFF0EE', border: '1px solid rgba(207,69,0,.15)' }}>
              <Trash2 size={18} style={{ color: 'var(--signal)' }} />
            </div>
            <div>
              <h3 style={{ fontWeight: 600, fontSize: 16, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
                {title}
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--slate)', fontWeight: 450 }}>
                {message}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={onCancel} className="btn-outline flex-1">
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="btn-ink flex-1"
              style={{ background: 'var(--signal)', borderColor: 'var(--signal)' }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
