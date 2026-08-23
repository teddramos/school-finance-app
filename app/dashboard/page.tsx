// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import DashboardStats from '@/components/DashboardStats';
import DashboardChart from '@/components/DashboardChart';
import TopCuentas from '@/components/TopCuentas';
import SkeletonDashboard from '@/components/skeletons/SkeletonDashboard';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [topCuentas, setTopCuentas] = useState<any[]>([]);
  const [balance, setBalance] = useState({ label: '', value: 0, isPositive: true });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await fetch('/api/stats', { credentials: 'same-origin' });
        if (!res.ok) {
          if (res.status === 401) router.push('/login');
          throw new Error('Error al cargar datos');
        }
        const data = await res.json();
        setStats(data.stats);
        setChartData(data.chart || []);
        setTopCuentas(data.topCuentas || []);
        setBalance(data.balance || { label: 'Balance', value: 0, isPositive: true });
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('No se pudieron cargar los datos del dashboard');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  if (loading) {
    return <SkeletonDashboard />;
  }

  if (error) {
    return (
      <div className="page active">
        <div className="page-header">
          <div>
            <h2>Dashboard</h2>
            <p>Error</p>
          </div>
        </div>
        <div className="page-wrap">
          <div className="card" style={{ color: 'var(--hc-red)' }}>
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p id="dash-subtitle">{stats?.subtitle || 'Resumen financiero'}</p>
        </div>
      </div>
      <div className="page-wrap">
        {/* Stats cards */}
        <DashboardStats stats={stats} />

        {/* Two columns: chart + top cuentas */}
        <div className="two-col">
          <div className="card">
            <div className="card-title">Tendencia — Últimos 6 meses</div>
            <DashboardChart data={chartData} />
          </div>
          <div className="card">
            <div className="card-title">Top Cuentas del Mes</div>
            <TopCuentas cuentas={topCuentas} />
          </div>
        </div>

        {/* Balance banner */}
        <div
          className="card"
          style={{
            marginTop: '14px',
            background: 'linear-gradient(135deg, var(--hc-green), var(--hc-dark))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', marginBottom: '3px' }}>
              {balance.label}
            </div>
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 'clamp(18px, 3.5vw, 28px)',
                fontWeight: 700,
                color: balance.isPositive ? 'var(--hc-gold)' : '#ff8a80',
              }}
            >
              {balance.value >= 0 ? `+${formatMoney(balance.value)}` : formatMoney(balance.value)}
            </div>
          </div>
          <button className="btn btn-gold" onClick={() => router.push('/reportes')}>
            Ver Reporte →
          </button>
        </div>
      </div>
    </div>
  );
}

function formatMoney(value: number): string {
  return `RD$${value.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}