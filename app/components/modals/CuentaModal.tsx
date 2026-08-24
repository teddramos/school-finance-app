// components/modals/CuentaModal.tsx
'use client';

import { useEffect, useState } from 'react';

interface Cuenta {
  id: number;
  nombre: string;
  tipo: 'ingreso' | 'gasto';
  descripcion?: string;
}

interface CuentaModalProps {
  isOpen: boolean;
  cuenta?: Cuenta | null;
  onClose: () => void;
  onSave: () => void;
}

export default function CuentaModal({ isOpen, cuenta, onClose, onSave }: CuentaModalProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'ingreso' as 'ingreso' | 'gasto',
    descripcion: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Rellenar formulario si estamos editando
  useEffect(() => {
    if (cuenta) {
      setFormData({
        nombre: cuenta.nombre,
        tipo: cuenta.tipo,
        descripcion: cuenta.descripcion || '',
      });
    } else {
      setFormData({
        nombre: '',
        tipo: 'ingreso',
        descripcion: '',
      });
    }
    setError('');
  }, [cuenta, isOpen]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const cid = localStorage.getItem('selectedColegioId');
      const cidParam = cid ? `?colegioId=${cid}` : '';
      const payload = {
        nombre: formData.nombre.trim(),
        tipo: formData.tipo,
        descripcion: formData.descripcion.trim() || undefined,
      };
      let res;
      if (cuenta) {
        res = await fetch(`/api/cuentas/${cuenta.id}${cidParam}`, {
          method: 'PUT',
          credentials: 'same-origin',
          headers,
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/cuentas${cidParam}`, {
          method: 'POST',
          credentials: 'same-origin',
          headers,
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

  return (
    <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <h3>{cuenta ? 'Editar Cuenta' : 'Nueva Cuenta'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="fgroup">
            <label className="lbl">Nombre</label>
            <input
              className="inp"
              value={formData.nombre}
              onChange={e => handleChange('nombre', e.target.value)}
              placeholder="Nombre de la cuenta"
              required
            />
          </div>
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
            <label className="lbl">Descripción</label>
            <input
              className="inp"
              value={formData.descripcion}
              onChange={e => handleChange('descripcion', e.target.value)}
              placeholder="Descripción opcional..."
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