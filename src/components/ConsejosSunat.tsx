'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Lightbulb, ExternalLink } from 'lucide-react';

/**
 * Recordatorios tributarios para transporte de carga terrestre.
 *
 * Contenido fijo y editable a mano: son reglas que cambian poco, pero cambian.
 * Están redactados como recordatorios, no como asesoría — la nota al pie
 * remite a SUNAT, que es la fuente que manda.
 */
interface Consejo {
  tag: string;
  titulo: string;
  texto: string;
}

const CONSEJOS: Consejo[] = [
  {
    tag: 'Detracción',
    titulo: 'Transporte de bienes: 4%',
    texto: 'El transporte de bienes por vía terrestre está sujeto a detracción del 4% cuando el importe supera S/ 400. El depósito lo hace el cliente.',
  },
  {
    tag: 'Detracción',
    titulo: 'Guarda la constancia',
    texto: 'Sin la constancia del depósito el cliente no puede usar el crédito fiscal. Adjúntala junto a la factura del viaje.',
  },
  {
    tag: 'Plazos',
    titulo: 'Cuándo se deposita',
    texto: 'A más tardar en la fecha de pago, o hasta el quinto día hábil del mes siguiente a la anotación del comprobante — lo que ocurra primero.',
  },
  {
    tag: 'GRE',
    titulo: 'Guía antes de salir',
    texto: 'La guía de remisión electrónica —remitente y transportista— debe estar emitida antes de iniciar el traslado, no después.',
  },
  {
    tag: 'Factura',
    titulo: 'Envío a SUNAT',
    texto: 'La factura electrónica se envía dentro de los 3 días calendario desde su emisión. Fuera de plazo pierde validez y hay que emitirla de nuevo.',
  },
  {
    tag: 'Archivo',
    titulo: 'Conserva 5 años',
    texto: 'Comprobantes y guías se conservan 5 años. Subir el PDF de cada viaje aquí ya te arma ese respaldo ordenado por mes.',
  },
  {
    tag: 'Control',
    titulo: 'Cruza guía con factura',
    texto: 'SUNAT contrasta la guía de remisión con la factura del servicio. Números, fechas y montos deben coincidir entre ambas.',
  },
];

export default function ConsejosSunat() {
  const [i, setI] = useState(0);
  const c = CONSEJOS[i];
  const mover = (paso: number) => setI(p => (p + paso + CONSEJOS.length) % CONSEJOS.length);

  return (
    <div
      className="mt-3"
      style={{
        background: 'var(--white)',
        borderRadius: 'var(--r-panel)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }}
    >
      {/* Cabecera */}
      <div className="flex items-center gap-1.5" style={{ padding: '12px 14px 0' }}>
        <Lightbulb size={12} style={{ color: 'var(--signal)', flexShrink: 0 }} />
        <span className="eyebrow eyebrow-plain" style={{ fontSize: 9, letterSpacing: '0.08em' }}>
          Consejo SUNAT
        </span>
      </div>

      <div style={{ padding: '10px 14px 12px' }}>
        <span
          className="badge-pill"
          style={{ background: 'var(--canvas)', color: 'var(--slate)', fontSize: 9, padding: '2px 7px' }}
        >
          {c.tag}
        </span>

        {/* minHeight fija la caja al consejo más largo: sin ella la tarjeta
            da saltos al pasar de uno a otro. */}
        <div style={{ minHeight: 132 }}>
          <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em', margin: '8px 0 4px', lineHeight: 1.3 }}>
            {c.titulo}
          </p>
          <p style={{ fontSize: 11, color: 'var(--slate)', lineHeight: 1.5 }}>
            {c.texto}
          </p>
        </div>

        {/* Navegación */}
        <div className="flex items-center justify-between" style={{ marginTop: 10 }}>
          <div className="flex items-center gap-1">
            <BotonPaso etiqueta="Consejo anterior" onClick={() => mover(-1)}>
              <ChevronLeft size={13} />
            </BotonPaso>
            <BotonPaso etiqueta="Siguiente consejo" onClick={() => mover(1)}>
              <ChevronRight size={13} />
            </BotonPaso>
          </div>
          <span style={{ fontSize: 9, color: 'var(--dust)', fontVariantNumeric: 'tabular-nums' }}>
            {i + 1}/{CONSEJOS.length}
          </span>
        </div>
      </div>

      {/* Pie: la fuente que manda */}
      <a
        href="https://www.sunat.gob.pe"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1 transition-colors"
        style={{
          padding: '7px 14px',
          background: 'var(--canvas)',
          fontSize: 9,
          color: 'var(--slate)',
          textDecoration: 'none',
        }}
      >
        Verifica en sunat.gob.pe
        <ExternalLink size={9} />
      </a>
    </div>
  );
}

function BotonPaso({ etiqueta, onClick, children }: { etiqueta: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={etiqueta}
      aria-label={etiqueta}
      className="flex items-center justify-center transition-colors"
      style={{
        width: 24,
        height: 24,
        borderRadius: 8,
        border: '1px solid rgba(20,20,19,.10)',
        background: 'var(--white)',
        color: 'var(--slate)',
        cursor: 'pointer',
      }}
      onMouseEnter={e => { const t = e.currentTarget as HTMLElement; t.style.background = 'var(--canvas)'; t.style.color = 'var(--ink)'; }}
      onMouseLeave={e => { const t = e.currentTarget as HTMLElement; t.style.background = 'var(--white)'; t.style.color = 'var(--slate)'; }}
    >
      {children}
    </button>
  );
}
