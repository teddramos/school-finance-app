// app/reportes/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

// Tipos
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

interface Cuenta {
  id: number;
  nombre: string;
  tipo: string;
}

interface ReporteData {
  config: {
    nombre: string;
    rif: string;
    direccion: string;
    telefono: string;
    email: string;
    director: string;
  };
  periodo: string;
  ingresos: Movimiento[];
  gastos: Movimiento[];
  totalIngresos: number;
  totalGastos: number;
  balance: number;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function ReportesPage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [reporte, setReporte] = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReporte = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reporte-mensual?year=${selectedYear}&month=${selectedMonth + 1}`);
      if (!res.ok) {
        if (res.status === 401) router.push('/login');
        throw new Error('Error al cargar el reporte');
      }
      const data = await res.json();
      setReporte(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReporte();
  }, [selectedYear, selectedMonth]);

  const formatMoney = (value: number) => {
    return `RD$${value.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const exportToExcel = () => {
    if (!reporte) return;

    const wb = XLSX.utils.book_new();
    const wsData: any[][] = [];

    // Encabezado del colegio
    wsData.push([reporte.config.nombre]);
    wsData.push([`RIF: ${reporte.config.rif}`]);
    wsData.push([reporte.config.direccion]);
    wsData.push([`Tel: ${reporte.config.telefono} · Email: ${reporte.config.email}`]);
    wsData.push([]);
    wsData.push([`CUADRE MENSUAL — ${MESES[selectedMonth].toUpperCase()} ${selectedYear}`]);
    wsData.push([`Director(a): ${reporte.config.director}`]);
    wsData.push([]);

    // Ingresos
    wsData.push(['INGRESOS']);
    wsData.push(['Cuenta', 'Descripción', 'Fecha', 'Monto']);
    reporte.ingresos.forEach(mov => {
      wsData.push([mov.cuentaNombre || '', mov.descripcion || '', mov.fecha, mov.monto]);
    });
    wsData.push([`SUBTOTAL INGRESOS`, '', '', reporte.totalIngresos]);
    wsData.push([]);

    // Gastos
    wsData.push(['GASTOS']);
    wsData.push(['Cuenta', 'Descripción', 'Fecha', 'Monto']);
    reporte.gastos.forEach(mov => {
      wsData.push([mov.cuentaNombre || '', mov.descripcion || '', mov.fecha, mov.monto]);
    });
    wsData.push([`SUBTOTAL GASTOS`, '', '', reporte.totalGastos]);
    wsData.push([]);

    // Balance
    wsData.push(['BALANCE NETO', '', '', reporte.balance]);
    wsData.push([]);
    wsData.push([`Generado: ${new Date().toLocaleDateString('es-DO')}`]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 30 }, { wch: 38 }, { wch: 14 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, `${MESES[selectedMonth]} ${selectedYear}`);
    XLSX.writeFile(wb, `Cuadre_${reporte.config.nombre.replace(/\s/g, '_')}_${MESES[selectedMonth]}_${selectedYear}.xlsx`);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(parseInt(e.target.value));
  };

  const handleMonthClick = (monthIndex: number) => {
    setSelectedMonth(monthIndex);
  };

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <h2>Reportes</h2>
          <p>Cuadre mensual</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" style={{ color: 'white', borderColor: 'rgba(255,255,255,.4)' }} onClick={() => window.print()}>
            🖨️ Imprimir
          </button>
          <button className="btn btn-gold" onClick={exportToExcel}>
            📊 Excel
          </button>
        </div>
      </div>
      <div className="page-wrap">
        {/* Filtros */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <select className="inp" value={selectedYear} onChange={handleYearChange} style={{ width: 'auto' }}>
            {[selectedYear - 1, selectedYear, selectedYear + 1].map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
          <div className="month-bar">
            {MESES.map((mes, idx) => (
              <button
                key={idx}
                className={`mchip ${idx === selectedMonth ? 'active' : ''}`}
                onClick={() => handleMonthClick(idx)}
              >
                {mes.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido del reporte */}
        {loading ? (
          <div className="card empty"><div className="spin"></div> Cargando reporte...</div>
        ) : error ? (
          <div className="card empty" style={{ color: 'var(--hc-red)' }}>⚠️ {error}</div>
        ) : reporte ? (
          <div className="card">
            {/* Encabezado institucional */}
            <div style={{ textAlign: 'center', paddingBottom: '18px', marginBottom: '18px', borderBottom: '3px solid var(--hc-green)' }}>
              <div style={{ fontSize: '26px', marginBottom: '5px' }}>🌿</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(16px, 3vw, 22px)', fontWeight: 700, color: 'var(--hc-green)', marginBottom: '2px' }}>
                {reporte.config.nombre}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--hc-gray)' }}>{reporte.config.rif} · {reporte.config.direccion}</div>
              <div style={{ fontSize: '10px', color: 'var(--hc-gray)' }}>{reporte.config.telefono} · {reporte.config.email}</div>
              <div style={{ marginTop: '10px', display: 'inline-block', background: 'var(--hc-green)', color: 'white', padding: '5px 16px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em' }}>
                CUADRE MENSUAL — {MESES[selectedMonth].toUpperCase()} {selectedYear}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--hc-gray)', marginTop: '5px' }}>Director(a): {reporte.config.director}</div>
            </div>

            {reporte.ingresos.length === 0 && reporte.gastos.length === 0 ? (
              <div className="empty"><div className="empty-icon">📄</div><p>Sin movimientos en este período</p></div>
            ) : (
              <>
                {/* Tabla de ingresos */}
                {reporte.ingresos.length > 0 && (
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
                          {reporte.ingresos.map(mov => (
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
                      <span className="amount-pos" style={{ fontSize: '13px' }}>+{formatMoney(reporte.totalIngresos)}</span>
                    </div>
                  </div>
                )}

                {/* Tabla de gastos */}
                {reporte.gastos.length > 0 && (
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
                          {reporte.gastos.map(mov => (
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
                      <span className="amount-neg" style={{ fontSize: '13px' }}>-{formatMoney(reporte.totalGastos)}</span>
                    </div>
                  </div>
                )}

                {/* Balance final */}
                <div style={{ background: reporte.balance >= 0 ? '#e8f5ee' : 'var(--hc-red-l)', borderRadius: '8px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '15px', fontWeight: 700, color: reporte.balance >= 0 ? 'var(--hc-green)' : 'var(--hc-red)' }}>
                    BALANCE NETO
                  </span>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '22px', fontWeight: 700, color: reporte.balance >= 0 ? 'var(--hc-green)' : 'var(--hc-red)' }}>
                    {reporte.balance >= 0 ? '+' : ''}{formatMoney(reporte.balance)}
                  </span>
                </div>
              </>
            )}

            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--hc-gray-l)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '5px', fontSize: '10px', color: 'var(--hc-gray)' }}>
              <span>Generado: {new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span>{reporte.config.nombre}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}