'use client';

import { EstadoDetraccion, EstadoViaje } from '@/types';
import { CheckCircle2, Clock, Loader2 } from 'lucide-react';

export function BadgeEstado({ estado }: { estado: EstadoViaje }) {
  const ok = estado === 'facturado';
  return (
    <span
      className="badge-pill"
      style={
        ok
          ? { background: '#E6F4EC', color: '#166534' }
          : { background: '#FEF9E6', color: '#92400E' }
      }
    >
      {ok ? <CheckCircle2 size={11} /> : <Clock size={11} />}
      {ok ? 'Facturado' : 'Pendiente'}
    </span>
  );
}

export function ToggleDetraccion({
  detraccion,
  viajeId,
  onToggle,
  loading,
}: {
  detraccion: EstadoDetraccion;
  viajeId: string;
  onToggle: (id: string, valor: EstadoDetraccion) => void;
  loading?: boolean;
}) {
  const next: EstadoDetraccion = detraccion === 'pendiente' ? 'realizado' : 'pendiente';
  const ok = detraccion === 'realizado';
  return (
    <button
      onClick={() => onToggle(viajeId, next)}
      disabled={loading}
      className="badge-pill transition-opacity cursor-pointer disabled:opacity-50"
      style={
        ok
          ? { background: '#E6F4EC', color: '#166534' }
          : { background: '#FFF3E0', color: '#B45309' }
      }
    >
      {loading
        ? <Loader2 size={11} className="animate-spin" />
        : ok ? <CheckCircle2 size={11} /> : <Clock size={11} />
      }
      {ok ? 'Realizado' : 'Pendiente'}
    </button>
  );
}
