// components/modals/PadreModal.tsx
'use client';

import { useEffect, useState } from 'react';

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

interface PadreModalProps {
  isOpen: boolean;
  padre?: Padre | null;
  onClose: () => void;
  onSave: () => void;
}

export default function PadreModal({ isOpen, padre, onClose, onSave }: PadreModalProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    cedula: '',
    telefono: '',
    email: '',
    direccion: '',
  });
  const [hijos, setHijos] = useState<Hijo[]>([]);
  const [descuentos, setDescuentos] = useState<DescuentoPerfil[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Rellenar formulario si estamos editando
  useEffect(() => {
    if (padre) {
      setFormData({
        nombre: padre.nombre,
        cedula: padre.cedula,
        telefono: padre.telefono,
        email: padre.email,
        direccion: padre.direccion,
      });
      setHijos(padre.hijos.map(h => ({ ...h, id: h.id || Date.now() + Math.random() })));
      setDescuentos(padre.descuentos.map(d => ({ ...d, id: d.id || Date.now() + Math.random() })));
    } else {
      setFormData({
        nombre: '',
        cedula: '',
        telefono: '',
        email: '',
        direccion: '',
      });
      setHijos([]);
      setDescuentos([]);
    }
    setError('');
  }, [padre, isOpen]);

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Hijos handlers
  const addHijo = () => {
    setHijos([...hijos, { nombre: '', grado: '' }]);
  };

  const updateHijo = (idx: number, field: keyof Hijo, value: string) => {
    const updated = [...hijos];
    updated[idx] = { ...updated[idx], [field]: value };
    setHijos(updated);
  };

  const removeHijo = (idx: number) => {
    setHijos(hijos.filter((_, i) => i !== idx));
  };

  // Descuentos handlers
  const addDescuento = () => {
    setDescuentos([...descuentos, { nombre: '', tipo: 'porcentaje', valor: 0, activo: true }]);
  };

  const updateDescuento = (idx: number, field: keyof DescuentoPerfil, value: any) => {
    const updated = [...descuentos];
    updated[idx] = { ...updated[idx], [field]: value };
    setDescuentos(updated);
  };

  const removeDescuento = (idx: number) => {
    setDescuentos(descuentos.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim() || !formData.cedula.trim()) {
      setError('Nombre y cédula son obligatorios');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...formData,
        hijos: hijos.filter(h => h.nombre.trim()),
        descuentos: descuentos,
      };
      let res;
      if (padre) {
        res = await fetch(`/api/padres/${padre.id}`, {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', ...(typeof window !== 'undefined' && localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/padres', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', ...(typeof window !== 'undefined' && localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) },
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
      <div className="modal modal-lg">
        <div className="modal-head">
          <h3>{padre ? 'Editar Padre / Tutor' : 'Nuevo Padre / Tutor'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="cfg-grid">
            <div className="fgroup">
              <label className="lbl">Nombre Completo</label>
              <input
                className="inp"
                value={formData.nombre}
                onChange={e => handleFieldChange('nombre', e.target.value)}
                required
              />
            </div>
            <div className="fgroup">
              <label className="lbl">Cédula / RNC</label>
              <input
                className="inp"
                value={formData.cedula}
                onChange={e => handleFieldChange('cedula', e.target.value)}
                required
              />
            </div>
            <div className="fgroup">
              <label className="lbl">Teléfono</label>
              <input
                className="inp"
                value={formData.telefono}
                onChange={e => handleFieldChange('telefono', e.target.value)}
              />
            </div>
            <div className="fgroup">
              <label className="lbl">Email</label>
              <input
                className="inp"
                type="email"
                value={formData.email}
                onChange={e => handleFieldChange('email', e.target.value)}
              />
            </div>
          </div>
          <div className="fgroup">
            <label className="lbl">Dirección</label>
            <input
              className="inp"
              value={formData.direccion}
              onChange={e => handleFieldChange('direccion', e.target.value)}
            />
          </div>

          {/* Sección hijos */}
          <div style={{ margin: '12px 0', padding: '12px 0', borderTop: '1px solid var(--hc-gray-l)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="lbl" style={{ margin: 0 }}>Hijos Matriculados</label>
              <button type="button" className="btn btn-sm btn-green" onClick={addHijo}>+ Agregar Hijo</button>
            </div>
            <div id="hijos-fields">
              {hijos.length === 0 && (
                <p style={{ fontSize: '11px', color: 'var(--hc-gray)', marginBottom: '6px' }}>Sin hijos agregados</p>
              )}
              {hijos.map((hijo, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                  <input
                    className="inp"
                    placeholder="Nombre del hijo"
                    value={hijo.nombre}
                    onChange={e => updateHijo(idx, 'nombre', e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <input
                    className="inp"
                    placeholder="Grado"
                    value={hijo.grado}
                    onChange={e => updateHijo(idx, 'grado', e.target.value)}
                    style={{ width: '110px' }}
                  />
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeHijo(idx)}>×</button>
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
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: '#e8f5ee', color: 'var(--hc-green)', border: '1px solid #c5e5ce' }}
                onClick={addDescuento}
              >
                + Descuento
              </button>
            </div>
            <div>
              {descuentos.length === 0 && (
                <p style={{ fontSize: '11px', color: 'var(--hc-gray)', fontStyle: 'italic' }}>Sin descuentos configurados</p>
              )}
              {descuentos.map((desc, idx) => (
                <div key={idx} className="desc-perfil-row">
                  <input
                    className="inp"
                    placeholder="Nombre descuento"
                    value={desc.nombre}
                    onChange={e => updateDescuento(idx, 'nombre', e.target.value)}
                    style={{ flex: 1, fontSize: '12px', padding: '5px 8px' }}
                  />
                  <select
                    className="inp"
                    value={desc.tipo}
                    onChange={e => updateDescuento(idx, 'tipo', e.target.value as 'porcentaje' | 'fijo')}
                    style={{ width: '80px', fontSize: '12px' }}
                  >
                    <option value="porcentaje">%</option>
                    <option value="fijo">Fijo</option>
                  </select>
                  <input
                    className="inp"
                    type="number"
                    min="0"
                    value={desc.valor}
                    onChange={e => updateDescuento(idx, 'valor', parseFloat(e.target.value) || 0)}
                    style={{ width: '80px', fontSize: '12px' }}
                    placeholder={desc.tipo === 'porcentaje' ? '%' : 'DOP'}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', whiteSpace: 'nowrap' }}>
                    <input
                      type="checkbox"
                      checked={desc.activo}
                      onChange={e => updateDescuento(idx, 'activo', e.target.checked)}
                    /> Activo
                  </label>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeDescuento(idx)}>×</button>
                </div>
              ))}
            </div>
          </div>

          {error && <div style={{ color: 'var(--hc-red)', marginBottom: '12px', fontSize: '13px' }}>⚠️ {error}</div>}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
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