'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, ExternalLink, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

type TipoArchivo = 'guias' | 'facturas';

interface Props {
  viajeId: string;
  driveIdGuia: string | null;
  driveIdFactura: string | null;
  onUploaded: (tipo: TipoArchivo, driveId: string) => void;
}

function ArchivoItem({
  label,
  driveId,
  viajeId,
  tipo,
  onUploaded,
}: {
  label: string;
  driveId: string | null;
  viajeId: string;
  tipo: TipoArchivo;
  onUploaded: (tipo: TipoArchivo, driveId: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [localDriveId, setLocalDriveId] = useState<string | null>(driveId);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('viajeId', viajeId);
      fd.append('tipo', tipo);
      const res = await fetch('/api/drive', { method: 'POST', body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const { driveId: newId } = await res.json();
      setLocalDriveId(newId);
      onUploaded(tipo, newId);

      // Animación de éxito
      setDone(true);
      toast.success(`${label} subida correctamente`);
      setTimeout(() => setDone(false), 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`No se pudo subir: ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center justify-between py-2.5">
      {/* Nombre + link */}
      <div className="flex items-center gap-2 min-w-0">
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>{label}</span>
        {localDriveId && (
          <a
            href={`https://drive.google.com/file/d/${localDriveId}/view`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 transition-opacity hover:opacity-70"
            style={{ fontSize: 11, color: 'var(--link)', textDecoration: 'none' }}
          >
            <FileText size={11} />
            Ver
            <ExternalLink size={10} />
          </a>
        )}
        {!localDriveId && (
          <span style={{ fontSize: 11, color: 'var(--dust)' }}>Sin archivo</span>
        )}
      </div>

      {/* Botón subir */}
      <div>
        <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" hidden onChange={handleUpload} />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 transition-all duration-200"
          style={{
            fontSize: 11,
            fontWeight: 500,
            padding: '4px 10px',
            borderRadius: 'var(--r-pill)',
            border: done
              ? '1px solid #86EFAC'
              : '1px solid rgba(20,20,19,.18)',
            background: done ? '#DCFCE7' : uploading ? 'var(--canvas)' : 'transparent',
            color: done ? '#16A34A' : 'var(--ink)',
            cursor: uploading ? 'not-allowed' : 'pointer',
            minWidth: 76,
            justifyContent: 'center',
          }}
          onMouseEnter={e => {
            if (!uploading && !done)
              (e.currentTarget as HTMLElement).style.background = 'var(--canvas)';
          }}
          onMouseLeave={e => {
            if (!uploading && !done)
              (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          {uploading
            ? <Loader2 size={11} className="animate-spin" />
            : done
              ? <Check size={11} className="anim-scale-in" />
              : <Upload size={11} />
          }
          <span className={done ? 'anim-fade-in' : ''}>
            {uploading ? 'Subiendo…' : done ? '¡Listo!' : localDriveId ? 'Reemplazar' : 'Subir'}
          </span>
        </button>
      </div>
    </div>
  );
}

export default function ArchivosDrive({ viajeId, driveIdGuia, driveIdFactura, onUploaded }: Props) {
  return (
    <div style={{ borderTop: '1px solid rgba(20,20,19,.07)', paddingTop: 2 }}>
      <ArchivoItem
        label="Guía"
        driveId={driveIdGuia}
        viajeId={viajeId}
        tipo="guias"
        onUploaded={onUploaded}
      />
      <div style={{ height: 1, background: 'rgba(20,20,19,.06)', margin: '0 0' }} />
      <ArchivoItem
        label="Factura"
        driveId={driveIdFactura}
        viajeId={viajeId}
        tipo="facturas"
        onUploaded={onUploaded}
      />
    </div>
  );
}
