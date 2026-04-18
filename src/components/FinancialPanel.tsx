'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle2, ArrowDownCircle } from 'lucide-react';

interface Finanzas {
  total_fletes: number;
  depositos_recibidos: number;
  saldo_anterior: number;
  balance_por_cobrar: number;
  detraccion_pendiente_importe: number;
  viajes_hyo_sin_det: number;
  viajes_puc_sin_det: number;
  viajes_sin_detraccion: number;
  detraccion_pagada_importe: number;
}

function fmt(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
}

function StatCard({
  icon, eyebrow, value, sub, accent,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  value: string;
  sub?: string;
  accent?: 'signal' | 'green';
}) {
  const valueColor = accent === 'signal' ? 'var(--signal)' : accent === 'green' ? '#16A34A' : 'var(--ink)';
  const bg = accent === 'signal' ? '#FFF8F5' : 'var(--white)';
  const border = accent === 'signal' ? '1px solid rgba(207,69,0,.18)' : 'none';

  return (
    <div className="rounded-3xl p-4" style={{ background: bg, boxShadow: 'var(--shadow-card)', border }}>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <p className="eyebrow" style={{ fontSize: 9 }}>{eyebrow}</p>
      </div>
      <p style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.025em', color: valueColor, lineHeight: 1 }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-1.5" style={{ color: accent === 'signal' ? '#7A2800' : 'var(--slate)', fontWeight: 450 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export default function FinancialPanel() {
  const [data, setData] = useState<Finanzas | null>(null);

  useEffect(() => {
    fetch('/api/finanzas').then(r => r.json()).then(setData).catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="space-y-3">
        <div className="skeleton rounded-3xl" style={{ height: 20, width: '60%', marginBottom: 16 }} />
        {[90, 90, 100, 90].map((h, i) => (
          <div key={i} className="skeleton rounded-3xl" style={{ height: h }} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="eyebrow px-1 mb-4">Finanzas</p>

      <StatCard
        icon={<TrendingUp size={12} style={{ color: 'var(--signal-light)', flexShrink: 0 }} />}
        eyebrow="Por cobrar"
        value={fmt(data.balance_por_cobrar)}
        sub="Fletes − depósitos"
      />

      <StatCard
        icon={<ArrowDownCircle size={12} style={{ color: '#16A34A', flexShrink: 0 }} />}
        eyebrow="Recibido"
        value={fmt(data.depositos_recibidos)}
        sub="Depósitos registrados"
        accent="green"
      />

      {data.detraccion_pendiente_importe > 0 ? (
        <StatCard
          icon={<AlertTriangle size={12} style={{ color: 'var(--signal)', flexShrink: 0 }} />}
          eyebrow="Detracción debes"
          value={fmt(data.detraccion_pendiente_importe)}
          sub={[
            data.viajes_hyo_sin_det > 0 && `${data.viajes_hyo_sin_det} × S/40`,
            data.viajes_puc_sin_det > 0 && `${data.viajes_puc_sin_det} × S/80`,
          ].filter(Boolean).join(' + ')}
          accent="signal"
        />
      ) : (
        <StatCard
          icon={<CheckCircle2 size={12} style={{ color: '#16A34A', flexShrink: 0 }} />}
          eyebrow="Detracción"
          value="Al día ✓"
          sub="Sin pendientes a SUNAT"
        />
      )}

      {data.detraccion_pagada_importe > 0 && (
        <StatCard
          icon={<CheckCircle2 size={12} style={{ color: 'var(--slate)', flexShrink: 0 }} />}
          eyebrow="Detracción pagada"
          value={fmt(data.detraccion_pagada_importe)}
          sub="Ya depositado a SUNAT"
        />
      )}
    </div>
  );
}
