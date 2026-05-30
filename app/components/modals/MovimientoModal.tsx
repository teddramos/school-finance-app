// components/modals/MovimientoModal.tsx
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
}

interface MovimientoModalProps {
  isOpen: boolean;
  movimiento?: Movimiento | null;
  onClose: () => void;
  onSave: () => void;
}

export default function MovimientoModal({ isOpen, movimiento, onClose, onSave }: MovimientoModalProps) {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    tipo: 'ingreso' as 'ingreso' | 'gasto',
    cuentaId: '',
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    descripcion: '',
  });
  const [error, setError] = useState('');

  // Cargar cuentas cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      const fetchCuentas = async () => {
        try {
          const res = await fetch('/api/cuentas', { credentials: 'same-origin' });
          if (!res.ok) throw new Error('Error al cargar cuentas');
          const data = await res.json();
          setCuentas(data);
        } catch (err) {
          console.error(err);
        }
      };
      fetchCuentas();
    }
  }, [isOpen]);

  // Rellenar formulario si estamos editando
  useEffect(() => {
    if (movimiento) {
      setFormData({
        tipo: movimiento.tipo,
        cuentaId: movimiento.cuentaId.toString(),
        monto: movimiento.monto.toString(),
        fecha: movimiento.fecha,
        descripcion: movimiento.descripcion || '',
      });
    } else {
      setFormData({
        tipo: 'ingreso',
        cuentaId: '',
        monto: '',
        fecha: new Date().toISOString().split('T')[0],
        descripcion: '',
      });
    }
    setError('');
  }, [movimiento, isOpen]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cuentaId || !formData.monto || !formData.fecha) {
      setError('Complete todos los campos obligatorios');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        tipo: formData.tipo,
        cuentaId: parseInt(formData.cuentaId),
        monto: parseFloat(formData.monto),
        fecha: formData.fecha,
        descripcion: formData.descripcion,
        periodo: formData.fecha.slice(0, 7), // YYYY-MM
      };
      let res;
      if (movimiento) {
        res = await fetch(`/api/movimientos/${movimiento.id}`, {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/movimientos', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al guardar');
      }
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const filteredCuentas = cuentas.filter(c => c.tipo === formData.tipo);

  return (
    <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <h3>{movimiento ? 'Editar Movimiento' : 'Nuevo Movimiento'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="fgroup">
            <label className="lbl">Tipo</label>
            <div className="tabs">
              <button
                type="button"
                className={`tab ${formData.tipo === 'ingreso' ? 'active' : ''}`}
                onClick={() => handleChange('tipo', 'ingreso')}
              >
                ↑ Ingreso
              </button>
              <button
                type="button"
                className={`tab ${formData.tipo === 'gasto' ? 'active' : ''}`}
                onClick={() => handleChange('tipo', 'gasto')}
              >
                ↓ Gasto
              </button>
            </div>
          </div>
          <div className="fgroup">
            <label className="lbl">Cuenta</label>
            <select
              className="inp"
              value={formData.cuentaId}
              onChange={e => handleChange('cuentaId', e.target.value)}
              required
            >
              <option value="">Seleccionar...</option>
              {filteredCuentas.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div className="fgroup">
            <label className="lbl">Monto</label>
            <input
              className="inp"
              type="number"
              step="0.01"
              min="0"
              value={formData.monto}
              onChange={e => handleChange('monto', e.target.value)}
              required
            />
          </div>
          <div className="fgroup">
            <label className="lbl">Fecha</label>
            <input
              className="inp"
              type="date"
              value={formData.fecha}
              onChange={e => handleChange('fecha', e.target.value)}
              required
            />
          </div>
          <div className="fgroup">
            <label className="lbl">Descripción (opcional)</label>
            <input
              className="inp"
              value={formData.descripcion}
              onChange={e => handleChange('descripcion', e.target.value)}
              placeholder="Descripción..."
            />
          </div>
          {error && <div style={{ color: 'var(--hc-red)', marginBottom: '12px', fontSize: '13px' }}>⚠️ {error}</div>}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-green" disabled={submitting}>
              {submitting ? <span className="spin"></span> : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}