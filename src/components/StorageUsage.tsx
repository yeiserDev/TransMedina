'use client';

import { useEffect, useState } from 'react';

function size(bytes: number) {
  const unit = bytes >= 1e9 ? 'GB' : 'MB';
  return `${(bytes / (unit === 'GB' ? 1e9 : 1e6)).toLocaleString('es-PE', { maximumFractionDigits: 2 })} ${unit}`;
}

export default function StorageUsage() {
  const [quota, setQuota] = useState<{ used: number; limit: number | null } | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let controller: AbortController | undefined;
    const refresh = async () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const response = await fetch('/api/drive/storage', { signal: request.signal });
        if (!response.ok) throw new Error();
        const data = await response.json();
        setQuota(data);
        setError(false);
      } catch {
        if (!request.signal.aborted) setError(true);
      }
    };
    void refresh();
    window.addEventListener('viajes-updated', refresh);
    return () => { controller?.abort(); window.removeEventListener('viajes-updated', refresh); };
  }, [attempt]);
  const percent = quota?.limit ? Math.min(100, quota.used / quota.limit * 100) : 0;
  return (
    <section aria-label="Almacenamiento de Google" className="shrink-0 px-2 text-[11px]" style={{ color: 'var(--slate)' }}>
      <div className="flex justify-between gap-2"><span className="font-medium">Almacenamiento Google</span>{quota?.limit != null && <span className="tabular-nums">{Math.round(percent)}%</span>}</div>
      {quota ? <>
        {quota.limit !== null && <div role="meter" aria-label="Espacio usado" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-valuetext={`${size(quota.used)} usados de ${size(quota.limit)}`} className="my-1.5 h-1 overflow-hidden rounded-full" style={{ background: 'var(--dust)' }}><div className="h-full rounded-full" style={{ width: `${percent}%`, background: percent >= 90 ? 'var(--signal)' : 'var(--ink)' }} /></div>}
        <p className="mt-1 tabular-nums">{size(quota.used)} usados{quota.limit !== null ? ` · ${size(Math.max(0, quota.limit - quota.used))} libres` : ' · Sin límite informado'}</p>
        <p className="text-[10px]">Cuenta completa, incluye Gmail y Fotos.</p>
      </> : !error && <p className="mt-1" role="status">Consultando espacio…</p>}
      {error && <p role="status" className="mt-1">{quota ? 'No se pudo actualizar.' : 'Espacio no disponible.'} <button type="button" onClick={() => setAttempt(a => a + 1)} className="underline underline-offset-2 cursor-pointer">Reintentar</button></p>}
    </section>
  );
}
