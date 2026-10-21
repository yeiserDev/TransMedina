/** Draft de edición: conserva el punto y los ceros decimales mientras se escribe. */
export function limpiarMonto(texto: string): string {
  const limpio = texto.replace(/[^\d.]/g, '');
  const [entero, ...decimales] = limpio.split('.');
  const base = entero.replace(/^0+(?=\d)/, '').slice(0, 12);
  return decimales.length ? `${base || '0'}.${decimales.join('').slice(0, 2)}` : base;
}

export function mostrarMonto(draft: string): string {
  const [entero, decimal] = draft.split('.');
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (decimal === undefined ? '' : `.${decimal}`);
}

export function pegarMonto(texto: string): string {
  let limpio = texto.replace(/[^\d.,]/g, '');
  // También admite importes copiados con coma decimal: 1.234,50 o 1234,50.
  if (limpio.lastIndexOf(',') > limpio.lastIndexOf('.') && /,\d{1,2}$/.test(limpio)) {
    limpio = limpio.replace(/\./g, '').replace(/,(\d{1,2})$/, '.$1');
  }
  return limpiarMonto(limpio.replace(/,/g, ''));
}
