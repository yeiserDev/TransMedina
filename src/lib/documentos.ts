/**
 * Formato de números de guía y factura.
 *
 * En la base conviven variantes tipeadas a mano: "EG03 - 000240",
 * "EG03-000239", "eg03  000238", a veces con espacios sobrantes al final.
 * Los espacios alrededor del guion cuentan para el ancho, así que las series
 * de 6 dígitos se cortaban con "…" en la tabla mientras las de 5 entraban.
 * Normalizar al mostrar hace que el ancho sea predecible y que todos los
 * números se lean completos en cualquier pantalla.
 */

/**
 * Normaliza "EG03 - 000240", "EG03-000239", "eg03  000238"
 * → { serie: 'EG03', numero: '000240' }
 * Si no calza el patrón serie-número, todo va a `serie`.
 */
export function parseDoc(raw: string): { serie: string; numero: string } {
  const limpio = raw.trim().replace(/\s+/g, ' ');
  const m = limpio.match(/^([A-Za-z]{1,4}\s?\d{1,4})\s*[-–—]?\s*(\d{3,})$/);
  if (!m) return { serie: limpio, numero: '' };
  return { serie: m[1].replace(/\s/g, '').toUpperCase(), numero: m[2] };
}

/**
 * Versión compacta para mostrar: "EG03-000240".
 * Devuelve el guion sin espacios — dos caracteres menos que la forma tipeada,
 * que es justo lo que hacía desbordar la columna.
 */
export function formatDoc(raw: string | null | undefined): string {
  if (!raw) return '';
  const { serie, numero } = parseDoc(raw);
  return numero ? `${serie}-${numero}` : serie;
}
