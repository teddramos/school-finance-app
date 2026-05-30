// components/MovimientosList.tsx
'use client';

import { useEffect, useState } from 'react';

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
  pagoId?: number;
}

interface MovimientosListProps {
  selectedYear: number;
  selectedMonth: number;
  onEdit?: (movimiento: Movimiento) => void;
  onDelete?: (id: number) => void;
  canEdit?: boolean;
  refreshTrigger?: number;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const formatMoney = (value: number): string => {
  return `RD$${value.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function MovimientosList({
  selectedYear,
  selectedMonth,
  onEdit,
  onDelete,
  canEdit = false,
  refreshTrigger = 0,
}: MovimientosListProps) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [tipoFilter, setTipoFilter] = useState<'todos' | 'ingreso' | 'gasto'>('todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCuentas = async () => {
    try {
      const res = await fetch('/api/cuentas', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Error al cargar cuentas');
      const data = await res.json();
      setCuentas(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMovimientos = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/movimientos?year=${selectedYear}&month=${selectedMonth + 1}&tipo=${tipoFilter}`;
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Error al cargar movimientos');
      const data = await res.json();
      setMovimientos(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCuentas();
  }, []);

  useEffect(() => {
    loadMovimientos();
  }, [selectedYear, selectedMonth, tipoFilter, refreshTrigger]);

  const getCuentaNombre = (cuentaId: number) => {
    const cuenta = cuentas.find(c => c.id === cuentaId);
    return cuenta ? cuenta.nombre : '—';
  };

  const stats = {
    ingresos: movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0),
    gastos: movimientos.filter(m => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0),
  };
  const balance = stats.ingresos - stats.gastos;

  return (
    <div>
      {/* Estadísticas resumidas */}
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
          <div className="stat-value" style={{ color: balance >= 0 ? 'var(--hc-green)' : 'var(--hc-red)' }}>
            {balance >= 0 ? '+' : ''}{formatMoney(balance)}
          </div>
        </div>
      </div>

      {/* Lista de movimientos */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          <div className="tabs">
            <button className={`tab ${tipoFilter === 'todos' ? 'active' : ''}`} onClick={() => setTipoFilter('todos')}>Todos</button>
            <button className={`tab ${tipoFilter === 'ingreso' ? 'active' : ''}`} onClick={() => setTipoFilter('ingreso')}>Ingresos</button>
            <button className={`tab ${tipoFilter === 'gasto' ? 'active' : ''}`} onClick={() => setTipoFilter('gasto')}>Gastos</button>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--hc-gray)' }}>{movimientos.length} registros</span>
        </div>

        {loading ? (
          <div className="empty"><div className="spin"></div> Cargando...</div>
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
                          {!mov.origen && onEdit && (
                            <button className="btn btn-outline btn-sm" onClick={() => onEdit(mov)}>✏️</button>
                          )}
                          {!mov.origen && onDelete && (
                            <button className="btn btn-danger btn-sm" onClick={() => onDelete(mov.id)}>🗑️</button>
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
  );
}