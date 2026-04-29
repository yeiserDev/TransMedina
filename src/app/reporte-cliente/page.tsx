import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { Viaje } from '@/types';
import EstadoCuentaBlocks from '@/components/EstadoCuentaBlocks';

interface ReporteClienteData {
  cliente_nombre: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  viajes: Viaje[];
}

async function getReporteData(token: string): Promise<ReporteClienteData | null> {
  const supabase = await createAdminClient();

  const { data: tokenData, error } = await supabase
    .from('reporte_tokens')
    .select('*')
    .eq('token', token)
    .eq('activo', true)
    .single();

  if (error || !tokenData) return null;
  if (tokenData.expira_en && new Date(tokenData.expira_en) < new Date()) return null;

  let query = supabase.from('viajes').select('*').order('fecha_traslado', { ascending: true });
  if (tokenData.fecha_inicio) query = query.gte('fecha_traslado', tokenData.fecha_inicio);
  if (tokenData.fecha_fin) query = query.lte('fecha_traslado', tokenData.fecha_fin);

  const { data: viajes } = await query;

  return {
    cliente_nombre: tokenData.cliente_nombre,
    fecha_inicio: tokenData.fecha_inicio,
    fecha_fin: tokenData.fecha_fin,
    viajes: viajes ?? [],
  };
}

function fmtMoney(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
}

function fmtDateEs(d: string | null) {
  if (!d) return null;
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('es-PE', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return d; }
}

export default async function ReporteClientePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) notFound();

  const data = await getReporteData(token);
  if (!data) notFound();

  const { cliente_nombre, fecha_inicio, fecha_fin, viajes } = data;

  // Compute KPIs
  const viajeRows = viajes.filter(v => v.tipo === 'viaje');
  const depositoRows = viajes.filter(v => v.tipo === 'deposito');
  const totalViajes = viajeRows.length;
  const montoTotal = viajeRows.reduce((s, v) => s + Number(v.monto), 0);
  const detPendientes = viajeRows.filter(v => v.detraccion === 'pendiente').length;
  const totalDepositos = depositoRows.reduce((s, v) => s + Number(v.monto), 0);

  let saldoActual = 0;
  for (const v of viajes) {
    if (v.tipo === 'deposito') saldoActual -= Number(v.monto);
    else saldoActual += Number(v.monto);
  }

  const periodo =
    fecha_inicio && fecha_fin
      ? `${fmtDateEs(fecha_inicio)} — ${fmtDateEs(fecha_fin)}`
      : fecha_inicio
        ? `Desde ${fmtDateEs(fecha_inicio)}`
        : fecha_fin
          ? `Hasta ${fmtDateEs(fecha_fin)}`
          : 'Historial completo';

  return (
    <div style={{ background: 'var(--canvas)', minHeight: '100vh' }}>
      {/* Header limpio */}
      <header style={{ background: 'var(--ink)', color: 'var(--canvas)' }}>
        <div className="max-w-4xl mx-auto px-6 py-8">
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.5, marginBottom: 8 }}>
            TransMedina · Estado de Cuenta
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 6 }}>
            {cliente_nombre}
          </h1>
          <p style={{ fontSize: 13, opacity: 0.55, fontWeight: 450 }}>{periodo}</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total viajes', value: String(totalViajes), sub: 'registros' },
            { label: 'Monto fletes', value: fmtMoney(montoTotal), sub: 'acumulado' },
            {
              label: 'Depósitos recibidos', value: fmtMoney(totalDepositos), sub: 'pagados',
              ok: true,
            },
            {
              label: 'Saldo pendiente',
              value: saldoActual <= 0 ? '✓ Al día' : fmtMoney(saldoActual),
              sub: saldoActual <= 0 ? 'sin deuda' : 'por pagar',
              highlight: saldoActual > 0,
              ok: saldoActual <= 0,
            },
          ].map(({ label, value, sub, highlight, ok }) => (
            <div key={label} className="rounded-3xl p-5 flex flex-col gap-1.5"
              style={{ background: 'var(--white)', boxShadow: 'var(--shadow-card)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--slate)' }}>
                {label}
              </p>
              <p style={{
                fontWeight: 600, fontSize: 18, letterSpacing: '-0.02em',
                color: ok ? '#16A34A' : highlight ? '#92400E' : 'var(--ink)',
              }}>
                {value}
              </p>
              {sub && <p style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 450 }}>{sub}</p>}
            </div>
          ))}
        </div>

        {/* Detracciones pendientes aviso */}
        {detPendientes > 0 && (
          <div className="rounded-2xl px-5 py-3 flex items-center gap-3"
            style={{ background: '#FFF8F5', border: '1px solid rgba(207,69,0,.15)' }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <p style={{ fontSize: 13, color: 'var(--signal)', fontWeight: 500 }}>
              {detPendientes} detracción{detPendientes !== 1 ? 'es' : ''} pendiente{detPendientes !== 1 ? 's' : ''} de realización
            </p>
          </div>
        )}

        {/* Bloques mensuales */}
        {viajes.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--slate)' }}>
            <p style={{ fontSize: 32 }}>📋</p>
            <p style={{ marginTop: 12, fontWeight: 450 }}>Sin registros para el período seleccionado</p>
          </div>
        ) : (
          <EstadoCuentaBlocks viajes={viajes} readOnly />
        )}

        {/* Footer */}
        <div className="pt-4 pb-8 text-center">
          <p style={{ fontSize: 11, color: 'var(--dust)', fontWeight: 450 }}>
            Documento generado por TransMedina · Solo lectura
          </p>
        </div>
      </main>
    </div>
  );
}
