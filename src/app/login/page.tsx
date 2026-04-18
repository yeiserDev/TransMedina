'use client';

import { signIn } from 'next-auth/react';
import { Truck } from 'lucide-react';

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--canvas)' }}
    >
      <div
        className="relative w-full max-w-sm p-10 text-center anim-scale-in"
        style={{
          background: 'var(--white)',
          borderRadius: 'var(--r-hero)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'var(--ink)' }}
          >
            <Truck size={26} style={{ color: 'var(--canvas)' }} />
          </div>
        </div>

        <p className="eyebrow mb-3">Transporte</p>

        <h1
          className="text-3xl mb-2"
          style={{ fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--ink)' }}
        >
          TransMedina
        </h1>
        <p className="text-sm mb-10" style={{ color: 'var(--slate)', fontWeight: 450 }}>
          Gestión de fletes y transporte de carga
        </p>

        <button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="btn-outline w-full justify-center gap-3 mb-4"
          style={{ borderRadius: 'var(--r-btn)', padding: '12px 24px', fontSize: '14px' }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar con Google
        </button>

        <p className="text-xs" style={{ color: 'var(--dust)' }}>Solo acceso autorizado</p>
      </div>
    </div>
  );
}
