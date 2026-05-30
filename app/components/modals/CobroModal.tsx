// components/modals/CobroModal.tsx
'use client';

import { useEffect, useState } from 'react';

// Interfaces
interface Hijo {
  id?: number;
  nombre: string;
  grado: string;
}

interface DescuentoPerfil {
  id?: number;
  nombre: string;
  tipo: 'porcentaje' | 'fijo';
  valor: number;
  activo: boolean;
}

interface Padre {
  id: number;
  nombre: string;
  cedula: string;
  telefono: string;
  email: string;
  direccion: string;
  hijos: Hijo[];
  descuentos: DescuentoPerfil[];
}

interface CargoAdicional {
  id: number;
  nombre: string;
  monto: number;
}

interface DescuentoAdicional {
  id: number;
  nombre: string;
  tipo: 'porcentaje' | 'fijo';
  valor: number;
}

interface CobroModalProps {
  isOpen: boolean;
  padreId: number | null;
  onClose: () => void;
  onSuccess: () => void;          // refrescar listas
  onPaymentSuccess?: (pagoData: any) => void; // mostrar recibo
}

const formatMoney = (value: number): string => {
  return `RD$${value.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function CobroModal({ isOpen, padreId, onClose, onSuccess, onPaymentSuccess }: CobroModalProps) {
  const [padre, setPadre] = useState<Padre | null>(null);
  const [config, setConfig] = useState<{ tarifa: number }>({ tarifa: 1500 });
  const [montoBase, setMontoBase] = useState(0);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [forma, setForma] = useState('efectivo');
  const [referencia, setReferencia] = useState('');
  const [cardDigits, setCardDigits] = useState('');
  const [observacion, setObservacion] = useState('');
  const [cargos, setCargos] = useState<CargoAdicional[]>([]);
  const [descuentosAdicionales, setDescuentosAdicionales] = useState<DescuentoAdicional[]>([]);
  const [loading, setLoading] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  // Cargar datos del padre y configuración
  useEffect(() => {
    if (!isOpen || !padreId) return;
    const fetchData = async () => {
      setCargandoDatos(true);
      try {
        const [padreRes, configRes] = await Promise.all([
          fetch(`/api/padres/${padreId}`),
          fetch('/api/config')
        ]);
        if (!padreRes.ok || !configRes.ok) throw new Error('Error al cargar datos');
        const padreData = await padreRes.json();
        const configData = await configRes.json();
        setPadre(padreData);
        setConfig(configData);
        const tarifa = configData.tarifa || 1500;
        const base = padreData.hijos.length * tarifa;
        setMontoBase(base);
      } catch (error) {
        console.error(error);
      } finally {
        setCargandoDatos(false);
      }
    };
    fetchData();
  }, [isOpen, padreId]);

  // Calcular descuento de perfil
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
  const totalAPagar = Math.max(0, montoBase - descuentoPerfil + totalCargos - totalDescuentosAdicionales);

  // Handlers
  const agregarCargo = () => {
    setCargos(prev => [...prev, { id: Date.now(), nombre: '', monto: 0 }]);
  };

  const actualizarCargo = (id: number, field: keyof CargoAdicional, value: string | number) => {
    setCargos(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const eliminarCargo = (id: number) => {
    setCargos(prev => prev.filter(c => c.id !== id));
  };

  const agregarDescuento = () => {
    setDescuentosAdicionales(prev => [...prev, { id: Date.now(), nombre: '', tipo: 'fijo', valor: 0 }]);
  };

  const actualizarDescuento = (id: number, field: keyof DescuentoAdicional, value: string | number) => {
    setDescuentosAdicionales(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const eliminarDescuento = (id: number) => {
    setDescuentosAdicionales(prev => prev.filter(d => d.id !== id));
  };

  const handleSubmit = async () => {
    if (!padre) return;
    if (totalAPagar <= 0) {
      alert('El monto total debe ser mayor a cero');
      return;
    }
    if (forma === 'transferencia' && !referencia) {
      alert('Ingrese el número de referencia');
      return;
    }
    if (forma === 'tarjeta' && !cardDigits) {
      alert('Ingrese los últimos 4 dígitos de la tarjeta');
      return;
    }

    setLoading(true);
    try {
      const pagoPayload = {
        padreId: padre.id,
        monto: totalAPagar,
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

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al registrar pago');
      }

      const pagoRegistrado = await res.json();

      // Cargar datos completos del padre y configuración para el recibo
      const [padreData, configData] = await Promise.all([
        fetch(`/api/padres/${padre.id}`).then(r => r.json()),
        fetch('/api/config').then(r => r.json())
      ]);

      const pagoParaRecibo = {
        ...pagoRegistrado,
        padre: padreData,
        config: configData,
        // Incluir también los datos específicos que necesita el recibo
        montoBase,
        descuentoPerfil,
        cargos,
        descuentosAdicionales,
        forma,
        ref: referencia,
        cardDigits,
        obs: observacion,
      };

      // Refrescar listas en la página
      onSuccess();
      onClose();

      // Mostrar recibo si existe callback
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
    <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-lg">
        <div className="modal-head">
          <h3>💳 Registrar Pago</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {cargandoDatos ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Cargando datos...</div>
        ) : (
          <>
            <div style={{ background: 'var(--hc-cream)', borderRadius: '8px', padding: '11px', marginBottom: '14px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <strong style={{ fontSize: '13px' }}>{padre?.nombre}</strong><br />
                  <span style={{ fontSize: '11px', color: 'var(--hc-gray)' }}>
                    {padre?.hijos.length} hijo(s) · Tarifa: {formatMoney(config.tarifa)}/hijo
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: 'var(--hc-gray)' }}>Total a pagar</span><br />
                  <strong style={{ fontSize: '15px', color: 'var(--hc-gold)' }}>{formatMoney(totalAPagar)}</strong>
                </div>
              </div>
            </div>

            <div className="two-col" style={{ gap: '14px' }}>
              {/* Columna izquierda */}
              <div>
                <div className="fgroup">
                  <label className="lbl">Monto Base (Mensualidad)</label>
                  <input className="inp" type="number" step="1" min="0" value={montoBase} onChange={(e) => setMontoBase(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="fgroup">
                  <label className="lbl">Fecha de Pago</label>
                  <input className="inp" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                </div>
                <div className="fgroup">
                  <label className="lbl">Forma de Pago</label>
                  <select className="inp" value={forma} onChange={(e) => setForma(e.target.value)}>
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="transferencia">🏦 Transferencia Bancaria</option>
                    <option value="tarjeta">💳 Tarjeta de Crédito</option>
                  </select>
                </div>
                {(forma === 'transferencia' || forma === 'tarjeta') && (
                  <div className="fgroup">
                    <label className="lbl">{forma === 'transferencia' ? 'Número de Referencia' : 'Número de Aprobación'}</label>
                    <input className="inp" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Número..." />
                  </div>
                )}
                {forma === 'tarjeta' && (
                  <div className="fgroup">
                    <label className="lbl">Últimos 4 dígitos de la tarjeta</label>
                    <input className="inp" maxLength={4} value={cardDigits} onChange={(e) => setCardDigits(e.target.value)} placeholder="0000" />
                  </div>
                )}
                <div className="fgroup">
                  <label className="lbl">Observación (opcional)</label>
                  <input className="inp" value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Notas adicionales..." />
                </div>
              </div>

              {/* Columna derecha */}
              <div>
                {/* Descuentos del perfil */}
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

                {/* Cargos adicionales */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="lbl" style={{ margin: 0 }}>Cargos Adicionales</label>
                    <button className="btn btn-sm" style={{ background: '#fff8f0', color: 'var(--hc-orange)', border: '1px solid #f5d8b8' }} onClick={agregarCargo} type="button">+ Cargo</button>
                  </div>
                  <div>
                    {cargos.length === 0 && <p style={{ fontSize: '11px', color: 'var(--hc-gray)', fontStyle: 'italic' }}>Sin cargos adicionales</p>}
                    {cargos.map(cargo => (
                      <div key={cargo.id} className="cargo-row cargo">
                        <input className="inp" placeholder="Concepto" value={cargo.nombre} onChange={(e) => actualizarCargo(cargo.id, 'nombre', e.target.value)} style={{ flex: 1, fontSize: '12px', padding: '5px 8px' }} />
                        <input className="inp" type="number" min="0" step="1" placeholder="Monto" value={cargo.monto || ''} onChange={(e) => actualizarCargo(cargo.id, 'monto', parseFloat(e.target.value) || 0)} style={{ width: '90px', fontSize: '12px', padding: '5px 8px' }} />
                        <button className="btn btn-danger btn-sm" type="button" onClick={() => eliminarCargo(cargo.id)}>×</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Descuentos adicionales */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="lbl" style={{ margin: 0 }}>Descuentos Adicionales</label>
                    <button className="btn btn-sm" style={{ background: '#e8f5ee', color: 'var(--hc-green)', border: '1px solid #c5e5ce' }} onClick={agregarDescuento} type="button">+ Descuento</button>
                  </div>
                  <div>
                    {descuentosAdicionales.length === 0 && <p style={{ fontSize: '11px', color: 'var(--hc-gray)', fontStyle: 'italic' }}>Sin descuentos adicionales</p>}
                    {descuentosAdicionales.map(desc => (
                      <div key={desc.id} className="cargo-row descuento">
                        <input className="inp" placeholder="Concepto" value={desc.nombre} onChange={(e) => actualizarDescuento(desc.id, 'nombre', e.target.value)} style={{ flex: 1, fontSize: '12px', padding: '5px 8px' }} />
                        <select className="inp" value={desc.tipo} onChange={(e) => actualizarDescuento(desc.id, 'tipo', e.target.value as 'porcentaje' | 'fijo')} style={{ width: '80px', fontSize: '12px' }}>
                          <option value="fijo">Fijo</option>
                          <option value="porcentaje">%</option>
                        </select>
                        <input className="inp" type="number" min="0" step="1" placeholder={desc.tipo === 'porcentaje' ? '%' : 'Monto'} value={desc.valor || ''} onChange={(e) => actualizarDescuento(desc.id, 'valor', parseFloat(e.target.value) || 0)} style={{ width: '80px', fontSize: '12px' }} />
                        <button className="btn btn-danger btn-sm" type="button" onClick={() => eliminarDescuento(desc.id)}>×</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resumen total */}
                <div className="cobro-resumen">
                  <div className="cobro-resumen-row"><span>Mensualidad Base</span><span>{formatMoney(montoBase)}</span></div>
                  {descuentoPerfil > 0 && (
                    <div className="cobro-resumen-row"><span>Descuento Perfil</span><span style={{ color: '#74c69d' }}>-{formatMoney(descuentoPerfil)}</span></div>
                  )}
                  {totalCargos > 0 && (
                    <div className="cobro-resumen-row"><span>Cargos Adicionales</span><span style={{ color: '#f4a261' }}>+{formatMoney(totalCargos)}</span></div>
                  )}
                  {totalDescuentosAdicionales > 0 && (
                    <div className="cobro-resumen-row"><span>Descuentos Adicionales</span><span style={{ color: '#74c69d' }}>-{formatMoney(totalDescuentosAdicionales)}</span></div>
                  )}
                  <div className="cobro-resumen-row total"><span>TOTAL A COBRAR</span><span>{formatMoney(totalAPagar)}</span></div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
              <button className="btn btn-green" onClick={handleSubmit} disabled={loading}>
                {loading ? <span className="spin"></span> : '✓ Registrar Pago'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}