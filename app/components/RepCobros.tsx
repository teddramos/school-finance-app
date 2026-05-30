// components/RepCobros.tsx
'use client';

import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

interface Hijo {
  nombre: string;
  grado: string;
}

interface Padre {
  id: number;
  nombre: string;
  cedula: string;
  telefono: string;
  email: string;
  hijos: Hijo[];
  descuentos: any[];
}

interface Factura {
  id: number;
  padreId: number;
  periodo: string;
  monto: number;
  pagado: number;
}

interface Pago {
  id: number;
  padreId: number;
  monto: number;
  fecha: string;
  forma: string;
  numRecibo: string;
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

interface RepCobrosProps {
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

export default function RepCobros({ refreshTrigger = 0 }: RepCobrosProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [padres, setPadres] = useState<Padre[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [padresRes, facturasRes, pagosRes, configRes] = await Promise.all([
        fetch('/api/padres', { credentials: 'same-origin', headers: authHeaders }),
        fetch('/api/facturas', { credentials: 'same-origin', headers: authHeaders }),
        fetch('/api/pagos', { credentials: 'same-origin', headers: authHeaders }),
        fetch('/api/config', { credentials: 'same-origin', headers: authHeaders }),
      ]);
      if (!padresRes.ok || !facturasRes.ok || !pagosRes.ok || !configRes.ok) throw new Error();
      const padresData = await padresRes.json();
      const facturasData = await facturasRes.json();
      const pagosData = await pagosRes.json();
      const configData = await configRes.json();
      setPadres(padresData);
      setFacturas(facturasData);
      setPagos(pagosData);
      setConfig(configData);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const periodo = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  // Para cada padre, calcular factura neta (base - descuento perfil), pagado en el periodo, deuda total, etc.
  const getDescuentoPerfil = (padre: Padre): number => {
    const tarifa = config?.tarifa || 1500;
    const base = padre.hijos.length * tarifa;
    let desc = 0;
    (padre.descuentos || []).forEach((d: any) => {
      if (!d.activo) return;
      if (d.tipo === 'porcentaje') desc += base * (d.valor / 100);
      else desc += d.valor;
    });
    return Math.min(desc, base);
  };

  const getFacturaPeriodo = (padreId: number): Factura | undefined => {
    return facturas.find(f => f.padreId === padreId && f.periodo === periodo);
  };

  const getPagadoPeriodo = (padreId: number): number => {
    return pagos
      .filter(p => p.padreId === padreId && p.fecha.startsWith(periodo))
      .reduce((sum, p) => sum + p.monto, 0);
  };

  const getUltimoPago = (padreId: number): Pago | null => {
    const pagosPadre = pagos.filter(p => p.padreId === padreId);
    if (pagosPadre.length === 0) return null;
    return pagosPadre.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];
  };

  const getDeudaTotal = (padreId: number): number => {
    const facturasPadre = facturas.filter(f => f.padreId === padreId);
    return facturasPadre.reduce((sum, f) => sum + (f.monto - f.pagado), 0);
  };

  // Datos para la tabla
  const rows = padres.map(padre => {
    const hijosCount = padre.hijos.length;
    const tarifa = config?.tarifa || 1500;
    const base = hijosCount * tarifa;
    const descPerfil = getDescuentoPerfil(padre);
    const facturaNeta = base - descPerfil;
    const facturaObj = getFacturaPeriodo(padre.id);
    const pagadoPeriodo = getPagadoPeriodo(padre.id);
    const cobradoPeriodo = facturaObj ? facturaObj.pagado : 0;
    const pendientePeriodo = facturaObj ? facturaObj.monto - facturaObj.pagado : 0;
    const deudaTotal = getDeudaTotal(padre.id);
    const ultimoPago = getUltimoPago(padre.id);
    const estadoLabel = deudaTotal === 0 ? 'Al día' : (deudaTotal < facturaNeta ? 'Parcial' : 'Pendiente');
    const estadoCls = deudaTotal === 0 ? 'ok' : (deudaTotal < facturaNeta ? 'parcial' : '');
    return {
      padre,
      hijosCount,
      descPerfil,
      facturaNeta,
      facturaObj,
      pagadoPeriodo,
      cobradoPeriodo,
      pendientePeriodo,
      deudaTotal,
      ultimoPago,
      estadoLabel,
      estadoCls,
    };
  });

  const totalFacturado = rows.reduce((sum, r) => sum + r.facturaNeta, 0);
  const totalCobrado = rows.reduce((sum, r) => sum + r.cobradoPeriodo, 0);
  const totalPendiente = totalFacturado - totalCobrado;
  const padresAlDia = rows.filter(r => r.deudaTotal === 0).length;

  const exportToExcel = () => {
    if (!config) return;
    const wsData: any[][] = [
      [config.nombre],
      [`RIF: ${config.rif}`],
      [config.direccion],
      [config.telefono, config.email],
      [],
      [`REPORTE DE COBROS — ${MESES[selectedMonth].toUpperCase()} ${selectedYear}`],
      [],
      ['PADRE/TUTOR', 'CÉDULA', 'HIJOS', 'DESCUENTO PERFIL', 'FACTURA NETA', 'PAGADO PERIODO', 'DEUDA TOTAL', 'ESTADO'],
    ];
    rows.forEach(r => {
      wsData.push([
        r.padre.nombre,
        r.padre.cedula,
        r.hijosCount,
        formatNumber(r.descPerfil),
        formatNumber(r.facturaNeta),
        formatNumber(r.cobradoPeriodo),
        formatNumber(r.deudaTotal),
        r.estadoLabel,
      ]);
    });
    wsData.push([], [`TOTAL FACTURADO: ${formatNumber(totalFacturado)}`]);
    wsData.push([`TOTAL COBRADO: ${formatNumber(totalCobrado)}`]);
    wsData.push([`TOTAL PENDIENTE: ${formatNumber(totalPendiente)}`]);
    wsData.push([`PADRES AL DÍA: ${padresAlDia}/${rows.length}`]);
    wsData.push([], [`Generado: ${new Date().toLocaleDateString('es-DO')}`]);
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 30 }, { wch: 16 }, { wch: 7 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Cobros_${MESES[selectedMonth]}_${selectedYear}`);
    XLSX.writeFile(wb, `Cobros_${config.nombre.replace(/\s/g, '_')}_${MESES[selectedMonth]}_${selectedYear}.xlsx`);
  };

  if (loading) {
    return <div className="empty"><div className="spin"></div> Cargando reporte...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <select className="inp" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} style={{ width: 'auto' }}>
          {[selectedYear - 1, selectedYear, selectedYear + 1].map(yr => (
            <option key={yr} value={yr}>{yr}</option>
          ))}
        </select>
        <select className="inp" value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} style={{ width: 'auto' }}>
          {MESES.map((m, idx) => (
            <option key={idx} value={idx}>{m}</option>
          ))}
        </select>
        <button className="btn btn-gold" onClick={exportToExcel}>📊 Excel</button>
        <button className="btn btn-outline" onClick={() => window.print()}>🖨️ Imprimir</button>
      </div>

      <div className="card">
        <div style={{ textAlign: 'center', paddingBottom: '18px', marginBottom: '18px', borderBottom: '3px solid var(--hc-green)' }}>
          <div style={{ fontSize: '26px', marginBottom: '5px' }}>🌿</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(16px, 3vw, 22px)', fontWeight: 700, color: 'var(--hc-green)' }}>
            {config?.nombre || 'Colegio Las Palmas'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--hc-gray)' }}>{config?.rif} · {config?.direccion}</div>
          <div style={{ marginTop: '10px', display: 'inline-block', background: 'var(--hc-green)', color: 'white', padding: '5px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em' }}>
            REPORTE DE COBROS — {MESES[selectedMonth].toUpperCase()} {selectedYear}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '18px' }}>
          <div style={{ background: 'var(--hc-cream)', borderRadius: '7px', padding: '10px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--hc-gray)', textTransform: 'uppercase', marginBottom: '3px' }}>Total Facturado</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: 700 }}>{formatMoney(totalFacturado)}</div>
          </div>
          <div style={{ background: 'var(--hc-cream)', borderRadius: '7px', padding: '10px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--hc-gray)', textTransform: 'uppercase', marginBottom: '3px' }}>Total Cobrado</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: 700, color: 'var(--hc-green)' }}>{formatMoney(totalCobrado)}</div>
          </div>
          <div style={{ background: 'var(--hc-cream)', borderRadius: '7px', padding: '10px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--hc-gray)', textTransform: 'uppercase', marginBottom: '3px' }}>Total Pendiente</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: 700, color: 'var(--hc-red)' }}>{formatMoney(totalPendiente)}</div>
          </div>
          <div style={{ background: 'var(--hc-cream)', borderRadius: '7px', padding: '10px 12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--hc-gray)', textTransform: 'uppercase', marginBottom: '3px' }}>Padres Al Día</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '16px', fontWeight: 700, color: 'var(--hc-blue)' }}>{padresAlDia}/{rows.length}</div>
          </div>
        </div>

        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Padre / Tutor</th>
                <th>Hijos</th>
                <th>Descuento</th>
                <th>Factura Neta</th>
                <th>Últ. Pago</th>
                <th>Deuda</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.padre.id}>
                  <td style={{ fontWeight: 600 }}>
                    {r.padre.nombre}<br />
                    <span style={{ fontSize: '10px', color: 'var(--hc-gray)' }}>{r.padre.cedula}</span>
                  </td>
                  <td>{r.hijosCount}</td>
                  <td style={{ color: 'var(--hc-green)', fontSize: '12px' }}>
                    {r.descPerfil > 0 ? `-${formatMoney(r.descPerfil)}` : '—'}
                  </td>
                  <td className="amount-pos">{formatMoney(r.facturaNeta)}</td>
                  <td style={{ fontSize: '12px' }}>
                    {r.ultimoPago ? (
                      <>
                        {formatMoney(r.ultimoPago.monto)}<br />
                        <span style={{ color: 'var(--hc-gray)' }}>{r.ultimoPago.fecha}</span>
                      </>
                    ) : '—'}
                  </td>
                  <td className={r.deudaTotal > 0 ? 'amount-neg' : 'amount-pos'}>
                    {formatMoney(r.deudaTotal)}
                  </td>
                  <td>
                    <span className={`deuda-tag ${r.estadoCls}`}>{r.estadoLabel}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--hc-gray-l)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '5px', fontSize: '10px', color: 'var(--hc-gray)' }}>
          <span>Generado: {new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span>{config?.nombre}</span>
        </div>
      </div>
    </div>
  );
}