'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SkeletonConfiguracion from '@/components/skeletons/SkeletonConfiguracion';

interface ConfigData {
  nombre: string;
  rif: string;
  telefono: string;
  email: string;
  direccion: string;
  director: string;
  tarifa: number;
}

export default function ConfiguracionPage() {
  const router = useRouter();
  const [config, setConfig] = useState<ConfigData>({
    nombre: '',
    rif: '',
    telefono: '',
    email: '',
    direccion: '',
    director: '',
    tarifa: 1500
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Verificar permisos (solo admin puede configurar)
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch('/api/auth/me', { credentials: 'same-origin', headers })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.user.role === 'admin') {
          setIsAdmin(true);
          loadConfig();
        } else {
          router.push('/dashboard');
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/config', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Error al cargar configuración');
      const data = await res.json();
      setConfig(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
      const res = await fetch('/api/config', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!res.ok) throw new Error('Error al guardar configuración');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin || loading) return <SkeletonConfiguracion />;

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <h2>Configuración</h2>
          <p>Datos del colegio</p>
        </div>
      </div>
      <div className="page-wrap" style={{ maxWidth: '680px' }}>
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
      </div>
    </div>
  );
}