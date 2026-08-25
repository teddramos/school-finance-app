'use client';

import { useEffect, useState, useMemo } from 'react';
import Skeleton from '../skeletons/Skeleton';

interface Hijo { id?: number; nombre: string; grado: string }
interface DescuentoPerfil { id?: number; nombre: string; tipo: 'porcentaje' | 'fijo'; valor: number; activo: boolean }
interface Padre { id: number; nombre: string; cedula: string; telefono: string; email: string; direccion: string; hijos: Hijo[]; descuentos: DescuentoPerfil[] }
interface CargoAdicional { id: number; nombre: string; monto: number }
interface DescuentoAdicional { id: number; nombre: string; tipo: 'porcentaje' | 'fijo'; valor: number }
interface FacturaPend { id: number; padreId: number; periodo: string; monto: number; pagado: number; estado: string }
interface DistribLine { factura: FacturaPend; abono: number; nuevoPagado: number; nuevoEstado: string }

interface CobroModalProps {
  isOpen: boolean;
  padreId: number | null;
  onClose: () => void;
  onSuccess: () => void;
  onPaymentSuccess?: (pagoData: any) => void;
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const formatMoney = (v: number) => `RD$${v.toLocaleString('es-DO',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const mesNombre = (p: string) => { const parts = p.split('-'); return `${MESES[parseInt(parts[1],10)-1]} ${parts[0]}`; };

function simularDistribucion(monto: number, facturas: FacturaPend[]): DistribLine[] {
  const result: DistribLine[] = [];
  let restante = monto;
  for (const f of facturas) {
    if (restante <= 0) break;
    const pendiente = Number(f.monto) - Number(f.pagado);
    if (pendiente <= 0) continue;
    const abono = Math.min(restante, pendiente);
    const nuevoPagado = Number(f.pagado) + abono;
    result.push({ factura: f, abono, nuevoPagado, nuevoEstado: nuevoPagado >= Number(f.monto) ? 'pagado' : 'parcial' });
    restante -= abono;
  }
  return result;
}

export default function CobroModal({ isOpen, padreId, onClose, onSuccess, onPaymentSuccess }: CobroModalProps) {
  const [padre, setPadre] = useState<Padre | null>(null);
  const [config, setConfig] = useState<{ tarifa: number; nombre: string; rif: string; direccion: string; telefono: string; email: string; director: string }>({ tarifa: 1500, nombre: '', rif: '', direccion: '', telefono: '', email: '', director: '' });
  const [facturasPendientes, setFacturasPendientes] = useState<FacturaPend[]>([]);
  const [montoBase, setMontoBase] = useState(0);
  const [monto, setMonto] = useState(0);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [forma, setForma] = useState('efectivo');
  const [referencia, setReferencia] = useState('');
  const [cardDigits, setCardDigits] = useState('');
  const [observacion, setObservacion] = useState('');
  const [cargos, setCargos] = useState<CargoAdicional[]>([]);
  const [descuentosAdicionales, setDescuentosAdicionales] = useState<DescuentoAdicional[]>([]);
  const [loading, setLoading] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [montoManual, setMontoManual] = useState(false);

  useEffect(() => {
    if (!isOpen || !padreId) return;
    setMontoManual(false);
    const fetchData = async () => {
      setCargandoDatos(true);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const [padreRes, configRes, facturasRes] = await Promise.all([
          fetch(`/api/padres/${padreId}`, { credentials: 'same-origin', headers: authHeaders }),
          fetch('/api/config', { credentials: 'same-origin', headers: authHeaders }),
          fetch(`/api/facturas?padreId=${padreId}&limit=9999`, { credentials: 'same-origin', headers: authHeaders }),
        ]);
        if (!padreRes.ok || !configRes.ok || !facturasRes.ok) throw new Error('Error al cargar datos');
        const padreData = await padreRes.json();
        const configData = await configRes.json();
        const facturasResponse = await facturasRes.json();
        const todasFacturas: FacturaPend[] = facturasResponse.data || [];
        setPadre(padreData);
        setConfig(configData);
        const tarifa = configData.tarifa || 1500;
        const base = padreData.hijos.length * tarifa;
        setMontoBase(base);
        const pendientes = todasFacturas
          .filter((f: FacturaPend) => f.pagado < f.monto)
          .sort((a: FacturaPend, b: FacturaPend) => a.periodo.localeCompare(b.periodo));
        setFacturasPendientes(pendientes);
      } catch (error) {
        console.error(error);
      } finally {
        setCargandoDatos(false);
      }
    };
    fetchData();
  }, [isOpen, padreId]);

  const calcularDescuentoPerfil = (): number => {
    if (!padre) return 0;
    const base = padre.hijos.length * config.tarifa;
    let desc = 0;
    (padre.descuentos || []).forEach(d => {
      if (!d.activo) return;
      if (d.tipo === 'porcentaje') desc += base * (d.valor / 100);
      else desc += d.valor;
    });
    return Math.min(desc, base);
  };

  const descuentoPerfil = calcularDescuentoPerfil();
  const totalCargos = cargos.reduce((acc, c) => acc + c.monto, 0);
  const totalDescuentosAdicionales = descuentosAdicionales.reduce((acc, d) => {
    if (d.tipo === 'porcentaje') return acc + (montoBase * (d.valor / 100));
    return acc + d.valor;
  }, 0);
  const totalCalculado = Math.max(0, montoBase - descuentoPerfil + totalCargos - totalDescuentosAdicionales);

  useEffect(() => {
    if (!montoManual && isOpen) setMonto(totalCalculado);
  }, [totalCalculado, montoManual, isOpen]);

  const deudaTotal = facturasPendientes.reduce((s, f) => s + (Number(f.monto) - Number(f.pagado)), 0);

  const distribucion = useMemo(() => simularDistribucion(monto, facturasPendientes), [monto, facturasPendientes]);
  const sobrante = Math.max(0, monto - deudaTotal);

  const agregarCargo = () => setCargos(prev => [...prev, { id: Date.now(), nombre: '', monto: 0 }]);
  const actualizarCargo = (id: number, field: keyof CargoAdicional, value: string | number) => setCargos(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  const eliminarCargo = (id: number) => setCargos(prev => prev.filter(c => c.id !== id));
  const agregarDescuento = () => setDescuentosAdicionales(prev => [...prev, { id: Date.now(), nombre: '', tipo: 'fijo', valor: 0 }]);
  const actualizarDescuento = (id: number, field: keyof DescuentoAdicional, value: string | number) => setDescuentosAdicionales(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  const eliminarDescuento = (id: number) => setDescuentosAdicionales(prev => prev.filter(d => d.id !== id));

  const handleSubmit = async () => {
    if (!padre) return;
    if (monto <= 0) { alert('El monto total debe ser mayor a cero'); return; }
    if (forma === 'transferencia' && !referencia) { alert('Ingrese el número de referencia'); return; }
    if (forma === 'tarjeta' && !cardDigits) { alert('Ingrese los últimos 4 dígitos de la tarjeta'); return; }

    setLoading(true);
    try {
      const pagoPayload = {
        padreId: padre.id,
        monto,
        fecha,
        forma,
        referencia: (forma === 'transferencia' || forma === 'tarjeta') ? referencia : undefined,
        cardDigits: forma === 'tarjeta' ? cardDigits : undefined,
        observacion,
        montoBase,
        descuentoPerfil,
        cargos: cargos.filter(c => c.nombre && c.monto > 0),
        descuentosAdicionales: descuentosAdicionales.filter(d => d.nombre && d.valor > 0),
      };

      const res = await fetch('/api/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pagoPayload),
      });
      if (!res.ok) { const errData = await res.json(); throw new Error(errData.error || 'Error al registrar pago'); }
      const pagoRegistrado = await res.json();

      const [padreData, configData] = await Promise.all([
        fetch(`/api/padres/${padre.id}`).then(r => r.json()),
        fetch('/api/config').then(r => r.json()),
      ]);

      const pagoParaRecibo = { ...pagoRegistrado, padre: padreData, config: configData, montoBase, descuentoPerfil, cargos, descuentosAdicionales, forma, ref: referencia, cardDigits, obs: observacion };
      onSuccess();
      onClose();
      if (onPaymentSuccess) onPaymentSuccess(pagoParaRecibo);
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-lg">
        <div className="modal-head">
          <h3>💳 Registrar Pago</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {cargandoDatos ? (
          <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--hc-cream)', borderRadius: '8px', padding: '14px', display: 'flex', justifyContent: 'space-between' }}>
              <div><Skeleton width={140} height={16} style={{ marginBottom: 6 }} /><Skeleton width={180} height={12} /></div>
              <Skeleton width={100} height={20} />
            </div>
            <div className="two-col"><Skeleton variant="input" height={40} /><Skeleton variant="input" height={40} /></div>
            <Skeleton variant="input" height={80} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <Skeleton variant="btn" width={80} height={36} /><Skeleton variant="btn" width={110} height={36} />
            </div>
          </div>
        ) : (
          <>
            {/* Header info */}
            <div style={{ background: 'var(--hc-cream)', borderRadius: '8px', padding: '11px', marginBottom: '14px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <strong style={{ fontSize: '13px' }}>{padre?.nombre}</strong><br />
                  <span style={{ fontSize: '11px', color: 'var(--hc-gray)' }}>{padre?.hijos.length} hijo(s) · Tarifa: {formatMoney(config.tarifa)}/hijo</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: 'var(--hc-gray)' }}>Deuda total</span><br />
                  <strong style={{ fontSize: '15px', color: deudaTotal > 0 ? 'var(--hc-red)' : 'var(--hc-green)' }}>{formatMoney(deudaTotal)}</strong>
                </div>
              </div>
            </div>

            {/* Monto a pagar editable */}
            <div style={{ background: '#fffdf5', border: '2px solid var(--hc-gold)', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <label className="lbl" style={{ marginBottom: '4px', fontWeight: 700, color: 'var(--hc-gold)', fontSize: '13px' }}>Monto a pagar</label>
                  <input
                    className="inp"
                    type="number"
                    step="1"
                    min="0"
                    value={monto}
                    onChange={e => { setMontoManual(true); setMonto(parseFloat(e.target.value) || 0); }}
                    style={{ fontWeight: 700, fontSize: '16px', border: '2px solid var(--hc-gold)', color: 'var(--hc-green)' }}
                  />
                </div>
                <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-end', marginBottom: '2px' }}
                  onClick={() => { setMontoManual(false); setMonto(totalCalculado); }}
                  title="Restablecer al cálculo automático">
                  ↺ Auto: {formatMoney(totalCalculado)}
                </button>
              </div>
              {sobrante > 0 && (
                <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--hc-orange)', fontWeight: 600 }}>
                  ⚠️ Sobrante {formatMoney(sobrante)} que no cubre ninguna factura pendiente
                </div>
              )}
            </div>

            <div className="two-col" style={{ gap: '14px' }}>
              {/* Columna izquierda */}
              <div>
                <div className="fgroup">
                  <label className="lbl">Monto Base (Mensualidad)</label>
                  <input className="inp" type="number" step="1" min="0" value={montoBase} onChange={e => setMontoBase(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="fgroup">
                  <label className="lbl">Fecha de Pago</label>
                  <input className="inp" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
                </div>
                <div className="fgroup">
                  <label className="lbl">Forma de Pago</label>
                  <select className="inp" value={forma} onChange={e => setForma(e.target.value)}>
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="transferencia">🏦 Transferencia Bancaria</option>
                    <option value="tarjeta">💳 Tarjeta de Crédito</option>
                  </select>
                </div>
                {(forma === 'transferencia' || forma === 'tarjeta') && (
                  <div className="fgroup">
                    <label className="lbl">{forma === 'transferencia' ? 'Número de Referencia' : 'Número de Aprobación'}</label>
                    <input className="inp" value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Número..." />
                  </div>
                )}
                {forma === 'tarjeta' && (
                  <div className="fgroup">
                    <label className="lbl">Últimos 4 dígitos de la tarjeta</label>
                    <input className="inp" maxLength={4} value={cardDigits} onChange={e => setCardDigits(e.target.value)} placeholder="0000" />
                  </div>
                )}
                <div className="fgroup">
                  <label className="lbl">Observación (opcional)</label>
                  <input className="inp" value={observacion} onChange={e => setObservacion(e.target.value)} placeholder="Notas adicionales..." />
                </div>
              </div>

              {/* Columna derecha */}
              <div>
                <div style={{ marginBottom: '12px' }}>
                  <div className="lbl" style={{ margin: 0, color: 'var(--hc-green)' }}>✓ Descuentos del Perfil</div>
                  <div>
                    {(padre?.descuentos || []).filter(d => d.activo).length === 0 ? (
                      <p style={{ fontSize: '11px', color: 'var(--hc-gray)', fontStyle: 'italic' }}>Sin descuentos de perfil</p>
                    ) : (
                      (padre?.descuentos || []).filter(d => d.activo).map(d => (
                        <div key={d.id} className="cargo-row descuento">
                          <span style={{ fontSize: '12px', flex: 1 }}>✓ {d.nombre}</span>
                          <span style={{ fontSize: '11px', color: 'var(--hc-gray)' }}>{d.tipo === 'porcentaje' ? `${d.valor}%` : 'Fijo'}</span>
                          <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--hc-green)' }}>
                            -{d.tipo === 'porcentaje' ? formatMoney(montoBase * (d.valor / 100)) : formatMoney(d.valor)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="lbl" style={{ margin: 0 }}>Cargos Adicionales</label>
                    <button className="btn btn-sm" style={{ background: '#fff8f0', color: 'var(--hc-orange)', border: '1px solid #f5d8b8' }} onClick={agregarCargo} type="button">+ Cargo</button>
                  </div>
                  <div>
                    {cargos.length === 0 && <p style={{ fontSize: '11px', color: 'var(--hc-gray)', fontStyle: 'italic' }}>Sin cargos adicionales</p>}
                    {cargos.map(cargo => (
                      <div key={cargo.id} className="cargo-row cargo">
                        <input className="inp" placeholder="Concepto" value={cargo.nombre} onChange={e => actualizarCargo(cargo.id, 'nombre', e.target.value)} style={{ flex: 1, fontSize: '12px', padding: '5px 8px' }} />
                        <input className="inp" type="number" min="0" step="1" placeholder="Monto" value={cargo.monto || ''} onChange={e => actualizarCargo(cargo.id, 'monto', parseFloat(e.target.value) || 0)} style={{ width: '90px', fontSize: '12px', padding: '5px 8px' }} />
                        <button className="btn btn-danger btn-sm" type="button" onClick={() => eliminarCargo(cargo.id)}>×</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="lbl" style={{ margin: 0 }}>Descuentos Adicionales</label>
                    <button className="btn btn-sm" style={{ background: '#e8f5ee', color: 'var(--hc-green)', border: '1px solid #c5e5ce' }} onClick={agregarDescuento} type="button">+ Descuento</button>
                  </div>
                  <div>
                    {descuentosAdicionales.length === 0 && <p style={{ fontSize: '11px', color: 'var(--hc-gray)', fontStyle: 'italic' }}>Sin descuentos adicionales</p>}
                    {descuentosAdicionales.map(desc => (
                      <div key={desc.id} className="cargo-row descuento">
                        <input className="inp" placeholder="Concepto" value={desc.nombre} onChange={e => actualizarDescuento(desc.id, 'nombre', e.target.value)} style={{ flex: 1, fontSize: '12px', padding: '5px 8px' }} />
                        <select className="inp" value={desc.tipo} onChange={e => actualizarDescuento(desc.id, 'tipo', e.target.value as 'porcentaje' | 'fijo')} style={{ width: '80px', fontSize: '12px' }}>
                          <option value="fijo">Fijo</option><option value="porcentaje">%</option>
                        </select>
                        <input className="inp" type="number" min="0" step="1" placeholder={desc.tipo === 'porcentaje' ? '%' : 'Monto'} value={desc.valor || ''} onChange={e => actualizarDescuento(desc.id, 'valor', parseFloat(e.target.value) || 0)} style={{ width: '80px', fontSize: '12px' }} />
                        <button className="btn btn-danger btn-sm" type="button" onClick={() => eliminarDescuento(desc.id)}>×</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="cobro-resumen">
                  <div className="cobro-resumen-row"><span>Mensualidad Base</span><span>{formatMoney(montoBase)}</span></div>
                  {descuentoPerfil > 0 && <div className="cobro-resumen-row"><span>Descuento Perfil</span><span style={{ color: '#74c69d' }}>-{formatMoney(descuentoPerfil)}</span></div>}
                  {totalCargos > 0 && <div className="cobro-resumen-row"><span>Cargos Adicionales</span><span style={{ color: '#f4a261' }}>+{formatMoney(totalCargos)}</span></div>}
                  {totalDescuentosAdicionales > 0 && <div className="cobro-resumen-row"><span>Descuentos Adicionales</span><span style={{ color: '#74c69d' }}>-{formatMoney(totalDescuentosAdicionales)}</span></div>}
                  <div className="cobro-resumen-row total"><span>TOTAL CALCULADO</span><span>{formatMoney(totalCalculado)}</span></div>
                </div>
              </div>
            </div>

            {/* Distribución de facturas */}
            {facturasPendientes.length > 0 && (
              <div style={{ marginTop: '16px', border: '2px solid var(--hc-green)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ background: 'var(--hc-green)', color: 'white', padding: '8px 14px', fontWeight: 700, fontSize: '12px', letterSpacing: '0.04em' }}>
                  📋 Distribución del pago en facturas ({distribucion.length} de {facturasPendientes.length} facturas serán afectadas)
                </div>
                <div style={{ padding: '0' }}>
                  <div className="tbl-wrap">
                    <table style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Período</th>
                          <th style={{ textAlign: 'right' }}>Factura</th>
                          <th style={{ textAlign: 'right' }}>Pagado actual</th>
                          <th style={{ textAlign: 'right' }}>Pendiente actual</th>
                          <th style={{ textAlign: 'right' }}>Abono</th>
                          <th style={{ textAlign: 'right' }}>Nuevo saldo</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {facturasPendientes.map(f => {
                          const linea = distribucion.find(d => d.factura.id === f.id);
                          const pendActual = Number(f.monto) - Number(f.pagado);
                          const abono = linea?.abono || 0;
                          const nuevoSaldo = pendActual - abono;
                          const nuevoEstado = linea?.nuevoEstado || f.estado;
                          const estadoColor = nuevoEstado === 'pagado' ? { bg: '#e8f5ee', fg: '#1b5e20' } : nuevoEstado === 'parcial' ? { bg: '#fff3e0', fg: '#e65100' } : { bg: '#ffebee', fg: '#c62828' };

                          return (
                            <tr key={f.id} style={{ background: abono > 0 ? '#f9fdf7' : 'transparent' }}>
                              <td style={{ fontWeight: 600, fontSize: '12px' }}>{mesNombre(f.periodo)}</td>
                              <td style={{ textAlign: 'right' }}>{formatMoney(Number(f.monto))}</td>
                              <td style={{ textAlign: 'right', color: 'var(--hc-gray)' }}>{formatMoney(Number(f.pagado))}</td>
                              <td style={{ textAlign: 'right', color: pendActual > 0 ? 'var(--hc-red)' : 'var(--hc-gray)', fontWeight: 600 }}>{formatMoney(pendActual)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: abono > 0 ? 'var(--hc-green)' : 'var(--hc-gray)', fontSize: abono > 0 ? '13px' : '12px' }}>
                                {abono > 0 ? `+${formatMoney(abono)}` : '—'}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(nuevoSaldo)}</td>
                              <td>
                                <span style={{
                                  background: estadoColor.bg, color: estadoColor.fg,
                                  padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700,
                                  display: 'inline-block',
                                  border: abono > 0 && nuevoEstado === 'pagado' ? '2px solid #1b5e20' : 'none',
                                }}>
                                  {nuevoEstado === 'pagado' ? '✅ Pagado' : nuevoEstado === 'parcial' ? '⏳ Parcial' : '🔴 Pendiente'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {deudaTotal < monto && (
                          <tr style={{ background: '#fff8f0' }}>
                            <td style={{ fontStyle: 'italic', color: 'var(--hc-orange)' }} colSpan={4}>Sobrante (no aplica a factura)</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--hc-orange)' }}>+{formatMoney(sobrante)}</td>
                            <td colSpan={2}></td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            {facturasPendientes.length === 0 && (
              <div style={{ marginTop: '16px', background: '#f0fdf4', border: '2px solid var(--hc-green)', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: 'var(--hc-green)', fontWeight: 700 }}>✅ Sin facturas pendientes</div>
                <div style={{ fontSize: '11px', color: 'var(--hc-gray)', marginTop: '4px' }}>Se generará una nueva factura para el período actual al registrar el pago.</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
              <button className="btn btn-green" onClick={handleSubmit} disabled={loading || monto <= 0}>
                {loading ? <span className="spin"></span> : '✓ Registrar Pago'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
