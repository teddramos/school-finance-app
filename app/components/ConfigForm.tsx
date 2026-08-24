'use client';

import { useEffect, useState } from 'react';
import Skeleton from './skeletons/Skeleton';

interface ConfigData {
  nombre: string;
  rif: string;
  telefono: string;
  email: string;
  direccion: string;
  director: string;
  tarifa: number;
}

interface ConfigFormProps {
  onSave?: () => void;
}

export default function ConfigForm({ onSave }: ConfigFormProps) {
  const [config, setConfig] = useState<ConfigData>({
    nombre: '',
    rif: '',
    telefono: '',
    email: '',
    direccion: '',
    director: '',
    tarifa: 1500,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const cid = localStorage.getItem('selectedColegioId');
      const cidParam = cid ? `?colegioId=${cid}` : '';
      const res = await fetch(`/api/config${cidParam}`, { credentials: 'same-origin', headers });
      if (!res.ok) throw new Error('Error al cargar configuración');
      const data = await res.json();
      setConfig(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: name === 'tarifa' ? parseFloat(value) || 0 : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const cid = localStorage.getItem('selectedColegioId');
      const cidParam = cid ? `?colegioId=${cid}` : '';
      const res = await fetch(`/api/config${cidParam}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers,
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error('Error al guardar configuración');
      setSuccess(true);
      if (onSave) onSave();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Skeleton variant="title" width={200} height={18} />
        <div className="cfg-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="fgroup" style={{ margin: 0 }}>
              <Skeleton width={110} height={12} style={{ marginBottom: 6 }} />
              <Skeleton variant="input" height={38} />
            </div>
          ))}
        </div>
        <div className="fgroup" style={{ margin: 0 }}>
          <Skeleton width={80} height={12} style={{ marginBottom: 6 }} />
          <Skeleton variant="input" height={38} />
        </div>
        <div className="fgroup" style={{ margin: 0 }}>
          <Skeleton width={90} height={12} style={{ marginBottom: 6 }} />
          <Skeleton variant="input" height={38} />
        </div>
        <div className="fgroup" style={{ margin: 0 }}>
          <Skeleton width={180} height={12} style={{ marginBottom: 6 }} />
          <Skeleton variant="input" height={38} />
        </div>
        <Skeleton variant="btn" width="100%" height={44} style={{ marginTop: 10 }} />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">🏫 Información del Colegio</div>
      <form onSubmit={handleSubmit}>
        <div className="cfg-grid">
          <div className="fgroup">
            <label className="lbl">Nombre del Colegio</label>
            <input className="inp" name="nombre" value={config.nombre} onChange={handleChange} required />
          </div>
          <div className="fgroup">
            <label className="lbl">RIF / RNC</label>
            <input className="inp" name="rif" value={config.rif} onChange={handleChange} />
          </div>
          <div className="fgroup">
            <label className="lbl">Teléfono</label>
            <input className="inp" name="telefono" value={config.telefono} onChange={handleChange} inputMode="tel" />
          </div>
          <div className="fgroup">
            <label className="lbl">Email</label>
            <input className="inp" name="email" type="email" value={config.email} onChange={handleChange} />
          </div>
        </div>
        <div className="fgroup">
          <label className="lbl">Dirección</label>
          <input className="inp" name="direccion" value={config.direccion} onChange={handleChange} />
        </div>
        <div className="fgroup">
          <label className="lbl">Director(a)</label>
          <input className="inp" name="director" value={config.director} onChange={handleChange} />
        </div>
        <div className="fgroup">
          <label className="lbl">Tarifa Mensualidad por Hijo (DOP)</label>
          <input className="inp" name="tarifa" type="number" min="0" step="1" value={config.tarifa} onChange={handleChange} />
        </div>
        {error && <div style={{ color: 'var(--hc-red)', marginBottom: '12px', fontSize: '13px' }}>⚠️ {error}</div>}
        {success && <div style={{ color: 'var(--hc-green)', marginBottom: '12px', fontSize: '13px' }}>✓ Configuración guardada correctamente</div>}
        <button type="submit" className="btn btn-green btn-w" disabled={saving}>
          {saving ? <span className="spin"></span> : '💾 Guardar Configuración'}
        </button>
      </form>
    </div>
  );
}