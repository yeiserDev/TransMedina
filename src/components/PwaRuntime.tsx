'use client';

import { useEffect, useSyncExternalStore } from 'react';

const subscribeNetwork = (notify: () => void) => {
  window.addEventListener('online', notify);
  window.addEventListener('offline', notify);
  return () => { window.removeEventListener('online', notify); window.removeEventListener('offline', notify); };
};

export default function PwaRuntime() {
  const online = useSyncExternalStore(subscribeNetwork, () => navigator.onLine, () => true);
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !window.isSecureContext || !('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch(error => console.error('No se pudo activar el modo PWA de TransMedina.', error));
  }, []);
  return online ? null : <div className="pwa-network-status" role="status">Sin conexión. Los datos pueden no estar actualizados.</div>;
}
