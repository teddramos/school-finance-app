'use client';

import { useEffect, useState } from 'react';
import Skeleton from '../skeletons/Skeleton';

interface Factura {
  id: number;
  padreId: number;
  periodo: string;
  monto: number;
  pagado: number;
  estado: 'pagado' | 'parcial' | 'pendiente';
}

interface Pago {
  id: number;
  numRecibo: string;
  monto: number;
  fecha: string;
  forma: string;
}

interface ColegioConfig {
  nombre: string;
  rif: string;
  direccion: string;
  telefono: string;
  email: string;
  director: string;
  tarifa: number;
  logo_url?: string;
}

interface HistorialModalProps {
  isOpen: boolean;
  padreId: number | null;
  padreNombre?: string;
  onClose: () => void;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const formatMoney = (value: number): string => {
  return `RD$${value.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const authHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const mesNombre = (periodo: string): string =>
  `${MESES[parseInt(periodo.split('-')[1], 10) - 1]} ${periodo.split('-')[0]}`;

export default function HistorialModal({ isOpen, padreId, padreNombre, onClose }: HistorialModalProps) {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [config, setConfig] = useState<ColegioConfig | null>(null);
  const [meses, setMeses] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistorial = async () => {
    if (!padreId) return;
    setLoading(true);
    setError(null);
    try {
      const [facturasRes, pagosRes, configRes] = await Promise.all([
        fetch(`/api/facturas?padreId=${padreId}`, { credentials: 'same-origin', headers: authHeaders() }),
        fetch(`/api/pagos?padreId=${padreId}`, { credentials: 'same-origin', headers: authHeaders() }),
        fetch('/api/config', { credentials: 'same-origin', headers: authHeaders() }),
      ]);
      if (!facturasRes.ok || !pagosRes.ok || !configRes.ok) throw new Error('Error al cargar historial');
      const facturasResponse = await facturasRes.json();
      const pagosResponse = await pagosRes.json();
      setFacturas(facturasResponse.data || facturasResponse);
      setPagos(pagosResponse.data || pagosResponse);
      setConfig(await configRes.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && padreId) {
      loadHistorial();
    }
  }, [isOpen, padreId]);

  // Períodos visibles (últimos N meses)
  const getPeriodos = (): string[] => {
    const now = new Date();
    const periodos: string[] = [];
    for (let i = meses - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      periodos.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return periodos;
  };

  const periodos = getPeriodos();

  const getPagosPeriodo = (periodo: string): Pago[] =>
    pagos.filter(p => p.fecha.startsWith(periodo));

  // ---------- Datos completos ordenados (para imprimir / exportar) ----------
  const facturasOrdenadas = [...facturas].sort((a, b) => a.periodo.localeCompare(b.periodo));
  const pagosOrdenados = [...pagos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const totalFacturado = facturasOrdenadas.reduce((s, f) => s + f.monto, 0);
  const totalPagadoAcum = facturasOrdenadas.reduce((s, f) => s + f.pagado, 0);
  const totalPendiente = totalFacturado - totalPagadoAcum;

  const titulo = `Historial - ${padreNombre || `Padre #${padreId}`}`;
  const fechaHoy = new Date().toLocaleDateString('es-DO');

  const encabezadoHTML = (compacto: boolean): string => `
    <div class="enc">
      ${config?.logo_url ? `<div style="margin-bottom:5px"><img src="${config.logo_url}" alt="Logo" style="width:40px;height:40px;border-radius:50%;object-fit:cover" /></div>` : ''}
      <div class="enc-nombre">${config?.nombre || 'Colegio'}</div>
      ${config?.rif ? `<div>RIF: ${config.rif}</div>` : ''}
      ${config?.direccion ? `<div>${config.direccion}</div>` : ''}
      ${config?.telefono ? `<div>Tel: ${config.telefono}</div>` : ''}
      <div style="margin-top:8px;font-weight:bold;">${titulo}</div>
      <div>Generado: ${fechaHoy}</div>
    </div>`;

  const tablasHTML = (): string => `
    <table>
      <thead><tr><th>Período</th><th>Factura</th><th>Pagado</th><th>Pendiente</th><th>Estado</th></tr></thead>
      <tbody>
        ${facturasOrdenadas.map(f => {
          const pendiente = f.monto - f.pagado;
          const est = f.estado === 'pagado' ? 'Pagado' : f.estado === 'parcial' ? 'Parcial' : 'Pendiente';
          return `<tr><td>${mesNombre(f.periodo)}</td><td>${formatMoney(f.monto)}</td><td>${formatMoney(f.pagado)}</td><td>${formatMoney(pendiente)}</td><td>${est}</td></tr>`;
        }).join('')}
        <tr class="tot"><td>TOTAL</td><td>${formatMoney(totalFacturado)}</td><td>${formatMoney(totalPagadoAcum)}</td><td>${formatMoney(totalPendiente)}</td><td></td></tr>
      </tbody>
    </table>
    <h4>Pagos Realizados</h4>
    <table>
      <thead><tr><th>#</th><th>Fecha</th><th>Recibo</th><th>Forma</th><th>Monto</th></tr></thead>
      <tbody>
        ${pagosOrdenados.map(p => `<tr><td>${p.fecha}</td><td colspan="2">${p.numRecibo || ''}</td><td>${p.forma}</td><td>${formatMoney(p.monto)}</td></tr>`).join('')}
        ${pagosOrdenados.length === 0 ? '<tr><td colspan="5" style="text-align:center;">Sin pagos registrados</td></tr>' : ''}
        <tr class="tot"><td colspan="4">TOTAL PAGADO</td><td>${formatMoney(pagosOrdenados.reduce((s, p) => s + p.monto, 0))}</td></tr>
      </tbody>
    </table>`;

  const baseStyles = `
    body { font-family: Arial, Helvetica, sans-serif; color:#222; margin:18px; }
    .enc { text-align:center; border-bottom:2px solid #2e7d32; padding-bottom:10px; margin-bottom:14px; font-size:12px; }
    .enc-nombre { font-size:18px; font-weight:bold; color:#2e7d32; }
    h4 { margin:16px 0 6px; font-size:13px; color:#2e7d32; }
    table { width:100%; border-collapse:collapse; font-size:11px; margin-bottom:6px; }
    th { background:#e8f5ee; color:#1b5e20; text-align:left; padding:6px 8px; border:1px solid #bbb; }
    td { padding:5px 8px; border:1px solid #ccc; }
    tr.tot td { font-weight:bold; background:#f5f5f5; }
  `;

  // ---------- Imprimir ----------
  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      alert('Habilita las ventanas emergentes (pop-ups) para poder imprimir.');
      return;
    }
    win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${titulo}</title><style>${baseStyles}@page { size: A4; margin: 14mm; }</style></head><body>${encabezadoHTML(false)}${tablasHTML()}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 300);
  };

  // ---------- Exportar a Excel (.xls) ----------
  const handleExcel = () => {
    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Historial</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><style>${baseStyles}</style></head><body>${encabezadoHTML(true)}${tablasHTML()}</body></html>`;
    const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const slug = (padreNombre || `padre-${padreId}`).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    a.href = url;
    a.download = `historial_${slug}_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-lg">
        <div className="modal-head">
          <h3>📋 Historial de Pagos - {padreNombre || `Padre #${padreId}`}</h3>
          <button className="modal-close" onClick={onClose} title="Cerrar">×</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <label className="lbl" style={{ margin: 0, whiteSpace: 'nowrap' }}>Mostrar últimos:</label>
          <select className="inp" value={meses} onChange={(e) => setMeses(parseInt(e.target.value))} style={{ width: 'auto' }}>
            <option value="3">3 meses</option>
            <option value="6">6 meses</option>
            <option value="12">12 meses</option>
            <option value="24">24 meses</option>
          </select>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
            <button className="btn btn-outline btn-sm" onClick={handlePrint} title="Imprimir historial completo">🖨️ Imprimir</button>
            <button className="btn btn-green btn-sm" onClick={handleExcel} title="Exportar a Excel">📊 Excel</button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 0' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ border: '1px solid var(--hc-gray-l)', borderRadius: 8, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Skeleton width={120} height={16} style={{ marginBottom: 6 }} />
                  <Skeleton width={160} height={12} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <Skeleton width={70} height={18} />
                  <Skeleton width={55} height={18} borderRadius={10} />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div style={{ color: 'var(--hc-red)', textAlign: 'center', padding: '20px' }}>⚠️ {error}</div>
        ) : (
          <div id="modal-hist-content">
            {periodos.map(periodo => {
              const factura = facturas.find(f => f.periodo === periodo);
              const pagosPeriodo = getPagosPeriodo(periodo);
              const pendiente = factura ? factura.monto - factura.pagado : 0;
              const estadoLabel = factura
                ? factura.estado === 'pagado' ? 'Pagado' : factura.estado === 'parcial' ? 'Parcial' : 'Pendiente'
                : 'Sin factura';
              const estadoCls = factura
                ? factura.estado === 'pagado' ? 'badge-paid' : factura.estado === 'parcial' ? 'badge-partial' : 'badge-pending'
                : 'badge';
              const mesN = mesNombre(periodo);

              return (
                <div key={periodo} className="hist-month-row">
                  <div className="hist-month-head">
                    <span>📅 {mesN}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {factura && <span style={{ fontSize: '11px', color: 'var(--hc-gray)' }}>Factura: <strong>{formatMoney(factura.monto)}</strong></span>}
                      <span className={`badge ${estadoCls}`}>{estadoLabel}</span>
                    </div>
                  </div>
                  <div className="hist-month-body">
                    {factura ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '7px', padding: '9px', background: 'var(--hc-cream)', borderRadius: '6px', fontSize: '12px' }}>
                        <div>
                          <div style={{ color: 'var(--hc-gray)', fontWeight: 700, textTransform: 'uppercase', fontSize: '9px', marginBottom: '2px' }}>Factura</div>
                          <div style={{ fontWeight: 700 }}>{formatMoney(factura.monto)}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--hc-gray)', fontWeight: 700, textTransform: 'uppercase', fontSize: '9px', marginBottom: '2px' }}>Pagado</div>
                          <div style={{ fontWeight: 700, color: 'var(--hc-green)' }}>{formatMoney(factura.pagado)}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--hc-gray)', fontWeight: 700, textTransform: 'uppercase', fontSize: '9px', marginBottom: '2px' }}>Pendiente</div>
                          <div style={{ fontWeight: 700, color: pendiente > 0 ? 'var(--hc-red)' : 'var(--hc-green)' }}>{formatMoney(pendiente)}</div>
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: '11px', color: 'var(--hc-gray)', fontStyle: 'italic', padding: '3px 0' }}>No se generó factura</p>
                    )}
                    {pagosPeriodo.length > 0 ? (
                      <>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--hc-gray)', textTransform: 'uppercase', marginBottom: '4px' }}>Pagos:</div>
                        {pagosPeriodo.map(p => (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 9px', background: 'white', border: '1px solid var(--hc-gray-l)', borderRadius: '5px', marginBottom: '3px', fontSize: '11px' }}>
                            <div>
                              <strong>{formatMoney(p.monto)}</strong> · {p.fecha} · <span style={{ color: 'var(--hc-gray)' }}>{p.forma}</span>
                            </div>
                            <span style={{ fontSize: '9px', color: 'var(--hc-gray)' }}>{p.numRecibo || ''}</span>
                          </div>
                        ))}
                      </>
                    ) : (
                      factura && <p style={{ fontSize: '11px', color: 'var(--hc-gray)', fontStyle: 'italic', marginTop: '6px' }}>Sin pagos registrados</p>
                    )}
                  </div>
                </div>
              );
            })}
            {periodos.length === 0 && (
              <div className="empty">No hay períodos para mostrar</div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', gap: '8px' }}>
          <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
