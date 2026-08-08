'use client';

import { useEffect, useRef, useState } from 'react';
import { FiltrosViaje, EstadoViaje, EstadoDetraccion } from '@/types';
import { X, Check, ChevronDown } from 'lucide-react';

interface Props {
  filtros: FiltrosViaje;
  meses: string[];
  onChange: (filtros: FiltrosViaje) => void;
}

interface Opcion {
  value: string;
  label: string;
}

/**
 * Desplegable propio. El <select> nativo no permite estilar la lista —la
 * dibuja el sistema operativo—, así que el panel se construye a mano para que
 * combine con el resto de la interfaz.
 */
function PillSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Opcion[];
  placeholder: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const cajaRef = useRef<HTMLDivElement>(null);
  const opcionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activo = value !== '';
  const seleccionada = options.find(o => o.value === value);
  const indiceActual = options.findIndex(o => o.value === value);

  // Cerrar al hacer clic fuera o con Escape
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!cajaRef.current?.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [abierto]);

  // Al abrir, el foco va a la opción seleccionada: así las flechas ya navegan
  // desde donde el usuario está parado.
  useEffect(() => {
    if (abierto) opcionRefs.current[Math.max(0, indiceActual)]?.focus();
  }, [abierto, indiceActual]);

  const navegar = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const ultimo = options.length - 1;
    const destino =
      e.key === 'Home' ? 0
        : e.key === 'End' ? ultimo
          : e.key === 'ArrowDown' ? (i === ultimo ? 0 : i + 1)
            : (i === 0 ? ultimo : i - 1);
    opcionRefs.current[destino]?.focus();
  };

  return (
    <div className="relative" ref={cajaRef}>
      <button
        type="button"
        onClick={() => setAbierto(a => !a)}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        className="flex items-center gap-1.5 pl-4 pr-2.5 py-2 text-xs cursor-pointer outline-none transition-all duration-150"
        style={{
          borderRadius: 'var(--r-pill)',
          border: activo ? '1.5px solid var(--ink)' : '1px solid rgba(20,20,19,.18)',
          background: activo ? 'var(--ink)' : 'var(--white)',
          color: activo ? 'var(--canvas)' : 'var(--slate)',
          fontWeight: activo ? 500 : 450,
          letterSpacing: '-0.01em',
          boxShadow: abierto ? '0 0 0 3px rgba(20,20,19,.07)' : 'none',
        }}
      >
        {seleccionada?.label ?? placeholder}
        <ChevronDown
          size={12}
          style={{
            opacity: 0.7,
            transition: 'transform 0.15s',
            transform: abierto ? 'rotate(180deg)' : 'none',
          }}
        />
      </button>

      {abierto && (
        <div
          role="listbox"
          className="absolute left-0 anim-scale-in"
          style={{
            top: 'calc(100% + 6px)',
            zIndex: 30,
            minWidth: '100%',
            width: 'max-content',
            maxWidth: 240,
            maxHeight: 300,
            overflowY: 'auto',
            padding: 4,
            borderRadius: 16,
            background: 'var(--white)',
            border: '1px solid rgba(20,20,19,.07)',
            /* --shadow-float es demasiado tenue para un panel que flota sobre
               las filas: necesita despegarse del fondo con claridad. */
            boxShadow: '0 12px 28px -8px rgba(20,20,19,.20), 0 2px 6px rgba(20,20,19,.06)',
            transformOrigin: 'top left',
          }}
        >
          {options.map((o, i) => {
            const esta = o.value === value;
            return (
              <button
                key={o.value}
                ref={el => { opcionRefs.current[i] = el; }}
                type="button"
                role="option"
                aria-selected={esta}
                onClick={() => { onChange(o.value); setAbierto(false); }}
                onKeyDown={e => navegar(e, i)}
                className="w-full flex items-center gap-2 text-left transition-colors outline-none"
                style={{
                  padding: '7px 9px',
                  borderRadius: 10,
                  border: 'none',
                  background: esta ? 'var(--canvas)' : 'transparent',
                  color: esta ? 'var(--ink)' : 'var(--slate)',
                  fontWeight: esta ? 600 : 450,
                  fontSize: 12,
                  letterSpacing: '-0.01em',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { if (!esta) (e.currentTarget as HTMLElement).style.background = 'var(--canvas-lifted)'; }}
                onMouseLeave={e => { if (!esta) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                onFocus={e => { if (!esta) (e.currentTarget as HTMLElement).style.background = 'var(--canvas-lifted)'; }}
                onBlur={e => { if (!esta) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span className="flex-1 truncate">{o.label}</span>
                {/* Hueco reservado siempre: sin él las etiquetas bailan al cambiar de selección */}
                <span style={{ width: 12, flexShrink: 0, color: 'var(--signal)' }}>
                  {esta && <Check size={12} />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FiltroBarra({ filtros, meses, onChange }: Props) {
  const hasFilters = filtros.mes || filtros.estado || filtros.detraccion;

  const opcionesMes: Opcion[] = [
    { value: '', label: 'Todos los meses' },
    ...meses.map(m => ({ value: m, label: m.charAt(0).toUpperCase() + m.slice(1) })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PillSelect
        value={filtros.mes ?? ''}
        onChange={v => onChange({ ...filtros, mes: v || undefined })}
        placeholder="Todos los meses"
        options={opcionesMes}
      />

      <PillSelect
        value={filtros.estado ?? ''}
        onChange={v => onChange({ ...filtros, estado: (v as EstadoViaje) || undefined })}
        placeholder="Estado factura"
        options={[
          { value: '', label: 'Estado factura' },
          { value: 'pendiente', label: 'Sin facturar' },
          { value: 'facturado', label: 'Facturado' },
        ]}
      />

      <PillSelect
        value={filtros.detraccion ?? ''}
        onChange={v => onChange({ ...filtros, detraccion: (v as EstadoDetraccion) || undefined })}
        placeholder="Detracción"
        options={[
          { value: '', label: 'Detracción' },
          { value: 'pendiente', label: 'Pendiente' },
          { value: 'realizado', label: 'Realizado' },
        ]}
      />

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
