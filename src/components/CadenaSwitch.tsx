'use client';

import type { FiltroCadena } from '@/types';
import { CADENAS } from '@/lib/cadenas';
import styles from './CadenaSwitch.module.css';

export default function CadenaSwitch({ value, onChange, conGeneral = false }: {
  value?: FiltroCadena;
  onChange: (value?: FiltroCadena) => void;
  conGeneral?: boolean;
}) {
  const options: { value: FiltroCadena | undefined; label: string }[] = [
    { value: undefined, label: 'Todas las cargas' },
    ...CADENAS,
    ...(conGeneral ? [{ value: 'general' as const, label: 'General FART' }] : []),
  ];
  return <div className={styles.switch} role="group" aria-label="Filtrar por cadena de la carga">
    {options.map(option => <button key={option.value ?? 'todas'} type="button"
      aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
      {option.label}
    </button>)}
  </div>;
}
