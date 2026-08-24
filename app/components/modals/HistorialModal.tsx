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

export default function HistorialModal({ isOpen, padreId, padreNombre, onClose }: HistorialModalProps) {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [meses, setMeses] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistorial = async () => {
    if (!padreId) return;
    setLoading(true);
    setError(null);
    try {
      const cid = localStorage.getItem('selectedColegioId');
      const cidParam = cid ? `&colegioId=${cid}` : '';
      const [facturasRes, pagosRes] = await Promise.all([
        fetch(`/api/facturas?padreId=${padreId}${cidParam}`),
        fetch(`/api/pagos?padreId=${padreId}${cidParam}`)
      ]);
      if (!facturasRes.ok || !pagosRes.ok) throw new Error('Error al cargar historial');
      const facturasData = await facturasRes.json();
      const pagosData = await pagosRes.json();
      setFacturas(facturasData);
      setPagos(pagosData);
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

  // Generar lista de períodos a mostrar (últimos N meses)
  const getPeriodos = (): string[] => {
    const now = new Date();
    const periodos: string[] = [];
    for (let i = meses - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const periodo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      periodos.push(periodo);
    }
    return periodos;
  };

  const periodos = getPeriodos();

  // Filtrar facturas y pagos por período
  const getFacturaPeriodo = (periodo: string): Factura | undefined => {
    return facturas.find(f => f.periodo === periodo);
  };

  const getPagosPeriodo = (periodo: string): Pago[] => {
    return pagos.filter(p => p.fecha.startsWith(periodo));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-lg">
        <div className="modal-head">
          <h3>📋 Historial de Pagos - {padreNombre || `Padre #${padreId}`}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <label className="lbl" style={{ margin: 0, whiteSpace: 'nowrap' }}>Mostrar últimos:</label>
          <select className="inp" value={meses} onChange={(e) => setMeses(parseInt(e.target.value))} style={{ width: 'auto' }}>
            <option value="3">3 meses</option>
            <option value="6">6 meses</option>
            <option value="12">12 meses</option>
            <option value="24">24 meses</option>
          </select>
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
              const factura = getFacturaPeriodo(periodo);
              const pagosPeriodo = getPagosPeriodo(periodo);
              const totalPagado = pagosPeriodo.reduce((sum, p) => sum + p.monto, 0);
              const pendiente = factura ? factura.monto - factura.pagado : 0;
              const estadoLabel = factura
                ? factura.estado === 'pagado' ? 'Pagado' : factura.estado === 'parcial' ? 'Parcial' : 'Pendiente'
                : 'Sin factura';
              const estadoCls = factura
                ? factura.estado === 'pagado' ? 'badge-paid' : factura.estado === 'parcial' ? 'badge-partial' : 'badge-pending'
                : 'badge';
              const mesNombre = MESES[parseInt(periodo.split('-')[1]) - 1] + ' ' + periodo.split('-')[0];

              return (
                <div key={periodo} className="hist-month-row">
                  <div className="hist-month-head">
                    <span>📅 {mesNombre}</span>
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}