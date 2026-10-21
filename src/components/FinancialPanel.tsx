'use client';

import { useEffect, useState, useMemo } from 'react';
import { TrendingUp, Loader2, ArrowUpRight } from 'lucide-react';
import { Viaje } from '@/types';
import DocumentosViajes from './DocumentosViajes';
import DepositosModal from './DepositosModal';

function fmt(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
}

export default function FinancialPanel({ initialViajes, vista = 'completa' }: { initialViajes?: Viaje[]; vista?: 'completa' | 'cuenta' | 'documentos' }) {
  const [viajes, setViajes] = useState<Viaje[]>(initialViajes ?? []);
  const [loading, setLoading] = useState(!initialViajes);
  const [verDepositos, setVerDepositos] = useState(false);

  const fetchAll = () => {
    fetch('/api/viajes')
      .then(r => r.json())
      .then(data => { setViajes(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    // Solo cargar viajes si no vinieron del server
    if (!initialViajes || vista !== 'completa') {
      fetchAll();
    }
    // En actualizaciones posteriores: recargar todo desde la API
    window.addEventListener('viajes-updated', fetchAll);
    return () => window.removeEventListener('viajes-updated', fetchAll);
  }, [vista]); // eslint-disable-line react-hooks/exhaustive-deps

  const balancePorCobrar = useMemo(() => {
    const fletes = viajes.filter(v => v.tipo === 'viaje').reduce((s, v) => s + Number(v.monto), 0);
    const depositos = viajes.filter(v => v.tipo === 'deposito').reduce((s, v) => s + Number(v.monto), 0);
    const saldoAnterior = viajes.filter(v => v.tipo === 'saldo_anterior').reduce((s, v) => s + Number(v.monto), 0);
    return saldoAnterior + fletes - depositos;
  }, [viajes]);

  return (
    <div className={`flex flex-col gap-4 ${vista === 'completa' ? 'max-h-[calc(100dvh-7rem)]' : ''}`}>

      {/* Por cobrar */}
      {vista !== 'documentos' && (loading ? (
        <div className="skeleton rounded-3xl" style={{ height: 80 }} />
      ) : (
        <button type="button" onClick={() => setVerDepositos(true)} aria-haspopup="dialog"
          aria-label={`Por cobrar ${fmt(balancePorCobrar)}. Ver detalle de depósitos de FART`}
          className="shrink-0 rounded-3xl p-4 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--signal)]"
          style={{ background: 'var(--white)', boxShadow: 'var(--shadow-card)' }}>
          <span className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={12} style={{ color: 'var(--signal-light)' }} />
            <span className="eyebrow" style={{ fontSize: 9 }}>Por cobrar</span>
            <ArrowUpRight size={14} aria-hidden="true" className="ml-auto" style={{ color: 'var(--slate)' }} />
          </span>
          <span className="block" style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.025em', color: 'var(--ink)', lineHeight: 1 }}>
            {fmt(balancePorCobrar)}
          </span>
          <span className="block text-xs mt-1.5" style={{ color: 'var(--slate)', fontWeight: 450 }}>
            FART · todas las cargas
          </span>
        </button>
      ))}

      {verDepositos && <DepositosModal viajes={viajes} onClose={() => setVerDepositos(false)} />}

      {/* Separador */}
      {vista === 'completa' && <div style={{ height: 1, background: 'rgba(20,20,19,.08)' }} />}

      {vista !== 'cuenta' && (loading ? (
        <div className="flex items-center gap-2 px-2" role="status" style={{ color: 'var(--slate)', fontSize: 12 }}>
          <Loader2 size={12} className="animate-spin" />
          Cargando documentos...
        </div>
      ) : (
        <DocumentosViajes viajes={viajes} />
      ))}
    </div>
  );
}
