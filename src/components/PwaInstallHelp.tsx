'use client';

import Image from 'next/image';
import { Share, RefreshCw } from 'lucide-react';

export default function PwaInstallHelp() {
  return <>
    <details className="pwa-install-help">
      <summary><Image src="/pwa/apple-touch-icon.png" width={32} height={32} alt="Camión con la R de Ripley" />Agregar al inicio del iPhone</summary>
      <p>Abre esta web en Safari. Toca <Share size={14} aria-hidden="true" /> <strong>Compartir</strong> y luego <strong>Agregar a Inicio</strong>. Si aparece, activa <strong>Abrir como app web</strong> y pulsa <strong>Agregar</strong>.</p>
    </details>
    <button type="button" onClick={() => window.location.reload()}><RefreshCw size={16} />Actualizar vista</button>
  </>;
}
