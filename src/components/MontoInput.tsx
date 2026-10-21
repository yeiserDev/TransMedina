'use client';

import { useRef, useState } from 'react';
import { limpiarMonto, mostrarMonto, pegarMonto } from '@/lib/soles';
import styles from './ViajeForm.module.css';

export default function MontoInput({ id, value, onChange }: { id: string; value: number; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState(value ? value.toFixed(2) : '');
  const input = useRef<HTMLInputElement>(null);

  function actualizar(next: string, posicion?: number) {
    setDraft(next);
    onChange(Number(next) || 0);
    if (posicion !== undefined) requestAnimationFrame(() => {
      const text = input.current?.value ?? '';
      let restantes = posicion;
      let cursor = 0;
      while (cursor < text.length && restantes > 0) {
        if (text[cursor] !== ',') restantes--;
        cursor++;
      }
      input.current?.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div className={styles.amount}>
      <span aria-hidden="true">S/</span>
      <input ref={input} id={id} type="text" inputMode="decimal" autoComplete="off" required
        aria-label="Monto en soles" aria-describedby={`${id}-ayuda`} placeholder="0.00"
        value={mostrarMonto(draft)}
        onChange={event => {
          const antes = event.target.value.slice(0, event.target.selectionStart ?? 0).replace(/,/g, '');
          actualizar(limpiarMonto(event.target.value), limpiarMonto(antes).length);
        }}
        onPaste={event => {
          event.preventDefault();
          const element = event.currentTarget;
          const valor = element.value;
          const inicio = element.selectionStart ?? 0;
          const fin = element.selectionEnd ?? inicio;
          const pegado = pegarMonto(event.clipboardData.getData('text'));
          const next = limpiarMonto(valor.slice(0, inicio).replace(/,/g, '') + pegado + valor.slice(fin).replace(/,/g, ''));
          actualizar(next, inicio === 0 && fin === valor.length ? next.length : limpiarMonto(valor.slice(0, inicio)).length + pegado.length);
        }}
        onKeyDown={event => {
          const el = event.currentTarget;
          const cursor = el.selectionStart ?? 0;
          if (event.key === 'Backspace' && cursor === el.selectionEnd && el.value[cursor - 1] === ',') {
            event.preventDefault();
            const antes = el.value.slice(0, cursor - 2).replace(/,/g, '');
            actualizar(limpiarMonto(antes + el.value.slice(cursor)), antes.length);
          }
        }}
        onBlur={() => { if (draft) setDraft(Number(draft).toFixed(2)); }}
      />
    </div>
  );
}
