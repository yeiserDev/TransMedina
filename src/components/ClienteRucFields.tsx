'use client';

import { useEffect, useRef, useState } from 'react';
import { esRuc } from '@/lib/ruc';
import styles from './ExternosWorkspace.module.css';

export default function ClienteRucFields({ ruc, nombre, disabled, onChange }: {
  ruc: string; nombre: string; disabled: boolean;
  onChange: (ruc: string, nombre: string) => void;
}) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const version = useRef(0);
  const cancel = () => {
    version.current++;
    if (timer.current) clearTimeout(timer.current);
    controller.current?.abort();
  };
  useEffect(() => () => {
    version.current++;
    if (timer.current) clearTimeout(timer.current);
    controller.current?.abort();
  }, []);
  async function lookup(numero: string) {
    cancel();
    const current = version.current;
    controller.current = new AbortController();
    setLoading(true); setMessage('Consultando razón social…');
    try {
      const response = await fetch(`/api/externos/ruc?numero=${numero}`, { signal: controller.current.signal, cache: 'no-store' });
      const data = await response.json();
      if (current !== version.current) return;
      if (!response.ok) throw new Error(data.error || 'No se pudo consultar. Escribe la razón social manualmente.');
      onChange(numero, data.razon_social);
      setMessage('Razón social encontrada. Revisa el nombre antes de guardar.');
    } catch (error) {
      if (current === version.current) setMessage(error instanceof Error ? error.message : 'No se pudo consultar el RUC.');
    } finally { if (current === version.current) setLoading(false); }
  }
  return <>
    <div className={styles.rucField}>
      <label htmlFor="cliente-ruc">RUC del cliente · opcional</label>
      <div><input id="cliente-ruc" inputMode="numeric" autoComplete="off" maxLength={11} pattern="[0-9]{11}" value={ruc} aria-describedby="ruc-message" disabled={disabled} placeholder="11 dígitos" onChange={e => {
        cancel(); setLoading(false);
        const numero = e.target.value.replace(/\D/g, '').slice(0, 11);
        onChange(numero, '');
        setMessage(numero && !esRuc(numero) ? 'Completa los 11 dígitos para consultar.' : '');
        if (esRuc(numero)) timer.current = setTimeout(() => void lookup(numero), 500);
      }} /><button type="button" disabled={disabled || loading || !esRuc(ruc)} onClick={() => void lookup(ruc)}>{loading ? 'Consultando…' : 'Consultar RUC'}</button></div>
      <p id="ruc-message" role="status" className={styles.hint}>{message || 'Al completar el RUC se buscará la razón social.'}</p>
    </div>
    <label>Razón social / cliente<input required disabled={disabled} maxLength={160} value={nombre} placeholder="Nombre de la empresa" onChange={e => { cancel(); setLoading(false); setMessage(''); onChange(ruc, e.target.value); }} /><span>Puedes completarla o corregirla manualmente.</span></label>
  </>;
}
