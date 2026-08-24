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

interface ColegioItem {
  id: number;
  nombre: string;
  rif?: string;
  telefono?: string;
}

interface ColegioForm {
  nombre: string;
  rif: string;
  telefono: string;
  email: string;
  direccion: string;
  director: string;
  tarifa: string;
}

const COLEGIO_FORM_VACIO: ColegioForm = {
  nombre: '',
  rif: '',
  telefono: '',
  email: '',
  direccion: '',
  director: '',
  tarifa: '1500',
};

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
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Gestión de colegios (superadmin)
  const [colegios, setColegios] = useState<ColegioItem[]>([]);
  const [colegioModalOpen, setColegioModalOpen] = useState(false);
  const [colegioForm, setColegioForm] = useState<ColegioForm>(COLEGIO_FORM_VACIO);
  const [savingColegio, setSavingColegio] = useState(false);

  // Verificar permisos (solo admin puede configurar; superadmin también gestiona colegios)
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
        } else if (data && data.user.role === 'superadmin') {
          setIsAdmin(true);
          setIsSuperAdmin(true);
          loadConfig();
          loadColegios();
        } else {
          router.push('/dashboard');
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const authHeaders = (): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

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

  const loadColegios = async () => {
    try {
      const res = await fetch('/api/colegios', { credentials: 'same-origin', headers: authHeaders() });
      if (!res.ok) throw new Error('Error al cargar colegios');
      const data = await res.json();
      setColegios(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err.message);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: name === 'tarifa' ? parseFloat(value) || 0 : value }));
  };

  const handleColegioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setColegioForm(prev => ({ ...prev, [name]: value }));
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

  // Crear un nuevo colegio (solo superadmin)
  const handleSubmitColegio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colegioForm.nombre.trim()) {
      alert('El nombre del colegio es obligatorio');
      return;
    }
    setSavingColegio(true);
    try {
      const res = await fetch('/api/colegios', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: colegioForm.nombre.trim(),
          rif: colegioForm.rif,
          telefono: colegioForm.telefono,
          email: colegioForm.email,
          direccion: colegioForm.direccion,
          director: colegioForm.director,
          tarifa: parseFloat(colegioForm.tarifa) || 1500,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al crear colegio');
      }
      setColegioModalOpen(false);
      setColegioForm(COLEGIO_FORM_VACIO);
      loadColegios();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingColegio(false);
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

        {/* Gestión de colegios (solo superadmin) */}
        {isSuperAdmin && (
          <div className="card" style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              <div className="card-title" style={{ marginBottom: 0 }}>🌐 Colegios del Sistema</div>
              <button className="btn btn-gold" onClick={() => { setColegioForm(COLEGIO_FORM_VACIO); setColegioModalOpen(true); }}>
                + Nuevo Colegio
              </button>
            </div>
            {colegios.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--hc-gray)' }}>No hay colegios registrados.</p>
            ) : (
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Colegio</th>
                      <th>RIF / RNC</th>
                      <th>Teléfono</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colegios.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>🏫 {c.nombre}</td>
                        <td>{c.rif || '—'}</td>
                        <td>{c.telefono || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal para crear colegio */}
      {colegioModalOpen && (
        <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) setColegioModalOpen(false); }}>
          <div className="modal modal-lg">
            <div className="modal-head">
              <h3>Nuevo Colegio</h3>
              <button className="modal-close" onClick={() => setColegioModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmitColegio}>
              <div className="two-col">
                <div className="fgroup">
                  <label className="lbl">Nombre del Colegio *</label>
                  <input className="inp" name="nombre" value={colegioForm.nombre} onChange={handleColegioChange} required />
                </div>
                <div className="fgroup">
                  <label className="lbl">RIF / RNC</label>
                  <input className="inp" name="rif" value={colegioForm.rif} onChange={handleColegioChange} />
                </div>
              </div>
              <div className="two-col">
                <div className="fgroup">
                  <label className="lbl">Teléfono</label>
                  <input className="inp" name="telefono" value={colegioForm.telefono} onChange={handleColegioChange} inputMode="tel" />
                </div>
                <div className="fgroup">
                  <label className="lbl">Email</label>
                  <input className="inp" name="email" type="email" value={colegioForm.email} onChange={handleColegioChange} />
                </div>
              </div>
              <div className="fgroup">
                <label className="lbl">Dirección</label>
                <input className="inp" name="direccion" value={colegioForm.direccion} onChange={handleColegioChange} />
              </div>
              <div className="two-col">
                <div className="fgroup">
                  <label className="lbl">Director(a)</label>
                  <input className="inp" name="director" value={colegioForm.director} onChange={handleColegioChange} />
                </div>
                <div className="fgroup">
                  <label className="lbl">Tarifa Mensualidad por Hijo (DOP)</label>
                  <input className="inp" name="tarifa" type="number" min="0" step="1" value={colegioForm.tarifa} onChange={handleColegioChange} />
                </div>
              </div>
              <small style={{ fontSize: '11px', color: 'var(--hc-gray)', display: 'block', marginBottom: '8px' }}>
                Se crearán las cuentas contables por defecto para el nuevo colegio.
              </small>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setColegioModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-green" disabled={savingColegio}>
                  {savingColegio ? <span className="spin"></span> : 'Crear Colegio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
