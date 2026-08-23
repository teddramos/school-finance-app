'use client';

import { useEffect, useState } from 'react';
import Skeleton from './skeletons/Skeleton';

interface Cuenta {
  id: number;
  nombre: string;
  tipo: 'ingreso' | 'gasto';
  descripcion?: string;
}

interface CuentasListProps {
  onEdit?: (cuenta: Cuenta) => void;
  onDelete?: (id: number) => void;
  canEdit?: boolean;
  refreshTrigger?: number;
}

export default function CuentasList({ onEdit, onDelete, canEdit = false, refreshTrigger = 0 }: CuentasListProps) {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [filterTipo, setFilterTipo] = useState<'todos' | 'ingreso' | 'gasto'>('todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    loadCuentas();
  }, [refreshTrigger]);

  const filteredCuentas = cuentas.filter(c => filterTipo === 'todos' || c.tipo === filterTipo);
  const formatTipo = (tipo: string) => tipo === 'ingreso' ? '↑ Ingreso' : '↓ Gasto';

  if (loading) {
    return (
      <div>
        <div className="tabs">
          <Skeleton width={60} height={30} borderRadius={6} style={{ marginRight: 6 }} />
          <Skeleton width={75} height={30} borderRadius={6} style={{ marginRight: 6 }} />
          <Skeleton width={65} height={30} borderRadius={6} />
        </div>
        <div className="three-col" style={{ marginTop: '12px' }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 90 }}>
              <Skeleton width={110} height={16} />
              <Skeleton width={60} height={18} borderRadius={10} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="empty" style={{ color: 'var(--hc-red)' }}>⚠️ {error}</div>;
  }

  return (
    <div>
      <div className="tabs">
        <button className={`tab ${filterTipo === 'todos' ? 'active' : ''}`} onClick={() => setFilterTipo('todos')}>Todas</button>
        <button className={`tab ${filterTipo === 'ingreso' ? 'active' : ''}`} onClick={() => setFilterTipo('ingreso')}>Ingresos</button>
        <button className={`tab ${filterTipo === 'gasto' ? 'active' : ''}`} onClick={() => setFilterTipo('gasto')}>Gastos</button>
      </div>

      {filteredCuentas.length === 0 ? (
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
                {canEdit && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {onEdit && <button className="btn btn-outline btn-sm" onClick={() => onEdit(cuenta)}>✏️</button>}
                    {onDelete && <button className="btn btn-danger btn-sm" onClick={() => onDelete(cuenta.id)}>🗑️</button>}
                  </div>
                )}
              </div>
              {cuenta.descripcion && (
                <p style={{ fontSize: '11px', color: 'var(--hc-gray)', lineHeight: '1.5' }}>{cuenta.descripcion}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}