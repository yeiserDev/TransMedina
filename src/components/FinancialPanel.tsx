'use client';

import { useEffect, useState, useMemo } from 'react';
import { TrendingUp, Loader2, ArrowUpRight } from 'lucide-react';
import { Viaje } from '@/types';
import DocumentosViajes from './DocumentosViajes';
import DepositosModal from './DepositosModal';
import StorageUsage from './StorageUsage';

function fmt(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
}

export default function FinancialPanel({ initialViajes, vista = 'completa', showStorage = false }: { initialViajes?: Viaje[]; vista?: 'completa' | 'cuenta' | 'documentos'; showStorage?: boolean }) {
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
    <div className={`flex flex-col gap-4 ${vista === 'completa' ? 'max-h-[calc(100dvh-120px)]' : ''}`}>

      {/* Por cobrar */}
      {vista !== 'documentos' && (loading ? (
        <div className="skeleton rounded-3xl" style={{ height: 140 }} />
      ) : (
        <button type="button" onClick={() => setVerDepositos(true)} aria-haspopup="dialog"
          aria-label={`${balancePorCobrar < 0 ? 'Saldo a favor' : 'Saldo por cobrar'} ${fmt(Math.abs(balancePorCobrar))}. Ver detalle de depósitos de FART`}
          className="shrink-0 rounded-3xl p-5 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--signal)]"
          style={{ background: 'var(--white)', boxShadow: 'var(--shadow-card)' }}>
          <span className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={15} style={{ color: 'var(--signal)' }} />
            <span style={{ fontSize: 13, fontWeight: 550 }}>{balancePorCobrar < 0 ? 'Saldo a favor' : 'Saldo por cobrar'}</span>
            <ArrowUpRight size={14} aria-hidden="true" className="ml-auto" style={{ color: 'var(--slate)' }} />
          </span>
          <span className="block" style={{ fontWeight: 700, fontSize: 'clamp(22px, 1.8vw, 30px)', fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere', letterSpacing: '-0.025em', color: 'var(--ink)', lineHeight: 1.2 }}>
            {fmt(Math.abs(balancePorCobrar))}
          </span>
          <span className="block text-xs mt-1.5" style={{ color: 'var(--slate)', fontWeight: 450 }}>
            FART · todas las cargas
          </span>
          <span className="block text-xs mt-3" style={{ color: 'var(--slate)' }}>Ver depósitos y saldo</span>
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
      {showStorage && <StorageUsage />}
    </div>
  );
}
