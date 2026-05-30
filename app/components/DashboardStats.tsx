// components/DashboardStats.tsx
'use client';

interface StatsData {
  ingresosMes: number;
  gastosMes: number;
  cobradoMes: number;
  deudaTotal: number;
  subtitle?: string;
}

interface DashboardStatsProps {
  stats: StatsData | null;
}

const formatMoney = (value: number): string => {
  return `RD$${value.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function DashboardStats({ stats }: DashboardStatsProps) {
  if (!stats) {
    return (
      <div className="stats-row">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="stat-card" style={{ opacity: 0.6 }}>
            <div className="stat-ri">
              <span className="stat-label">Cargando...</span>
              <div className="stat-icon">⏳</div>
            </div>
            <div className="stat-value">---</div>
          </div>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      label: 'Ingresos del Mes',
      value: stats.ingresosMes,
      color: 'var(--hc-green)',
      bg: '#e8f5ee',
      icon: '↑',
    },
    {
      label: 'Gastos del Mes',
      value: stats.gastosMes,
      color: 'var(--hc-red)',
      bg: 'var(--hc-red-l)',
      icon: '↓',
    },
    {
      label: 'Cobrado Mensualidades',
      value: stats.cobradoMes,
      color: 'var(--hc-blue)',
      bg: 'var(--hc-blue-l)',
      icon: '💳',
    },
    {
      label: 'Deuda Total Padres',
      value: stats.deudaTotal,
      color: 'var(--hc-orange)',
      bg: 'var(--hc-orange-l)',
      icon: '⚠',
    },
  ];

  return (
    <div className="stats-row">
      {statItems.map((item, idx) => (
        <div key={idx} className="stat-card">
          <div className="stat-ri">
            <span className="stat-label">{item.label}</span>
            <div className="stat-icon" style={{ background: item.bg, color: item.color }}>
              {item.icon}
            </div>
          </div>
          <div className="stat-value" style={{ color: item.color }}>
            {formatMoney(item.value)}
          </div>
        </div>
      ))}
    </div>
  );
}