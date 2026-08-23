'use client';

import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import Skeleton from './skeletons/Skeleton';

interface Movimiento {
  id: number;
  tipo: 'ingreso' | 'gasto';
  cuentaId: number;
  cuentaNombre?: string;
  monto: number;
  fecha: string;
  descripcion?: string;
  periodo: string;
}

interface Config {
  nombre: string;
  rif: string;
  direccion: string;
  telefono: string;
  email: string;
  director: string;
  tarifa: number;
}

interface ReporteMensualProps {
  year: number;
  month: number;
  refreshTrigger?: number;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const formatMoney = (value: number): string => {
  return `RD$${value.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatNumber = (value: number): string => {
  return value.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function ReporteMensual({ year, month, refreshTrigger = 0 }: ReporteMensualProps) {
  const [config, setConfig] = useState<Config | null>(null);
  const [ingresos, setIngresos] = useState<Movimiento[]>([]);
  const [gastos, setGastos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReporte = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reporte-mensual?year=${year}&month=${month + 1}`);
      if (!res.ok) throw new Error('Error al cargar el reporte');
      const data = await res.json();
      setConfig(data.config);
      setIngresos(data.ingresos);
      setGastos(data.gastos);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReporte();
  }, [year, month, refreshTrigger]);

  const totalIngresos = ingresos.reduce((sum, m) => sum + m.monto, 0);
  const totalGastos = gastos.reduce((sum, m) => sum + m.monto, 0);
  const balance = totalIngresos - totalGastos;

  const exportToExcel = () => {
    if (!config) return;
    const wb = XLSX.utils.book_new();
    const wsData: any[][] = [
      [config.nombre],
      [`RIF: ${config.rif}`],
      [config.direccion],
      [`Tel: ${config.telefono} · Email: ${config.email}`],
      [],
      [`CUADRE MENSUAL — ${MESES[month].toUpperCase()} ${year}`],
      [`Director(a): ${config.director}`],
      [],
      ['INGRESOS'],
      ['Cuenta', 'Descripción', 'Fecha', 'Monto'],
    ];
    ingresos.forEach(m => {
      wsData.push([m.cuentaNombre || '', m.descripcion || '', m.fecha, formatNumber(m.monto)]);
    });
    wsData.push([`SUBTOTAL INGRESOS`, '', '', formatNumber(totalIngresos)]);
    wsData.push([]);
    wsData.push(['GASTOS']);
    wsData.push(['Cuenta', 'Descripción', 'Fecha', 'Monto']);
    gastos.forEach(m => {
      wsData.push([m.cuentaNombre || '', m.descripcion || '', m.fecha, formatNumber(m.monto)]);
    });
    wsData.push([`SUBTOTAL GASTOS`, '', '', formatNumber(totalGastos)]);
    wsData.push([]);
    wsData.push(['BALANCE NETO', '', '', formatNumber(balance)]);
    wsData.push([]);
    wsData.push([`Generado: ${new Date().toLocaleDateString('es-DO')}`]);
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 30 }, { wch: 38 }, { wch: 14 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, `${MESES[month]} ${year}`);
    XLSX.writeFile(wb, `Cuadre_${config.nombre.replace(/\s/g, '_')}_${MESES[month]}_${year}.xlsx`);
  };

  if (loading) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', paddingBottom: '18px', marginBottom: '18px', borderBottom: '3px solid var(--hc-gray-l)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <Skeleton width={32} height={32} borderRadius="50%" />
          <Skeleton variant="title" width={220} height={22} />
          <Skeleton width={180} height={12} />
        </div>
        <div style={{ marginBottom: '18px' }}>
          <Skeleton width={110} height={16} style={{ marginBottom: 8 }} />
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th><Skeleton width={100} height={12} /></th>
                  <th><Skeleton width={150} height={12} /></th>
                  <th><Skeleton width={70} height={12} /></th>
                  <th style={{ textAlign: 'right' }}><Skeleton width={70} height={12} /></th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3].map((row) => (
                  <tr key={row}>
                    <td><Skeleton width={110} height={14} /></td>
                    <td><Skeleton width={160} height={12} /></td>
                    <td><Skeleton width={65} height={12} /></td>
                    <td style={{ textAlign: 'right' }}><Skeleton width={80} height={14} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ background: '#e8f5ee', borderRadius: '8px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton width={130} height={18} />
          <Skeleton width={110} height={24} />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="card empty" style={{ color: 'var(--hc-red)' }}>⚠️ {error}</div>;
  }

  return (
    <div className="card">
      <div style={{ textAlign: 'center', paddingBottom: '18px', marginBottom: '18px', borderBottom: '3px solid var(--hc-green)' }}>
        <div style={{ fontSize: '26px', marginBottom: '5px' }}>🌿</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(16px, 3vw, 22px)', fontWeight: 700, color: 'var(--hc-green)', marginBottom: '2px' }}>
          {config?.nombre}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--hc-gray)' }}>{config?.rif} · {config?.direccion}</div>
        <div style={{ fontSize: '10px', color: 'var(--hc-gray)' }}>{config?.telefono} · {config?.email}</div>
        <div style={{ marginTop: '10px', display: 'inline-block', background: 'var(--hc-green)', color: 'white', padding: '5px 16px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em' }}>
          CUADRE MENSUAL — {MESES[month].toUpperCase()} {year}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--hc-gray)', marginTop: '5px' }}>Director(a): {config?.director}</div>
      </div>

      {ingresos.length === 0 && gastos.length === 0 ? (
        <div className="empty"><div className="empty-icon">📄</div><p>Sin movimientos en este período</p></div>
      ) : (
        <>
          {ingresos.length > 0 && (
            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--hc-green)', marginBottom: '7px', paddingBottom: '5px', borderBottom: '2px solid #e8f5ee', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ background: 'var(--hc-green)', color: 'white', padding: '1px 7px', borderRadius: '3px', fontSize: '10px' }}>↑</span> INGRESOS
              </div>
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr><th>Cuenta</th><th>Descripción</th><th>Fecha</th><th style={{ textAlign: 'right' }}>Monto</th></tr>
                  </thead>
                  <tbody>
                    {ingresos.map(mov => (
                      <tr key={mov.id}>
                        <td>{mov.cuentaNombre || '—'}</td>
                        <td style={{ color: 'var(--hc-gray)' }}>{mov.descripcion || '—'}</td>
                        <td style={{ color: 'var(--hc-gray)', fontSize: '11px' }}>{mov.fecha}</td>
                        <td className="amount-pos" style={{ textAlign: 'right' }}>{formatMoney(mov.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 11px', background: '#e8f5ee', borderRadius: '0 0 7px 7px', marginTop: '1px' }}>
                <span style={{ fontWeight: 700, fontSize: '11px', color: 'var(--hc-green)' }}>TOTAL INGRESOS</span>
                <span className="amount-pos" style={{ fontSize: '13px' }}>+{formatMoney(totalIngresos)}</span>
              </div>
            </div>
          )}

          {gastos.length > 0 && (
            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--hc-red)', marginBottom: '7px', paddingBottom: '5px', borderBottom: '2px solid var(--hc-red-l)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ background: 'var(--hc-red)', color: 'white', padding: '1px 7px', borderRadius: '3px', fontSize: '10px' }}>↓</span> GASTOS
              </div>
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr><th>Cuenta</th><th>Descripción</th><th>Fecha</th><th style={{ textAlign: 'right' }}>Monto</th></tr>
                  </thead>
                  <tbody>
                    {gastos.map(mov => (
                      <tr key={mov.id}>
                        <td>{mov.cuentaNombre || '—'}</td>
                        <td style={{ color: 'var(--hc-gray)' }}>{mov.descripcion || '—'}</td>
                        <td style={{ color: 'var(--hc-gray)', fontSize: '11px' }}>{mov.fecha}</td>
                        <td className="amount-neg" style={{ textAlign: 'right' }}>-{formatMoney(mov.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 11px', background: 'var(--hc-red-l)', borderRadius: '0 0 7px 7px', marginTop: '1px' }}>
                <span style={{ fontWeight: 700, fontSize: '11px', color: 'var(--hc-red)' }}>TOTAL GASTOS</span>
                <span className="amount-neg" style={{ fontSize: '13px' }}>-{formatMoney(totalGastos)}</span>
              </div>
            </div>
          )}

          <div style={{ background: balance >= 0 ? '#e8f5ee' : 'var(--hc-red-l)', borderRadius: '8px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '15px', fontWeight: 700, color: balance >= 0 ? 'var(--hc-green)' : 'var(--hc-red)' }}>
              BALANCE NETO
            </span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: 700, color: balance >= 0 ? 'var(--hc-green)' : 'var(--hc-red)' }}>
              {balance >= 0 ? '+' : ''}{formatMoney(balance)}
            </span>
          </div>
        </>
      )}

      <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--hc-gray-l)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '5px', fontSize: '10px', color: 'var(--hc-gray)' }}>
        <span>Generado: {new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        <span>{config?.nombre}</span>
      </div>
    </div>
  );
}