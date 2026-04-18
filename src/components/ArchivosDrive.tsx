'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, ExternalLink, Loader2 } from 'lucide-react';
import { Viaje } from '@/types';

interface Props {
  viaje: Viaje;
  onUpdated: () => void;
}

type TipoArchivo = 'guias' | 'facturas';

function ArchivoItem({
  label,
  driveId,
  viajeId,
  tipo,
  onUpdated,
}: {
  label: string;
  driveId: string | null;
  viajeId: string;
  tipo: TipoArchivo;
  onUpdated: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('viajeId', viajeId);
      fd.append('tipo', tipo);
      const res = await fetch('/api/drive', { method: 'POST', body: fd });
      if (!res.ok) throw new Error();
      onUpdated();
    } catch {
      alert('Error al subir el archivo. Intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-600 font-medium">{label}</span>
      <div className="flex items-center gap-2">
        {driveId ? (
          <a
            href={`https://drive.google.com/file/d/${driveId}/view`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <FileText size={14} />
            Ver archivo
            <ExternalLink size={12} />
          </a>
        ) : (
          <span className="text-xs text-gray-400">Sin archivo</span>
        )}
        <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" hidden onChange={handleUpload} />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-lg transition-colors disabled:opacity-60"
        >
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {driveId ? 'Reemplazar' : 'Subir'}
        </button>
      </div>
    </div>
  );
}

export default function ArchivosDrive({ viaje, onUpdated }: Props) {
  return (
    <div className="divide-y divide-gray-100">
      <ArchivoItem
        label="Guía de transporte"
        driveId={viaje.drive_id_guia}
        viajeId={viaje.id}
        tipo="guias"
        onUpdated={onUpdated}
      />
      <ArchivoItem
        label="Factura"
        driveId={viaje.drive_id_factura}
        viajeId={viaje.id}
        tipo="facturas"
        onUpdated={onUpdated}
      />
    </div>
  );
}
