'use client';

import { useState } from 'react';
import Skeleton from './skeletons/Skeleton';

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
  activo: boolean;
}

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

interface CobrosCajaProps {
  onOpenCobroModal: (padreId: number) => void;
}

const formatMoney = (value: number): string => {
  return `RD$${value.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function CobrosCaja({ onOpenCobroModal }: CobrosCajaProps) {
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<Padre[]>([]);
  const [loading, setLoading] = useState(false);
  const [padreSeleccionado, setPadreSeleccionado] = useState<Padre | null>(null);
  const [deudas, setDeudas] = useState<Factura[]>([]);
  const [totalDeuda, setTotalDeuda] = useState(0);
  const [ultimoPago, setUltimoPago] = useState<Pago | null>(null);
  const [cargandoDeudas, setCargandoDeudas] = useState(false);

  const buscarPadres = async () => {
    if (busqueda.trim().length < 2) return;
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const cid = localStorage.getItem('selectedColegioId');
      const cidParam = cid ? `&colegioId=${cid}` : '';
      const url = `/api/padres?q=${encodeURIComponent(busqueda)}${cidParam}`;
      const res = await fetch(url, { credentials: 'same-origin', headers: authHeaders });
      if (!res.ok) throw new Error('Error al buscar');
      const data = await res.json();
      setResultados(data);
    } catch (error) {
      console.error(error);
      setResultados([]);
    } finally {
      setLoading(false);
    }
  };

  const seleccionarPadre = async (padre: Padre) => {
    setPadreSeleccionado(padre);
    setCargandoDeudas(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const cid = localStorage.getItem('selectedColegioId');
      const cidParam = cid ? `&colegioId=${cid}` : '';
      // Obtener facturas pendientes
      const facturasRes = await fetch(`/api/facturas?padreId=${padre.id}&estado=pending${cidParam}`, { credentials: 'same-origin', headers: authHeaders });
      if (!facturasRes.ok) throw new Error();
      const facturasData: Factura[] = await facturasRes.json();
      const pendientes = facturasData.filter(f => f.pagado < f.monto);
      setDeudas(pendientes);
      const total = pendientes.reduce((acc, f) => acc + (f.monto - f.pagado), 0);
      setTotalDeuda(total);

      // Obtener último pago
      const pagosRes = await fetch(`/api/pagos?padreId=${padre.id}${cidParam}`, { credentials: 'same-origin', headers: authHeaders });
      if (pagosRes.ok) {
        const pagosData = await pagosRes.json();
        setUltimoPago(pagosData[0] || null);
      } else {
        setUltimoPago(null);
      }
    } catch (error) {
      console.error(error);
      setDeudas([]);
      setTotalDeuda(0);
      setUltimoPago(null);
    } finally {
      setCargandoDeudas(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') buscarPadres();
  };

  return (
    <div>
      <div className="caja-search card">
        <div className="card-title">Buscar Padre / Tutor</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            className="inp"
            placeholder="Nombre o cédula del padre/tutor..."
            style={{ flex: 1, minWidth: '200px' }}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="btn btn-green" onClick={buscarPadres}>
            🔍 Buscar
          </button>
        </div>
        {resultados.length > 0 && (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {resultados.map((p) => (
              <div
                key={p.id}
                onClick={() => seleccionarPadre(p)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 13px',
                  border: '1.5px solid var(--hc-gray-l)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: 'white',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--hc-green)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--hc-gray-l)')}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{p.nombre}</div>
                  <div style={{ fontSize: '11px', color: 'var(--hc-gray)' }}>
                    {p.cedula} · {p.hijos.length} hijo{p.hijos.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <span className="deuda-tag">?</span>
              </div>
            ))}
          </div>
        )}
        {loading && (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[1, 2].map((i) => (
              <div key={i} style={{ padding: '9px 13px', border: '1.5px solid var(--hc-gray-l)', borderRadius: '8px', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Skeleton width={140} height={14} style={{ marginBottom: 4 }} />
                  <Skeleton width={90} height={10} />
                </div>
                <Skeleton width={20} height={20} borderRadius={4} />
              </div>
            ))}
          </div>
        )}
      </div>

      {padreSeleccionado && (
        <div className="caja-result show" style={{ marginTop: '16px' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, var(--hc-green), var(--hc-dark))',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              borderRadius: 'var(--radius) var(--radius) 0 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="padre-avatar">{padreSeleccionado.nombre.charAt(0)}</div>
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>{padreSeleccionado.nombre}</div>
                <div style={{ color: 'rgba(255,255,255,.65)', fontSize: '11px' }}>
                  {padreSeleccionado.cedula} · {padreSeleccionado.telefono}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn btn-gold btn-sm" onClick={() => onOpenCobroModal(padreSeleccionado.id)}>
                💵 Cobrar
              </button>
              <button
                className="btn btn-sm"
                style={{ background: 'rgba(255,255,255,.15)', color: 'white' }}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('openHistorial', { detail: padreSeleccionado.id }));
                }}
              >
                📋 Historial
              </button>
            </div>
          </div>

          <div
            style={{
              padding: '14px 18px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px',
              borderBottom: '1px solid var(--hc-gray-l)',
              background: 'white',
            }}
          >
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--hc-gray)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '4px' }}>
                Hijos
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                {padreSeleccionado.hijos.map((h, idx) => (
                  <span key={idx} className="hijo-chip">👦 {h.nombre}</span>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--hc-gray)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '4px' }}>
                Deuda Total
              </div>
              <div
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '18px',
                  fontWeight: 700,
                  color: totalDeuda > 0 ? 'var(--hc-red)' : 'var(--hc-green)',
                }}
              >
                {formatMoney(totalDeuda)}
              </div>
              <span className={`deuda-tag ${totalDeuda === 0 ? 'ok' : ''}`}>
                {totalDeuda === 0 ? 'Al día' : totalDeuda < (padreSeleccionado.hijos.length * 1500) ? 'Parcial' : 'Pendiente'}
              </span>
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--hc-gray)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '4px' }}>
                Último Pago
              </div>
              {ultimoPago ? (
                <>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{formatMoney(ultimoPago.monto)}</div>
                  <div style={{ fontSize: '10px', color: 'var(--hc-gray)' }}>{ultimoPago.fecha}</div>
                </>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--hc-gray)' }}>Sin pagos</div>
              )}
            </div>
          </div>

          {cargandoDeudas ? (
            <div style={{ padding: '16px 18px', background: 'white', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Skeleton width={130} height={14} />
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid var(--hc-gray-l)', borderRadius: '6px' }}>
                <div>
                  <Skeleton width={100} height={14} style={{ marginBottom: 4 }} />
                  <Skeleton width={140} height={10} />
                </div>
                <Skeleton width={70} height={16} />
              </div>
            </div>
          ) : deudas.length > 0 ? (
            <div style={{ padding: '12px 18px', background: 'white', borderRadius: '0 0 var(--radius) var(--radius)' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--hc-dark)',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ⚠️ Facturas pendientes <span style={{ fontSize: '10px', color: 'var(--hc-gray)', fontWeight: 400 }}>(más antigua primero)</span>
              </div>
              {deudas.map((f, idx) => (
                <div key={f.id} className={`deuda-row ${idx === 0 ? 'oldest' : ''}`}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '12px' }}>
                      {new Date(f.periodo + '-01').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--hc-gray)' }}>
                      Total: {formatMoney(f.monto)} · Pagado: {formatMoney(f.pagado)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--hc-red)', fontSize: '13px' }}>
                      {formatMoney(f.monto - f.pagado)}
                    </div>
                    {idx === 0 && <div style={{ fontSize: '9px', color: 'var(--hc-gold)', fontWeight: 700 }}>← PRÓXIMA</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '12px 18px', color: 'var(--hc-green)', fontWeight: 600, fontSize: '12px', background: 'white', borderRadius: '0 0 var(--radius) var(--radius)' }}>
              ✓ Sin deudas pendientes
            </div>
          )}
        </div>
      )}
    </div>
  );
}