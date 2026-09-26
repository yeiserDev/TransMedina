'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App Error]', error);
  }, [error]);

  return (
    <main className="max-w-5xl mx-auto px-6 pt-16">
      <div
        className="rounded-3xl flex flex-col items-center text-center gap-4 mx-auto max-w-lg"
        style={{ background: 'var(--white)', boxShadow: 'var(--shadow-card)', padding: '56px 32px' }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: 56, height: 56, background: '#FFF4EC' }}
        >
          <AlertTriangle size={24} style={{ color: 'var(--signal-light)' }} />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl" style={{ fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            Ocurrió un error inesperado
          </h2>
          <p className="text-sm" style={{ color: 'var(--slate)', fontWeight: 450 }}>
            No se pudo cargar la vista correctamente. Puedes intentar recargar la aplicación.
          </p>
        </div>

        <button onClick={() => reset()} className="btn-ink mt-2">
          <RotateCw size={15} />
          Reintentar
        </button>

        {error.digest && (
          <p style={{ fontSize: 10, color: 'var(--dust)', fontFamily: 'ui-monospace, monospace' }}>
            Código: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
