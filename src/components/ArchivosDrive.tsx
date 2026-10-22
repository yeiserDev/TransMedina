'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Upload,
  ExternalLink,
  Loader2,
  Check,
  Eye,
  RefreshCw,
  Truck,
  Receipt,
  Coins,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDoc } from '@/lib/documentos';
import DrivePreviewModal from './DrivePreviewModal';
import cardStyles from './DocumentCards.module.css';

export type TipoArchivo = 'guias' | 'facturas' | 'detracciones';

interface ArchivoRowProps {
  tipo: TipoArchivo;
  label: string;
  sublabel: string;
  driveId: string | null;
  viajeId: string;
  readOnly?: boolean;
  onUploaded?: (tipo: TipoArchivo, driveId: string) => void;
  onPreview: (driveId: string, label: string) => void;
}

const ACEPTA = '.pdf,.png,.jpg,.jpeg';

function ArchivoRow({
  tipo,
  label,
  sublabel,
  driveId,
  viajeId,
  readOnly = false,
  onUploaded,
  onPreview,
}: ArchivoRowProps) {
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [localDriveId, setLocalDriveId] = useState<string | null>(driveId);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalDriveId(driveId);
  }, [driveId]);

  const subir = async (file: File) => {
    if (readOnly) return;
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
      onUploaded?.(tipo, newId);

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
    if (uploading || readOnly) return;
    const file = e.dataTransfer.files?.[0];
    if (file) subir(file);
  };

  const tieneArchivo = Boolean(localDriveId);
  const esZonaCarga = !readOnly && !tieneArchivo && !uploading && !done;

  const IconComponent =
    tipo === 'guias' ? Truck : tipo === 'facturas' ? Receipt : Coins;

  return (
    <article
      className={cardStyles.row}
      data-empty={!tieneArchivo}
      data-dragging={dragging}
      data-done={done}
      onDragOver={e => {
        e.preventDefault();
        if (!uploading && !readOnly) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => {
        if (esZonaCarga) inputRef.current?.click();
      }}
      style={{ cursor: esZonaCarga ? 'pointer' : 'default' }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACEPTA}
        hidden
        onChange={handleInput}
        aria-label={`Subir ${label.toLowerCase()}`}
      />

      {/* Left side: Icon + Meta + Status */}
      <div className={cardStyles.leftCol}>
        <div className={cardStyles.iconBox} data-type={tipo}>
          <IconComponent size={18} />
          {tieneArchivo && (
            <span className={cardStyles.iconCheck} title="Documento adjunto">
              <Check size={10} strokeWidth={3} />
            </span>
          )}
        </div>

        <div className={cardStyles.meta}>
          <div className={cardStyles.titleLine}>
            <span className={cardStyles.docTitle}>{label}</span>
            <span
              className={cardStyles.statusPill}
              data-status={tieneArchivo ? 'ok' : 'pending'}
            >
              {tieneArchivo ? (
                <>
                  <Check size={9} strokeWidth={2.5} /> Adjunto
                </>
              ) : (
                'Sin archivo'
              )}
            </span>
          </div>
          <span className={cardStyles.docNumber} title={sublabel}>
            {sublabel}
          </span>
        </div>
      </div>

      {/* Right side: Actions / Upload State */}
      <div className={cardStyles.rightCol} onClick={e => e.stopPropagation()}>
        {uploading ? (
          <div className={cardStyles.uploadingState} role="status">
            <Loader2 size={13} className="animate-spin text-amber-600" />
            <span>Subiendo…</span>
          </div>
        ) : done ? (
          <div className={cardStyles.doneState} role="status">
            <Check size={13} />
            <span>¡Guardado!</span>
          </div>
        ) : tieneArchivo ? (
          <>
            <button
              type="button"
              className={cardStyles.btnPrimary}
              onClick={() => onPreview(localDriveId!, `${label} · ${sublabel}`)}
              title={`Ver ${label.toLowerCase()}`}
            >
              <Eye size={13} />
              <span>Ver</span>
            </button>

            <a
              href={`https://drive.google.com/file/d/${localDriveId}/view`}
              target="_blank"
              rel="noopener noreferrer"
              className={cardStyles.iconBtn}
              title={`Abrir ${label.toLowerCase()} en Google Drive`}
            >
              <ExternalLink size={13} />
            </a>

            {!readOnly && (
              <button
                type="button"
                className={cardStyles.iconBtn}
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                title={`Reemplazar ${label.toLowerCase()}`}
              >
                <RefreshCw size={13} />
              </button>
            )}
          </>
        ) : (
          <>
            {!readOnly ? (
              <button
                type="button"
                className={cardStyles.btnUpload}
                onClick={() => inputRef.current?.click()}
                title={`Subir ${label.toLowerCase()}`}
              >
                <Upload size={13} />
                <span>Subir</span>
              </button>
            ) : (
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--slate)',
                  fontStyle: 'italic',
                  paddingRight: 6,
                }}
              >
                Sin adjuntar
              </span>
            )}
          </>
        )}
      </div>
    </article>
  );
}

