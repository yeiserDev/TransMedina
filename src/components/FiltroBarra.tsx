'use client';

import { FiltrosViaje, EstadoViaje, EstadoDetraccion } from '@/types';
import { X } from 'lucide-react';

interface Props {
  filtros: FiltrosViaje;
  meses: string[];
  onChange: (filtros: FiltrosViaje) => void;
}

function PillSelect({
  value,
  onChange,
  children,
  active,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  active: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pr-7 pl-4 py-2 text-xs cursor-pointer outline-none transition-all duration-150"
        style={{
          borderRadius: 'var(--r-pill)',
          border: active ? '1.5px solid var(--ink)' : '1px solid rgba(20,20,19,.18)',
          background: active ? 'var(--ink)' : 'var(--white)',
          color: active ? 'var(--canvas)' : 'var(--slate)',
          fontFamily: 'inherit',
          fontWeight: active ? 500 : 450,
          letterSpacing: '-0.01em',
        }}
      >
        {children}
      </select>
      <span
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px]"
        style={{ color: active ? 'var(--canvas)' : 'var(--slate)' }}
      >
        ▾
      </span>
    </div>
  );
}

export default function FiltroBarra({ filtros, meses, onChange }: Props) {
  const hasFilters = filtros.mes || filtros.estado || filtros.detraccion;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <PillSelect
        value={filtros.mes ?? ''}
        onChange={(v) => onChange({ ...filtros, mes: v || undefined })}
        active={!!filtros.mes}
      >
        <option value="">Todos los meses</option>
        {meses.map((m) => (
          <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
        ))}
      </PillSelect>

      <PillSelect
        value={filtros.estado ?? ''}
        onChange={(v) => onChange({ ...filtros, estado: (v as EstadoViaje) || undefined })}
        active={!!filtros.estado}
      >
        <option value="">Estado factura</option>
        <option value="pendiente">Sin facturar</option>
        <option value="facturado">Facturado</option>
      </PillSelect>

      <PillSelect
        value={filtros.detraccion ?? ''}
        onChange={(v) => onChange({ ...filtros, detraccion: (v as EstadoDetraccion) || undefined })}
        active={!!filtros.detraccion}
      >
        <option value="">Detracción</option>
        <option value="pendiente">Pendiente</option>
        <option value="realizado">Realizado</option>
      </PillSelect>

      {hasFilters && (
        <button
          onClick={() => onChange({})}
          className="flex items-center gap-1 px-3 py-2 text-xs transition-opacity hover:opacity-70"
          style={{
            borderRadius: 'var(--r-pill)',
            border: '1px solid rgba(207,69,0,.3)',
            color: 'var(--signal)',
            background: 'transparent',
            fontWeight: 450,
          }}
        >
          <X size={11} />
          Limpiar
        </button>
      )}
    </div>
  );
}
