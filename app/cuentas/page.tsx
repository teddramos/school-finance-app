'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SkeletonCuentas from '@/components/skeletons/SkeletonCuentas';
import Skeleton from '@/components/skeletons/Skeleton';

// Tipos
interface Cuenta {
  id: number;
  nombre: string;
  tipo: 'ingreso' | 'gasto';
  descripcion?: string;
}

export default function CuentasPage() {
  const router = useRouter();
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTipo, setFilterTipo] = useState<'todos' | 'ingreso' | 'gasto'>('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editCuenta, setEditCuenta] = useState<Cuenta | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'ingreso' as 'ingreso' | 'gasto',
    descripcion: ''
  });
  const [submitting, setSubmitting] = useState(false);
  
  // Verificar permisos (solo admin puede administrar cuentas)
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch('/api/auth/me', { credentials: 'same-origin', headers })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.user.role === 'admin') {
          setIsAdmin(true);
        } else {
          // Si no es admin, redirigir al dashboard
          router.push('/dashboard');
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);
  
  const loadCuentas = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/cuentas', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Error al cargar cuentas');
      const data = await res.json();
      setCuentas(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (isAdmin) loadCuentas();
  }, [isAdmin]);
  
  const filteredCuentas = cuentas.filter(c => filterTipo === 'todos' || c.tipo === filterTipo);
  
  const openCreateModal = () => {
    setEditCuenta(null);
    setFormData({
      nombre: '',
      tipo: 'ingreso',
      descripcion: ''
    });
    setModalOpen(true);
  };
  
  const openEditModal = (cuenta: Cuenta) => {
    setEditCuenta(cuenta);
    setFormData({
      nombre: cuenta.nombre,
      tipo: cuenta.tipo,
      descripcion: cuenta.descripcion || ''
    });
    setModalOpen(true);
  };
  
  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      alert('El nombre es obligatorio');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        nombre: formData.nombre.trim(),
        tipo: formData.tipo,
        descripcion: formData.descripcion.trim() || undefined
      };
      let res;
      if (editCuenta) {
        res = await fetch(`/api/cuentas/${editCuenta.id}`, {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/cuentas', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      if (!res.ok) throw new Error('Error al guardar');
      setModalOpen(false);
      loadCuentas();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta cuenta? Se eliminarán también los movimientos asociados.')) return;
    try {
      const res = await fetch(`/api/cuentas/${id}`, { method: 'DELETE', credentials: 'same-origin' });
      if (!res.ok) throw new Error('Error al eliminar');
      loadCuentas();
    } catch (err: any) {
      alert(err.message);
    }
  };
  
  const formatTipo = (tipo: string) => tipo === 'ingreso' ? '↑ Ingreso' : '↓ Gasto';
  
  if (!isAdmin) {
    return <SkeletonCuentas />;
  }
  
  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <h2>Cuentas</h2>
          <p>Cuentas contables</p>
        </div>
        <button className="btn btn-gold" onClick={openCreateModal}>
          + Nueva
        </button>
      </div>
      <div className="page-wrap">
        {/* Filtros */}
        <div className="tabs">
          <button className={`tab ${filterTipo === 'todos' ? 'active' : ''}`} onClick={() => setFilterTipo('todos')}>Todas</button>
          <button className={`tab ${filterTipo === 'ingreso' ? 'active' : ''}`} onClick={() => setFilterTipo('ingreso')}>Ingresos</button>
          <button className={`tab ${filterTipo === 'gasto' ? 'active' : ''}`} onClick={() => setFilterTipo('gasto')}>Gastos</button>
        </div>
        
        {/* Lista de cuentas en formato grid (tres columnas) */}
        {loading ? (
          <div className="three-col" style={{ marginTop: '12px' }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 100 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <Skeleton width={110} height={16} style={{ marginBottom: 6 }} />
                    <Skeleton width={70} height={18} borderRadius={10} />
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <Skeleton width={26} height={26} borderRadius={4} />
                    <Skeleton width={26} height={26} borderRadius={4} />
                  </div>
                </div>
                <Skeleton width="85%" height={12} style={{ marginTop: 4 }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="empty" style={{ color: 'var(--hc-red)' }}>⚠️ {error}</div>
        ) : filteredCuentas.length === 0 ? (
          <div className="empty"><div className="empty-icon">📋</div><p>No hay cuentas</p></div>
        ) : (
          <div className="three-col" style={{ marginTop: '12px' }}>
            {filteredCuentas.map(cuenta => (
              <div key={cuenta.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '3px' }}>{cuenta.nombre}</div>
                    <span className={`badge ${cuenta.tipo === 'ingreso' ? 'badge-i' : 'badge-g'}`}>
                      {formatTipo(cuenta.tipo)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => openEditModal(cuenta)}>✏️</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(cuenta.id)}>🗑️</button>
                  </div>
                </div>
                {cuenta.descripcion && (
                  <p style={{ fontSize: '11px', color: 'var(--hc-gray)', lineHeight: '1.5' }}>{cuenta.descripcion}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Modal para crear/editar cuenta */}
      {modalOpen && (
        <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal">
            <div className="modal-head">
              <h3>{editCuenta ? 'Editar Cuenta' : 'Nueva Cuenta'}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="fgroup">
                <label className="lbl">Nombre</label>
                <input className="inp" value={formData.nombre} onChange={e => handleFormChange('nombre', e.target.value)} placeholder="Nombre de la cuenta" required />
              </div>
              <div className="fgroup">
                <label className="lbl">Tipo</label>
                <div className="tabs">
                  <button type="button" className={`tab ${formData.tipo === 'ingreso' ? 'active' : ''}`} onClick={() => handleFormChange('tipo', 'ingreso')}>↑ Ingreso</button>
                  <button type="button" className={`tab ${formData.tipo === 'gasto' ? 'active' : ''}`} onClick={() => handleFormChange('tipo', 'gasto')}>↓ Gasto</button>
                </div>
              </div>
              <div className="fgroup">
                <label className="lbl">Descripción</label>
                <input className="inp" value={formData.descripcion} onChange={e => handleFormChange('descripcion', e.target.value)} placeholder="Descripción opcional..." />
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