interface Props {
  variant?: 'rows' | 'cards';
  readOnly?: boolean;
  viajeId: string;
  driveIdGuia: string | null;
  driveIdFactura: string | null;
  driveIdDetraccion?: string | null;
  numeroGuia?: string | null;
  numeroFactura?: string | null;
  montoDetraccion?: number | null;
  onUploaded?: (tipo: TipoArchivo, driveId: string) => void;
  onPreviewCustom?: (driveId: string, label: string) => void;
}

export default function ArchivosDrive({
  readOnly = false,
  viajeId,
  driveIdGuia,
  driveIdFactura,
  driveIdDetraccion,
  numeroGuia,
  numeroFactura,
  montoDetraccion,
  onUploaded,
  onPreviewCustom,
}: Props) {
  const [internalPreview, setInternalPreview] = useState<{
    driveId: string;
    label: string;
  } | null>(null);

  const handlePreview = (driveId: string, label: string) => {
    if (onPreviewCustom) {
      onPreviewCustom(driveId, label);
    } else {
      setInternalPreview({ driveId, label });
    }
  };

  const totalAdjuntos =
    (driveIdGuia ? 1 : 0) +
    (driveIdFactura ? 1 : 0) +
    (driveIdDetraccion ? 1 : 0);

  return (
    <div className={cardStyles.wrapper}>
      {/* Header with summary count and animated completion dots */}
      <div className={cardStyles.summaryHeader}>
        <div className={cardStyles.summaryText}>
          <span className={cardStyles.summaryTitle}>Documentos</span>
          <span className={cardStyles.summaryCounter}>
            {totalAdjuntos} de 3 listos
          </span>
        </div>

        <div
          className={cardStyles.progressBar}
          aria-label={`${totalAdjuntos} de 3 documentos adjuntados`}
        >
          <span
            className={cardStyles.progressDot}
            data-active={Boolean(driveIdGuia)}
            title="Guía"
          />
          <span
            className={cardStyles.progressDot}
            data-active={Boolean(driveIdFactura)}
            title="Factura"
          />
          <span
            className={cardStyles.progressDot}
            data-active={Boolean(driveIdDetraccion)}
            title="Detracción"
          />
        </div>
      </div>

      {/* 3 Balanced and Ordered Document Rows */}
      <div className={cardStyles.list}>
        <ArchivoRow
          tipo="guias"
          label="Guía Transportista"
          sublabel={numeroGuia ? formatDoc(numeroGuia) || 'Sin número' : 'Sin número registrado'}
          driveId={driveIdGuia}
          viajeId={viajeId}
          readOnly={readOnly}
          onUploaded={onUploaded}
          onPreview={handlePreview}
        />

        <ArchivoRow
          tipo="facturas"
          label="Factura Electrónica"
          sublabel={numeroFactura ? formatDoc(numeroFactura) || 'Sin número' : 'Pendiente de facturación'}
          driveId={driveIdFactura}
          viajeId={viajeId}
          readOnly={readOnly}
          onUploaded={onUploaded}
          onPreview={handlePreview}
        />

        <ArchivoRow
          tipo="detracciones"
          label="Constancia Detracción"
          sublabel={
            montoDetraccion
              ? `SPOT 4% · S/ ${montoDetraccion.toFixed(2)}`
              : 'Banco de la Nación · 4%'
          }
          driveId={driveIdDetraccion ?? null}
          viajeId={viajeId}
          readOnly={readOnly}
          onUploaded={onUploaded}
          onPreview={handlePreview}
        />
      </div>

      {/* Internal modal fallback when no custom preview is provided */}
      {internalPreview && (
        <DrivePreviewModal
          driveId={internalPreview.driveId}
          label={internalPreview.label}
          onClose={() => setInternalPreview(null)}
        />
      )}
    </div>
  );
}
