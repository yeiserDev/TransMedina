export const esRuc = (value: unknown): value is string => typeof value === 'string' && /^\d{11}$/.test(value);

export class ConsultaRucError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function consultarRuc(ruc: string, token: string | undefined, request: typeof fetch = fetch) {
  if (!esRuc(ruc)) throw new ConsultaRucError('El RUC debe tener 11 dígitos.', 400);
  if (!token?.trim()) throw new ConsultaRucError('La consulta de RUC aún no está activada. Puedes escribir la razón social manualmente.', 503);
  let response: Response;
  try {
    response = await request(`https://api.decolecta.com/v1/sunat/ruc?numero=${ruc}`, {
      headers: { Authorization: `Bearer ${token.trim()}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000), cache: 'no-store', redirect: 'error',
    });
  } catch { throw new ConsultaRucError('La consulta no respondió. Inténtalo de nuevo o escribe la razón social.', 502); }
  if (response.status === 404 || response.status === 422) throw new ConsultaRucError('No se encontró ese RUC. Revisa el número o escribe la razón social.', 404);
  if (response.status === 429) throw new ConsultaRucError('Se alcanzó el límite de consultas. Puedes escribir la razón social manualmente.', 429);
  if (response.status === 401 || response.status === 403) throw new ConsultaRucError('El servicio de RUC no autorizó la consulta. Revisa el token y el plan del proveedor.', 503);
  if (!response.ok) throw new ConsultaRucError('El servicio de RUC no está disponible. Inténtalo más tarde.', 502);
  let data;
  try { data = await response.json(); } catch { throw new ConsultaRucError('El servicio devolvió una respuesta inválida.', 502); }
  if (data?.numero_documento !== ruc || typeof data?.razon_social !== 'string' || !data.razon_social.trim() || data.razon_social.trim().length > 160) throw new ConsultaRucError('No se pudo verificar la razón social de ese RUC. Escríbela manualmente.', 502);
  return { ruc, razon_social: data.razon_social.trim() as string };
}
