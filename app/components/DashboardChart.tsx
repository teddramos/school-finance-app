// components/DashboardChart.tsx
'use client';

interface ChartDataPoint {
  label: string;
  ingresos: number;
  gastos: number;
}

interface DashboardChartProps {
  data: ChartDataPoint[];
}

const formatMoney = (value: number): string => {
  return `RD$${value.toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export default function DashboardChart({ data }: DashboardChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon">📊</div>
        <p>Sin datos suficientes</p>
      </div>
    );
  }

  // Encontrar el valor máximo para escalar las barras (máximo entre ingresos y gastos)
  const maxValue = Math.max(...data.flatMap(d => [d.ingresos, d.gastos]), 1);

  return (
    <div className="chart-wrap">
      {data.map((point, idx) => {
        const ingresosHeight = (point.ingresos / maxValue) * 100;
        const gastosHeight = (point.gastos / maxValue) * 100;
        return (
          <div key={idx} className="bar-group">
            <div className="bar-cols">
              <div
                className="bar"
                style={{
                  background: '#e8f5ee',
                  border: '1px solid var(--hc-green)',
                  height: `${ingresosHeight}%`,
                }}
                title={`Ingresos: ${formatMoney(point.ingresos)}`}
              ></div>
              <div
                className="bar"
                style={{
                  background: 'var(--hc-red-l)',
                  border: '1px solid var(--hc-red)',
                  height: `${gastosHeight}%`,
                }}
                title={`Gastos: ${formatMoney(point.gastos)}`}
              ></div>
            </div>
            <span className="bar-lbl">{point.label}</span>
          </div>
        );
      })}
    </div>
  );
}