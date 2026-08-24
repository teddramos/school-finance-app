'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Skeleton from '@/components/skeletons/Skeleton';

// Tipos básicos
interface Cuenta {
  id: number;
  nombre: string;
  tipo: 'ingreso' | 'gasto';
}

interface Movimiento {
  id: number;
  tipo: 'ingreso' | 'gasto';
  cuentaId: number;
  monto: number;
  fecha: string;
  descripcion?: string;
  periodo: string;
  usuario?: string;
  origen?: string;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function MovimientosPage() {
  const router = useRouter();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [tipoFilter, setTipoFilter] = useState<'todos' | 'ingreso' | 'gasto'>('todos');
  
  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editMovimiento, setEditMovimiento] = useState<Movimiento | null>(null);
  const [formData, setFormData] = useState({
    tipo: 'ingreso' as 'ingreso' | 'gasto',
    cuentaId: '',
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    descripcion: ''
  });
  const [submitting, setSubmitting] = useState(false);
  
  // Permisos (se obtendrían del usuario actual; simulamos con fetch a /api/auth/me)
  const [canEdit, setCanEdit] = useState(false);
  
  // Obtener usuario actual para permisos
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch('/api/auth/me', { credentials: 'same-origin', headers })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && (data.user.role === 'admin' || data.user.role === 'asistente')) {
          setCanEdit(true);
        } else {
          setCanEdit(false);
        }
      })
      .catch(() => setCanEdit(false));
  }, []);
  
  const loadCuentas = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const cid = localStorage.getItem('selectedColegioId');
      const cidParam = cid ? `?colegioId=${cid}` : '';
      const res = await fetch(`/api/cuentas${cidParam}`, { credentials: 'same-origin', headers });
      if (!res.ok) throw new Error('Error al cargar cuentas');
      const data = await res.json();
      setCuentas(data);
    } catch (err) {
      console.error(err);
    }
  }, []);
  
  const loadMovimientos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const cid = localStorage.getItem('selectedColegioId');
      const cidParam = cid ? `&colegioId=${cid}` : '';
      const url = `/api/movimientos?year=${selectedYear}&month=${selectedMonth + 1}&tipo=${tipoFilter}${cidParam}`;
      const res = await fetch(url, { credentials: 'same-origin', headers });
      if (!res.ok) {
        if (res.status === 401) router.push('/login');
        throw new Error('Error al cargar movimientos');
      }
      const data = await res.json();
      setMovimientos(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, tipoFilter, router]);
  
  useEffect(() => {
    loadCuentas();
  }, [loadCuentas]);
  
  useEffect(() => {
    loadMovimientos();
  }, [loadMovimientos]);
  
  // Calcular estadísticas del mes filtrado (todos los movimientos del mes, sin importar el tipoFilter)
  const stats = (() => {
    const ingresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0);
    const gastos = movimientos.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0);
    const balance = ingresos - gastos;
    return { ingresos, gastos, balance };
  })();
  
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(parseInt(e.target.value));
  };
  
  const handleMonthClick = (monthIndex: number) => {
    setSelectedMonth(monthIndex);
  };
  
  const openCreateModal = () => {
    setEditMovimiento(null);
    setFormData({
      tipo: 'ingreso',
      cuentaId: '',
      monto: '',
      fecha: new Date().toISOString().split('T')[0],
      descripcion: ''
    });
    setModalOpen(true);
  };
  
  const openEditModal = (mov: Movimiento) => {
    setEditMovimiento(mov);
    setFormData({
      tipo: mov.tipo,
      cuentaId: mov.cuentaId.toString(),
      monto: mov.monto.toString(),
      fecha: mov.fecha,
      descripcion: mov.descripcion || ''
    });
    setModalOpen(true);
  };
  
  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cuentaId || !formData.monto || !formData.fecha) {
      alert('Complete todos los campos obligatorios');
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const cid = localStorage.getItem('selectedColegioId');
      const cidParam = cid ? `?colegioId=${cid}` : '';
      const payload = {
        tipo: formData.tipo,
        cuentaId: parseInt(formData.cuentaId),
        monto: parseFloat(formData.monto),
        fecha: formData.fecha,
        descripcion: formData.descripcion,
        periodo: `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`
      };
      let res;
      if (editMovimiento) {
        res = await fetch(`/api/movimientos/${editMovimiento.id}${cidParam}`, {
          method: 'PUT',
          credentials: 'same-origin',
          headers,
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`/api/movimientos${cidParam}`, {
          method: 'POST',
          credentials: 'same-origin',
          headers,
          body: JSON.stringify(payload)
        });
      }
      if (!res.ok) throw new Error('Error al guardar');
      setModalOpen(false);
      loadMovimientos();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este movimiento?')) return;
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const cid = localStorage.getItem('selectedColegioId');
      const cidParam = cid ? `?colegioId=${cid}` : '';
      const res = await fetch(`/api/movimientos/${id}${cidParam}`, { method: 'DELETE', credentials: 'same-origin', headers });
      if (!res.ok) throw new Error('Error al eliminar');
      loadMovimientos();
    } catch (err: any) {
      alert(err.message);
    }
  };
  
  const formatMoney = (value: number) => {
    return `RD$${value.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const getCuentaNombre = (cuentaId: number) => {
    const cuenta = cuentas.find(c => c.id === cuentaId);
    return cuenta ? cuenta.nombre : '—';
  };
  
  // Helper para saber si un mes tiene movimientos (para marcar el chip)
  // No tenemos acceso a todos los meses desde aquí, opcional.
  
  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <h2>Movimientos</h2>
          <p>Registro de ingresos y gastos</p>
        </div>
        {canEdit && (
          <button className="btn btn-gold" onClick={openCreateModal}>
            + Nuevo
          </button>
        )}
      </div>
      <div className="page-wrap">
        {/* Filtros */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
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
        
        {/* Stats */}
        <div className="stats-row" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: '12px' }}>
          <div className="stat-card">
            <div className="stat-ri"><span className="stat-label">Ingresos</span></div>
            <div className="stat-value" style={{ color: 'var(--hc-green)' }}>{formatMoney(stats.ingresos)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-ri"><span className="stat-label">Gastos</span></div>
            <div className="stat-value" style={{ color: 'var(--hc-red)' }}>{formatMoney(stats.gastos)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-ri"><span className="stat-label">Balance</span></div>
            <div className="stat-value" style={{ color: stats.balance >= 0 ? 'var(--hc-green)' : 'var(--hc-red)' }}>
              {stats.balance >= 0 ? '+' : ''}{formatMoney(stats.balance)}
            </div>
          </div>
        </div>
        
        {/* Lista de movimientos */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
            <div className="tabs" id="mov-tabs">
              <button className={`tab ${tipoFilter === 'todos' ? 'active' : ''}`} onClick={() => setTipoFilter('todos')}>Todos</button>
              <button className={`tab ${tipoFilter === 'ingreso' ? 'active' : ''}`} onClick={() => setTipoFilter('ingreso')}>Ingresos</button>
              <button className={`tab ${tipoFilter === 'gasto' ? 'active' : ''}`} onClick={() => setTipoFilter('gasto')}>Gastos</button>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--hc-gray)' }}>{movimientos.length} registros</span>
          </div>
          
          {loading ? (
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th><Skeleton width={50} height={12} /></th>
                    <th><Skeleton width={100} height={12} /></th>
                    <th><Skeleton width={130} height={12} /></th>
                    <th><Skeleton width={50} height={12} /></th>
                    <th><Skeleton width={80} height={12} /></th>
                    {canEdit && <th><Skeleton width={40} height={12} /></th>}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5, 6].map(row => (
                    <tr key={row}>
                      <td><Skeleton width={70} height={12} /></td>
                      <td><Skeleton width={110} height={14} /></td>
                      <td><Skeleton width={`${55 + (row % 4) * 15}%`} height={12} /></td>
                      <td><Skeleton width={55} height={18} borderRadius={10} /></td>
                      <td><Skeleton width={80} height={14} /></td>
                      {canEdit && (
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <Skeleton width={26} height={26} borderRadius={4} />
                            <Skeleton width={26} height={26} borderRadius={4} />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : error ? (
            <div className="empty" style={{ color: 'var(--hc-red)' }}>⚠️ {error}</div>
          ) : movimientos.length === 0 ? (
            <div className="empty"><div className="empty-icon">💸</div><p>Sin movimientos en {MESES[selectedMonth]} {selectedYear}</p></div>
          ) : (
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cuenta</th>
                    <th>Descripción</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    {canEdit && <th>Acc.</th>}
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map(mov => (
                    <tr key={mov.id}>
                      <td style={{ color: 'var(--hc-gray)', fontSize: '11px' }}>{mov.fecha}</td>
                      <td style={{ fontWeight: 600 }}>{getCuentaNombre(mov.cuentaId)}</td>
                      <td style={{ color: 'var(--hc-gray)' }}>
                        {mov.descripcion || '—'}
                        {mov.origen && <span className="badge badge-i" style={{ marginLeft: '5px' }}>cobro</span>}
                      </td>
                      <td><span className={`badge ${mov.tipo === 'ingreso' ? 'badge-i' : 'badge-g'}`}>{mov.tipo}</span></td>
                      <td className={mov.tipo === 'ingreso' ? 'amount-pos' : 'amount-neg'}>
                        {mov.tipo === 'ingreso' ? '+' : '-'}{formatMoney(mov.monto)}
                      </td>
                      {canEdit && (
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {!mov.origen && (
                              <>
                                <button className="btn btn-outline btn-sm" onClick={() => openEditModal(mov)}>✏️</button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(mov.id)}>🗑️</button>
                              </>
                            )}
                            {mov.origen && <span style={{ fontSize: '10px', color: 'var(--hc-gray)' }}>auto</span>}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Modal para crear/editar movimiento */}
      {modalOpen && (
        <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal">
            <div className="modal-head">
              <h3>{editMovimiento ? 'Editar Movimiento' : 'Nuevo Movimiento'}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="fgroup">
                <label className="lbl">Tipo</label>
                <div className="tabs">
                  <button type="button" className={`tab ${formData.tipo === 'ingreso' ? 'active' : ''}`} onClick={() => handleFormChange('tipo', 'ingreso')}>↑ Ingreso</button>
                  <button type="button" className={`tab ${formData.tipo === 'gasto' ? 'active' : ''}`} onClick={() => handleFormChange('tipo', 'gasto')}>↓ Gasto</button>
                </div>
              </div>
              <div className="fgroup">
                <label className="lbl">Cuenta</label>
                <select className="inp" value={formData.cuentaId} onChange={e => handleFormChange('cuentaId', e.target.value)} required>
                  <option value="">Seleccionar...</option>
                  {cuentas.filter(c => c.tipo === formData.tipo).map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="fgroup">
                <label className="lbl">Monto</label>
                <input className="inp" type="number" step="0.01" min="0" value={formData.monto} onChange={e => handleFormChange('monto', e.target.value)} required />
              </div>
              <div className="fgroup">
                <label className="lbl">Fecha</label>
                <input className="inp" type="date" value={formData.fecha} onChange={e => handleFormChange('fecha', e.target.value)} required />
              </div>
              <div className="fgroup">
                <label className="lbl">Descripción (opcional)</label>
                <input className="inp" value={formData.descripcion} onChange={e => handleFormChange('descripcion', e.target.value)} placeholder="Descripción..." />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-green" disabled={submitting}>
                  {submitting ? <span className="spin"></span> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}