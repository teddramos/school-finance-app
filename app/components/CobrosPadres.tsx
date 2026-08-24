'use client';

import { useEffect, useState } from 'react';
import { SkeletonPadresGrid } from './skeletons/SkeletonCobros';

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
}

interface Pago {
  id: number;
  padreId: number;
  monto: number;
  fecha: string;
}

interface CobrosPadresProps {
  onOpenCobroModal: (padreId: number) => void;
  refreshTrigger?: number;
}

const formatMoney = (value: number): string => {
  return `RD$${value.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function CobrosPadres({ onOpenCobroModal, refreshTrigger = 0 }: CobrosPadresProps) {
  
  const [padres, setPadres] = useState<Padre[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [tarifa, setTarifa] = useState(1500);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editPadre, setEditPadre] = useState<Padre | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    cedula: '',
    telefono: '',
    email: '',
    direccion: '',
  });
  const [hijosTemp, setHijosTemp] = useState<Hijo[]>([]);
  const [descuentosTemp, setDescuentosTemp] = useState<DescuentoPerfil[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Cargar datos iniciales
  const loadData = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const cid = localStorage.getItem('selectedColegioId');
      const cidParam = cid ? `?colegioId=${cid}` : '';
      const [padresRes, facturasRes, pagosRes, configRes] = await Promise.all([
        fetch(`/api/padres${cidParam}`, { credentials: 'same-origin', headers: authHeaders }),
        fetch(`/api/facturas${cidParam}`, { credentials: 'same-origin', headers: authHeaders }),
        fetch(`/api/pagos${cidParam}`, { credentials: 'same-origin', headers: authHeaders }),
        fetch(`/api/config${cidParam}`, { credentials: 'same-origin', headers: authHeaders }),
      ]);
      if (!padresRes.ok || !facturasRes.ok || !pagosRes.ok || !configRes.ok) throw new Error();
      const padresData = await padresRes.json();
      const facturasData = await facturasRes.json();
      const pagosData = await pagosRes.json();
      const configData = await configRes.json();
      
      setPadres(padresData);
      setFacturas(facturasData);
      setPagos(pagosData);
      setTarifa(configData.tarifa || 1500);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  // Filtrar padres por búsqueda
  const filteredPadres = padres.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.cedula.includes(searchTerm)
  );

  // Calcular deuda total de un padre
  const getDeudaTotal = (padreId: number): number => {
    const facturasPadre = facturas.filter(f => f.padreId === padreId);
    return facturasPadre.reduce((sum, f) => sum + (f.monto - f.pagado), 0);
  };

  // Calcular último pago
  const getUltimoPago = (padreId: number): Pago | null => {
    const pagosPadre = pagos.filter(p => p.padreId === padreId);
    if (pagosPadre.length === 0) return null;
    return pagosPadre.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];
  };

  // Calcular descuento de perfil
  const calcularDescuentoPerfil = (padre: Padre): number => {
    const base = padre.hijos.length * tarifa;
    let desc = 0;
    (padre.descuentos || []).forEach(d => {
      if (!d.activo) return;
      if (d.tipo === 'porcentaje') desc += base * (d.valor / 100);
      else desc += d.valor;
    });
    return Math.min(desc, base);
  };

  // Estado del padre (para badge)
  const getEstadoLabel = (deuda: number, padre: Padre): { label: string; cls: string } => {
    if (deuda <= 0) return { label: 'Al día', cls: 'ok' };
    const totalMensualidad = padre.hijos.length * tarifa;
    const descPerf = calcularDescuentoPerfil(padre);
    const neto = totalMensualidad - descPerf;
    if (deuda < neto) return { label: 'Parcial', cls: 'parcial' };
    return { label: `Debe ${formatMoney(deuda)}`, cls: '' };
  };

  // Eliminar padre
  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este padre? También se eliminarán sus facturas y pagos.')) return;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const cid = localStorage.getItem('selectedColegioId');
      const cidParam = cid ? `?colegioId=${cid}` : '';
      const res = await fetch(`/api/padres/${id}${cidParam}`, { method: 'DELETE', credentials: 'same-origin', headers: authHeaders });
      if (!res.ok) throw new Error();
      loadData();
    } catch (error) {
      alert('Error al eliminar');
    }
  };

  // Abrir modal para crear/editar
  const openModal = (padre?: Padre) => {
    if (padre) {
      setEditPadre(padre);
      setFormData({
        nombre: padre.nombre,
        cedula: padre.cedula,
        telefono: padre.telefono,
        email: padre.email,
        direccion: padre.direccion,
      });
      setHijosTemp([...padre.hijos]);
      setDescuentosTemp([...(padre.descuentos || [])]);
    } else {
      setEditPadre(null);
      setFormData({ nombre: '', cedula: '', telefono: '', email: '', direccion: '' });
      setHijosTemp([]);
      setDescuentosTemp([]);
    }
    setModalOpen(true);
  };

  const addHijo = () => {
    setHijosTemp([...hijosTemp, { nombre: '', grado: '' }]);
  };

  const updateHijo = (idx: number, field: keyof Hijo, value: string) => {
    const updated = [...hijosTemp];
    updated[idx] = { ...updated[idx], [field]: value };
    setHijosTemp(updated);
  };

  const removeHijo = (idx: number) => {
    setHijosTemp(hijosTemp.filter((_, i) => i !== idx));
  };

  const addDescuento = () => {
    setDescuentosTemp([...descuentosTemp, { nombre: '', tipo: 'porcentaje', valor: 0, activo: true }]);
  };

  const updateDescuento = (idx: number, field: keyof DescuentoPerfil, value: any) => {
    const updated = [...descuentosTemp];
    updated[idx] = { ...updated[idx], [field]: value };
    setDescuentosTemp(updated);
  };

  const removeDescuento = (idx: number) => {
    setDescuentosTemp(descuentosTemp.filter((_, i) => i !== idx));
  };

  const savePadre = async () => {
    if (!formData.nombre.trim() || !formData.cedula.trim()) {
      alert('Nombre y cédula son obligatorios');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        hijos: hijosTemp.filter(h => h.nombre.trim()),
        descuentos: descuentosTemp,
      };
      const cid = localStorage.getItem('selectedColegioId');
      const cidParam = cid ? `?colegioId=${cid}` : '';
      let res;
      if (editPadre) {
        res = await fetch(`/api/padres/${editPadre.id}${cidParam}`, {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', ...(typeof window !== 'undefined' && localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/padres${cidParam}`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', ...(typeof window !== 'undefined' && localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error();
      setModalOpen(false);
      loadData();
    } catch (error) {
      alert('Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  // Mostrar historial (disparar evento personalizado)
  const verHistorial = (padreId: number) => {
    window.dispatchEvent(new CustomEvent('openHistorial', { detail: padreId }));
  };

  if (loading) {
    return <SkeletonPadresGrid />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
        <input
          className="inp"
          placeholder="Buscar padre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '280px' }}
        />
        <button className="btn btn-green" onClick={() => openModal()}>
          + Nuevo Padre
        </button>
      </div>

      {filteredPadres.length === 0 ? (
        <div className="empty card"><div className="empty-icon">👨‍👧‍👦</div><p>No hay padres registrados</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '12px' }}>
          {filteredPadres.map(padre => {
            const deuda = getDeudaTotal(padre.id);
            const ultimoPago = getUltimoPago(padre.id);
            const descPerf = calcularDescuentoPerfil(padre);
            const facturaNeta = (padre.hijos.length * tarifa) - descPerf;
            const estado = getEstadoLabel(deuda, padre);
            return (
              <div key={padre.id} className="padre-card">
                <div className="padre-card-head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <div className="padre-avatar">{padre.nombre.charAt(0)}</div>
                    <div>
                      <div style={{ color: 'white', fontWeight: 700, fontSize: '12px' }}>{padre.nombre}</div>
                      <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '10px' }}>{padre.cedula}</div>
                    </div>
                  </div>
                  <span className={`deuda-tag ${estado.cls}`}>{estado.label}</span>
                </div>
                <div className="padre-card-body">
                  <div style={{ marginBottom: '7px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--hc-gray)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '3px' }}>
                      Hijos ({padre.hijos.length})
                    </div>
                    <div>
                      {padre.hijos.map((h, idx) => (
                        <span key={idx} className="hijo-chip">👦 {h.nombre}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                    <div>
                      <div style={{ fontSize: '9px', color: 'var(--hc-gray)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.05em' }}>Factura Neta</div>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>
                        {formatMoney(facturaNeta)}
                        {descPerf > 0 && <span style={{ fontSize: '9px', color: 'var(--hc-green)', marginLeft: '4px' }}>(-{formatMoney(descPerf)})</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '9px', color: 'var(--hc-gray)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.05em' }}>Deuda</div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: deuda > 0 ? 'var(--hc-red)' : 'var(--hc-green)' }}>
                        {formatMoney(deuda)}
                      </div>
                    </div>
                  </div>
                  {padre.descuentos?.filter(d => d.activo).length > 0 && (
                    <div style={{ fontSize: '9px', color: 'var(--hc-green)', background: '#e8f5ee', padding: '3px 8px', borderRadius: '5px', marginBottom: '6px', fontWeight: 700 }}>
                      ✓ {padre.descuentos.filter(d => d.activo).map(d => d.nombre).join(', ')}
                    </div>
                  )}
                  {ultimoPago && (
                    <div style={{ fontSize: '10px', color: 'var(--hc-gray)' }}>
                      Último pago: <strong>{formatMoney(ultimoPago.monto)}</strong> el {ultimoPago.fecha}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '5px', marginTop: '9px', flexWrap: 'wrap' }}>
                    <button className="btn btn-gold btn-sm" style={{ flex: 1 }} onClick={() => onOpenCobroModal(padre.id)}>💵 Cobrar</button>
                    <button className="btn btn-outline btn-sm" onClick={() => verHistorial(padre.id)}>📋</button>
                    <button className="btn btn-outline btn-sm" onClick={() => openModal(padre)}>✏️</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(padre.id)}>🗑️</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para crear/editar padre */}
      {modalOpen && (
        <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal modal-lg">
            <div className="modal-head">
              <h3>{editPadre ? 'Editar Padre' : 'Nuevo Padre'}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <div className="cfg-grid">
              <div className="fgroup">
                <label className="lbl">Nombre Completo</label>
                <input className="inp" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
              </div>
              <div className="fgroup">
                <label className="lbl">Cédula / RNC</label>
                <input className="inp" value={formData.cedula} onChange={e => setFormData({ ...formData, cedula: e.target.value })} />
              </div>
              <div className="fgroup">
                <label className="lbl">Teléfono</label>
                <input className="inp" value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} />
              </div>
              <div className="fgroup">
                <label className="lbl">Email</label>
                <input className="inp" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
            </div>
            <div className="fgroup">
              <label className="lbl">Dirección</label>
              <input className="inp" value={formData.direccion} onChange={e => setFormData({ ...formData, direccion: e.target.value })} />
            </div>

            {/* Sección hijos */}
            <div style={{ margin: '12px 0', padding: '12px 0', borderTop: '1px solid var(--hc-gray-l)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="lbl" style={{ margin: 0 }}>Hijos Matriculados</label>
                <button className="btn btn-sm btn-green" type="button" onClick={addHijo}>+ Agregar Hijo</button>
              </div>
              <div id="hijos-fields">
                {hijosTemp.length === 0 && <p style={{ fontSize: '11px', color: 'var(--hc-gray)', marginBottom: '6px' }}>Sin hijos agregados</p>}
                {hijosTemp.map((hijo, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                    <input className="inp" placeholder="Nombre del hijo" value={hijo.nombre} onChange={e => updateHijo(idx, 'nombre', e.target.value)} style={{ flex: 1 }} />
                    <input className="inp" placeholder="Grado" value={hijo.grado} onChange={e => updateHijo(idx, 'grado', e.target.value)} style={{ width: '110px' }} />
                    <button className="btn btn-danger btn-sm" type="button" onClick={() => removeHijo(idx)}>×</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Sección descuentos perfil */}
            <div style={{ margin: '12px 0', padding: '12px 0', borderTop: '1px solid var(--hc-gray-l)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <label className="lbl" style={{ margin: 0 }}>Descuentos Permanentes del Perfil</label>
                  <div style={{ fontSize: '11px', color: 'var(--hc-gray)' }}>Se aplican automáticamente en cada cobro</div>
                </div>
                <button className="btn btn-sm" style={{ background: '#e8f5ee', color: 'var(--hc-green)', border: '1px solid #c5e5ce' }} type="button" onClick={addDescuento}>+ Descuento</button>
              </div>
              <div>
                {descuentosTemp.length === 0 && <p style={{ fontSize: '11px', color: 'var(--hc-gray)', fontStyle: 'italic' }}>Sin descuentos configurados</p>}
                {descuentosTemp.map((desc, idx) => (
                  <div key={idx} className="desc-perfil-row">
                    <input className="inp" placeholder="Nombre descuento" value={desc.nombre} onChange={e => updateDescuento(idx, 'nombre', e.target.value)} style={{ flex: 1, fontSize: '12px', padding: '5px 8px' }} />
                    <select className="inp" value={desc.tipo} onChange={e => updateDescuento(idx, 'tipo', e.target.value)} style={{ width: '80px', fontSize: '12px' }}>
                      <option value="porcentaje">%</option>
                      <option value="fijo">Fijo</option>
                    </select>
                    <input className="inp" type="number" min="0" value={desc.valor} onChange={e => updateDescuento(idx, 'valor', parseFloat(e.target.value) || 0)} style={{ width: '80px', fontSize: '12px' }} placeholder={desc.tipo === 'porcentaje' ? '%' : 'DOP'} />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', whiteSpace: 'nowrap' }}>
                      <input type="checkbox" checked={desc.activo} onChange={e => updateDescuento(idx, 'activo', e.target.checked)} /> Activo
                    </label>
                    <button className="btn btn-danger btn-sm" type="button" onClick={() => removeDescuento(idx)}>×</button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-green" onClick={savePadre} disabled={submitting}>
                {submitting ? <span className="spin"></span> : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}