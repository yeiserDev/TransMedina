import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { Viaje } from '@/types';
import ViajesTable from '@/components/ViajesTable';
import EstadoCuentaBlocks from '@/components/EstadoCuentaBlocks';

async function getSecretariaData(token: string): Promise<Viaje[] | null> {
  const supabase = await createAdminClient();

  const { data: tokenData, error } = await supabase
    .from('reporte_tokens')
    .select('*')
    .eq('token', token)
    .eq('activo', true)
    .single();

  if (error || !tokenData) return null;
  if (tokenData.expira_en && new Date(tokenData.expira_en) < new Date()) return null;

  const { data: viajes } = await supabase
    .from('viajes')
    .select('*')
    .order('fecha_traslado', { ascending: false });

  return viajes ?? [];
}

function fmtMoney(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
}

export default async function SecretariaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) notFound();

  const viajes = await getSecretariaData(token);
  if (!viajes) notFound();

  const viajeRows = viajes.filter(v => v.tipo === 'viaje');
  const totalViajes = viajeRows.length;
  const montoTotal = viajeRows.reduce((s, v) => s + Number(v.monto), 0);
  const detPendientes = viajeRows.filter(v => v.detraccion === 'pendiente').length;
  const totalDepositos = viajes.filter(v => v.tipo === 'deposito').reduce((s, v) => s + Number(v.monto), 0);
  let saldo = 0;
  for (const v of [...viajes].reverse()) {
    if (v.tipo === 'deposito') saldo -= Number(v.monto);
    else saldo += Number(v.monto);
  }

  return (
    <div style={{ background: 'var(--canvas)', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{ background: 'var(--ink)', color: 'var(--canvas)' }}>
        <div className="max-w-screen-2xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.45, marginBottom: 4 }}>
              TransMedina · Vista secretaria
            </p>
            <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1 }}>
              Historial de viajes
            </h1>
          </div>
          <span className="badge-pill" style={{ background: 'rgba(255,255,255,.12)', color: 'rgba(255,255,255,.7)', fontSize: 10, letterSpacing: '0.04em' }}>
            Solo lectura
          </span>
        </div>
      </header>

      {/* KPIs */}
      <div className="max-w-screen-2xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total viajes', value: String(totalViajes), sub: 'registros' },
            { label: 'Monto fletes', value: fmtMoney(montoTotal), sub: 'acumulado' },
            { label: 'Depósitos recibidos', value: fmtMoney(totalDepositos), sub: 'pagados', ok: true },
            {
              label: 'Saldo pendiente',
              value: saldo <= 0 ? '✓ Al día' : fmtMoney(saldo),
              sub: saldo <= 0 ? 'sin deuda' : 'por pagar',
              ok: saldo <= 0,
              warn: saldo > 0,
            },
          ].map(({ label, value, sub, ok, warn }) => (
            <div key={label} className="rounded-3xl p-4 flex flex-col gap-1"
              style={{ background: 'var(--white)', boxShadow: 'var(--shadow-card)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--slate)' }}>
                {label}
              </p>
              <p style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em', color: ok ? '#16A34A' : warn ? '#92400E' : 'var(--ink)' }}>
                {value}
              </p>
              <p style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 450 }}>{sub}</p>
            </div>
          ))}
        </div>

        {detPendientes > 0 && (
          <div className="rounded-2xl px-5 py-3 flex items-center gap-3 mb-6"
            style={{ background: '#FFF8F5', border: '1px solid rgba(207,69,0,.15)' }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <p style={{ fontSize: 13, color: 'var(--signal)', fontWeight: 500 }}>
              {detPendientes} detracción{detPendientes !== 1 ? 'es' : ''} pendiente{detPendientes !== 1 ? 's' : ''} de realización
            </p>
          </div>
        )}

        {/* Viajes table read-only */}
        <ViajesTable readOnly initialViajes={viajes} secretToken={token} />

        {/* Estado de cuenta */}
        {viajes.length > 0 && (
          <div className="mt-10">
            <p className="eyebrow mb-4">Estado de cuenta</p>
            <EstadoCuentaBlocks viajes={viajes} readOnly />
          </div>
        )}

        <div className="pt-6 pb-10 text-center">
          <p style={{ fontSize: 11, color: 'var(--dust)', fontWeight: 450 }}>
            TransMedina · Solo lectura
          </p>
        </div>
      </div>
    </div>
  );
}
