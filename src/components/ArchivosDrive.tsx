'use client';

import { useState, useRef } from 'react';
import { Upload, ExternalLink, Loader2, Check, Eye, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { formatDoc } from '@/lib/documentos';
import IconoPdf from './IconoPdf';
import DrivePreviewModal from './DrivePreviewModal';

type TipoArchivo = 'guias' | 'facturas';

interface Props {
  viajeId: string;
  driveIdGuia: string | null;
  driveIdFactura: string | null;
  numeroGuia?: string | null;
  numeroFactura?: string | null;
  onUploaded: (tipo: TipoArchivo, driveId: string) => void;
}

const ACEPTA = '.pdf,.png,.jpg,.jpeg';

function ArchivoCard({
  label,
  numero,
  driveId,
  viajeId,
  tipo,
  onUploaded,
}: {
  label: string;
  numero?: string | null;
  driveId: string | null;
  viajeId: string;
  tipo: TipoArchivo;
  onUploaded: (tipo: TipoArchivo, driveId: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [localDriveId, setLocalDriveId] = useState<string | null>(driveId);
  const [preview, setPreview] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const subir = async (file: File) => {
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

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) subir(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) subir(file);
  };

  const tieneArchivo = Boolean(localDriveId);

  // Sin archivo: la tarjeta entera es zona de carga (clic o arrastrar)
  const esZonaCarga = !tieneArchivo && !uploading && !done;

  return (
    <>
      <div
        onDragOver={e => { e.preventDefault(); if (!uploading) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => { if (esZonaCarga) inputRef.current?.click(); }}
        className="group flex items-center gap-2.5 sm:gap-3 rounded-2xl transition-all"
        style={{
          padding: '10px 12px',
          minHeight: 58,
          cursor: esZonaCarga ? 'pointer' : 'default',
          background: dragging ? '#FFF6F0' : done ? '#F4FDF7' : tieneArchivo ? 'var(--white)' : 'transparent',
          border: dragging
            ? '1.5px dashed var(--signal-light)'
            : done
              ? '1.5px solid #A7E8BE'
              : tieneArchivo
                ? '1px solid rgba(20,20,19,.07)'
                : '1.5px dashed rgba(20,20,19,.13)',
          boxShadow: tieneArchivo && !dragging && !done ? 'var(--shadow-card)' : 'none',
        }}
        onMouseEnter={e => { if (esZonaCarga) (e.currentTarget as HTMLElement).style.background = 'rgba(20,20,19,.025)'; }}
        onMouseLeave={e => { if (esZonaCarga) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <input ref={inputRef} type="file" accept={ACEPTA} hidden onChange={handleInput} />

        {/* Estado visual del archivo */}
        <div
          className="flex items-center justify-center rounded-xl transition-colors"
          style={{
            width: 36,
            height: 36,
            flexShrink: 0,
            background: done ? '#DCFCE7' : tieneArchivo ? '#FDECEA' : 'rgba(20,20,19,.04)',
          }}
        >
          {uploading
            ? <Loader2 size={15} className="animate-spin" style={{ color: 'var(--slate)' }} />
            : done
              ? <Check size={16} style={{ color: '#16A34A' }} className="anim-scale-in" />
              : tieneArchivo
                ? <IconoPdf size={18} />
                : <Upload size={14} style={{ color: 'var(--dust)' }} />}
        </div>

        {/* Nombre, número y estado */}
        <div className="min-w-0 flex-1">
          <p className="eyebrow" style={{ fontSize: 9.5, letterSpacing: '0.4px', marginBottom: 1 }}>
            {label}
          </p>
          <p
            className="truncate"
            style={{
              fontSize: numero && !uploading && !done ? 11.5 : 11,
              fontWeight: numero && !uploading && !done ? 600 : 500,
              fontFamily: numero && !uploading && !done ? 'ui-monospace, SFMono-Regular, monospace' : undefined,
              color: uploading || done || tieneArchivo || numero ? 'var(--slate)' : 'var(--dust)',
              lineHeight: 1.35,
            }}
          >
            {uploading
              ? 'Subiendo…'
              : done
                ? '¡Listo!'
                : numero
                  ? formatDoc(numero)
                  : tieneArchivo
                    ? 'Documento adjunto'
                    : 'Toca para subir'}
          </p>
        </div>

        {/* Acciones — solo cuando ya hay archivo */}
        {tieneArchivo && !uploading && (
          <div
            /* En móvil no hay hover: dejarlos atenuados los volvería inservibles */
            className="flex items-center gap-0.5 transition-opacity opacity-100 sm:opacity-55 sm:group-hover:opacity-100"
            style={{ flexShrink: 0 }}
          >
            <button
              type="button"
              title="Ver documento"
              onClick={e => { e.stopPropagation(); setPreview(true); }}
              className="flex items-center justify-center rounded-lg transition-colors cursor-pointer"
              style={{ width: 32, height: 32, color: 'var(--slate)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--canvas)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
            >
              <Eye size={13} />
            </button>
            <a
              href={`https://drive.google.com/file/d/${localDriveId}/view`}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir en Drive"
              onClick={e => e.stopPropagation()}
              className="flex items-center justify-center rounded-lg transition-colors"
              style={{ width: 32, height: 32, color: 'var(--slate)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--canvas)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
            >
              <ExternalLink size={13} />
            </a>
            <button
              type="button"
              title="Reemplazar archivo"
              onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
              className="flex items-center justify-center rounded-lg transition-colors cursor-pointer"
              style={{ width: 32, height: 32, color: 'var(--slate)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--canvas)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
            >
              <RefreshCw size={13} />
            </button>
          </div>
        )}
      </div>

      {preview && localDriveId && (
        <DrivePreviewModal driveId={localDriveId} label={label} onClose={() => setPreview(false)} />
      )}
    </>
  );
}

export default function ArchivosDrive({
  viajeId,
  driveIdGuia,
  driveIdFactura,
  numeroGuia,
  numeroFactura,
  onUploaded,
}: Props) {
  return (
    // Una columna en móvil: a dos columnas cada tarjeta queda en ~145px y
    // los tres botones de acción no entran. Dos columnas desde sm.
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3" style={{ maxWidth: 680 }}>
      <ArchivoCard
        label="Guía"
        numero={numeroGuia}
        driveId={driveIdGuia}
        viajeId={viajeId}
        tipo="guias"
        onUploaded={onUploaded}
      />
      <ArchivoCard
        label="Factura"
        numero={numeroFactura}
        driveId={driveIdFactura}
        viajeId={viajeId}
        tipo="facturas"
        onUploaded={onUploaded}
      />
    </div>
  );
}
