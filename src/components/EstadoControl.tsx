'use client';

import { Check, Clock3 } from 'lucide-react';
import styles from './ViajeForm.module.css';

export default function EstadoControl({ label, value, completado, onChange }: {
  label: string; value: string; completado: { value: string; label: string }; onChange: (value: string) => void;
}) {
  return (
    <fieldset className={styles.statusField}>
      <legend className="eyebrow block mb-2">{label}</legend>
      <div className={styles.status} data-complete={value === completado.value}>
        <span className={styles.statusSlider} aria-hidden="true" />
        {[{ value: 'pendiente', label: 'Pendiente', Icon: Clock3 }, { ...completado, Icon: Check }].map(option => (
          <label key={option.value} className={styles.statusOption}>
            <input type="radio" name={label} value={option.value} checked={value === option.value}
              onChange={() => onChange(option.value)} />
            <span><option.Icon size={13} aria-hidden="true" />{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
