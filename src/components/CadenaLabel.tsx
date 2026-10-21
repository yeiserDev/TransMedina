import Image from 'next/image';
import type { Cadena } from '@/types';
import { nombreCadena } from '@/lib/cadenas';
import styles from './CadenaLabel.module.css';

export default function CadenaLabel({ cadena }: { cadena: Cadena | null }) {
  return (
    <span className={styles.label}>
      {cadena && (
        <span className={styles.mark} aria-hidden="true">
          <Image
            src={cadena === 'ripley' ? '/brands/ripley.ico' : '/brands/oechsle.svg'}
            alt=""
            width={cadena === 'ripley' ? 14 : 20}
            height={cadena === 'ripley' ? 14 : 11}
            unoptimized
          />
        </span>
      )}
      <span>{nombreCadena(cadena)}</span>
    </span>
  );
}
