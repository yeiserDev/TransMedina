'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

export default function ReportesError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('[reportes]', error);
  }, [error]);

  return (
    <main className="max-w-5xl mx-auto px-6 pt-8">
      <div
        className="rounded-3xl flex flex-col items-center text-center gap-4"
        style={{ background: 'var(--white)', boxShadow: 'var(--shadow-card)', padding: '56px 32px' }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: 56, height: 56, background: '#FFF4EC' }}
        >
          <AlertTriangle size={24} style={{ color: 'var(--signal-light)' }} />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl" style={{ fontWeight: 600, letterSpacing: '-0.02em' }}>
            No se pudo cargar Reportes
          </h2>
          <p className="text-sm" style={{ color: 'var(--slate)', fontWeight: 450, maxWidth: 420 }}>
            Hubo un problema al armar el estado de cuenta. Tus datos están intactos — esto es solo la
            pantalla.
          </p>
        </div>

        <button onClick={() => unstable_retry()} className="btn-ink">
          <RotateCw size={15} />
          Reintentar
        </button>

        {error.digest && (
          <p style={{ fontSize: 10, color: 'var(--dust)', fontFamily: 'ui-monospace, monospace' }}>
            {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
