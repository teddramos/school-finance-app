'use client';

import { useEffect, useState, useRef } from 'react';
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
  email?: string;
  direccion?: string;
  director?: string;
  tarifa?: number;
  activo: boolean;
  logo_url?: string;
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

const LogoPlaceholder = ({ size = 40 }: { size?: number }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg, #e8f5ee 0%, #c5e5ce 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.45, flexShrink: 0,
    border: '2px solid #c5e5ce',
  }}>🏫</div>
);

export default function ConfiguracionPage() {
  const router = useRouter();
  const [config, setConfig] = useState<ConfigData>({
    nombre: '', rif: '', telefono: '', email: '', direccion: '', director: '', tarifa: 1500
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
  const [editandoColegioId, setEditandoColegioId] = useState<number | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

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
      setConfig(await res.json());
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const loadColegios = async () => {
    try {
      const res = await fetch('/api/colegios', { credentials: 'same-origin', headers: authHeaders() });
      if (!res.ok) throw new Error('Error al cargar colegios');
      const data = await res.json();
      setColegios(Array.isArray(data) ? data : []);
    } catch (err: any) { console.error(err.message); }
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
        method: 'PUT', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!res.ok) throw new Error('Error al guardar configuración');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const openCreateColegio = () => {
    setEditandoColegioId(null);
    setColegioForm(COLEGIO_FORM_VACIO);
    setLogoPreview(null);
    setColegioModalOpen(true);
  };

  const openEditColegio = (c: ColegioItem) => {
    setEditandoColegioId(c.id);
    setColegioForm({
      nombre: c.nombre, rif: c.rif || '', telefono: c.telefono || '',
      email: c.email || '', direccion: c.direccion || '', director: c.director || '',
      tarifa: String(c.tarifa || 1500),
    });
    setLogoPreview(c.logo_url || null);
    setColegioModalOpen(true);
  };

  const handleSubmitColegio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colegioForm.nombre.trim()) { alert('El nombre del colegio es obligatorio'); return; }
    setSavingColegio(true);
    try {
      const isEdit = editandoColegioId !== null;
      const url = isEdit ? `/api/colegios?id=${editandoColegioId}` : '/api/colegios';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: colegioForm.nombre.trim(),
          rif: colegioForm.rif, telefono: colegioForm.telefono,
          email: colegioForm.email, direccion: colegioForm.direccion,
          director: colegioForm.director,
          tarifa: parseFloat(colegioForm.tarifa) || 1500,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Error al ${isEdit ? 'actualizar' : 'crear'} colegio`);
      }
      // If creating and there's a logo preview, upload it
      if (!isEdit && logoPreview) {
        const nuevo = await res.json();
        await uploadLogoToServer(nuevo.id, logoPreview);
      }
      setColegioModalOpen(false);
      setEditandoColegioId(null);
      setLogoPreview(null);
      loadColegios();
    } catch (err: any) { alert(err.message); }
    finally { setSavingColegio(false); }
  };

  const toggleActivo = async (c: ColegioItem) => {
    const newActivo = !c.activo;
    const label = newActivo ? 'activar' : 'desactivar';
    if (!confirm(`¿Seguro que desea ${label} "${c.nombre}"?`)) return;
    try {
      const res = await fetch(`/api/colegios?id=${c.id}`, {
        method: 'PUT', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ activo: newActivo }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      loadColegios();
    } catch (err: any) { alert(err.message); }
  };

  const uploadLogoToServer = async (colegioId: number, dataUri: string) => {
    try {
      const res = await fetch(dataUri);
      const blob = await res.blob();
      const ext = blob.type.includes('png') ? 'png' : blob.type.includes('svg') ? 'svg' : blob.type.includes('webp') ? 'webp' : 'jpg';
      const file = new File([blob], `logo.${ext}`, { type: blob.type });
      const fd = new FormData();
      fd.append('logo', file);
      await fetch(`/api/colegios/logo?id=${colegioId}`, {
        method: 'POST', credentials: 'same-origin', headers: authHeaders(), body: fd,
      });
    } catch (err) { console.error('Error uploading logo', err); }
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('El logo no puede exceder 2 MB'); return; }
    if (!['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(file.type)) {
      alert('Formato no soportado. Use PNG, JPG, SVG o WEBP.'); return;
    }
    // If editing, upload immediately
    if (editandoColegioId) {
      setUploadingLogo(true);
      try {
        const fd = new FormData();
        fd.append('logo', file);
        const res = await fetch(`/api/colegios/logo?id=${editandoColegioId}`, {
          method: 'POST', credentials: 'same-origin', headers: authHeaders(), body: fd,
        });
        if (!res.ok) throw new Error('Error al subir logo');
        const data = await res.json();
        setLogoPreview(data.logo_url);
        loadColegios();
      } catch (err: any) { alert(err.message); }
      finally { setUploadingLogo(false); }
    } else {
      // Preview only, upload on save
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const removeLogo = async () => {
    if (editandoColegioId) {
      if (!confirm('¿Eliminar el logo de este colegio?')) return;
      try {
        await fetch(`/api/colegios/logo?id=${editandoColegioId}`, {
          method: 'DELETE', credentials: 'same-origin', headers: authHeaders(),
        });
        setLogoPreview(null);
        loadColegios();
      } catch (err) { console.error(err); }
    } else {
      setLogoPreview(null);
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

        {isSuperAdmin && (
          <div className="card" style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              <div className="card-title" style={{ marginBottom: 0 }}>🌐 Colegios del Sistema</div>
              <button className="btn btn-gold" onClick={openCreateColegio}>+ Nuevo Colegio</button>
            </div>
            {colegios.length === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--hc-gray)' }}>No hay colegios registrados.</p>
            ) : (
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '44px' }}></th>
                      <th>Colegio</th>
                      <th>RIF / RNC</th>
                      <th>Teléfono</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colegios.map(c => (
                      <tr key={c.id} style={{ opacity: c.activo ? 1 : 0.6 }}>
                        <td style={{ textAlign: 'center' }}>
                          {c.logo_url
                            ? <img src={c.logo_url} alt={c.nombre} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e8f5ee' }} />
                            : <LogoPlaceholder size={36} />
                          }
                        </td>
                        <td style={{ fontWeight: 600 }}>{c.nombre}</td>
                        <td>{c.rif || '—'}</td>
                        <td>{c.telefono || '—'}</td>
                        <td>
                          <span style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 700,
                            background: c.activo ? '#e8f5ee' : '#ffebee', color: c.activo ? '#1b5e20' : '#c62828',
                          }}>
                            {c.activo ? '✅ Activo' : '⛔ Inactivo'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap' }}>
                            <button className="btn btn-outline btn-sm" title="Editar colegio" onClick={() => openEditColegio(c)}>✏️</button>
                            <button
                              className="btn btn-sm"
                              title={c.activo ? 'Desactivar' : 'Activar'}
                              onClick={() => toggleActivo(c)}
                              style={{
                                background: c.activo ? '#ffebee' : '#e8f5ee',
                                color: c.activo ? '#c62828' : '#1b5e20',
                                border: `1px solid ${c.activo ? '#ffcdd2' : '#c8e6c9'}`,
                              }}
                            >
                              {c.activo ? '🔴' : '🟢'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal crear / editar colegio */}
      {colegioModalOpen && (
        <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) { setColegioModalOpen(false); setEditandoColegioId(null); } }}>
          <div className="modal modal-lg">
            <div className="modal-head">
              <h3>{editandoColegioId ? '✏️ Editar Colegio' : '🏫 Nuevo Colegio'}</h3>
              <button className="modal-close" onClick={() => { setColegioModalOpen(false); setEditandoColegioId(null); }}>×</button>
            </div>
            <form onSubmit={handleSubmitColegio}>
              {/* Logo section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', padding: '12px', background: 'var(--hc-cream)', borderRadius: '8px' }}>
                <div style={{ cursor: 'pointer' }} onClick={() => logoInputRef.current?.click()}>
                  {logoPreview
                    ? <img src={logoPreview} alt="Logo" style={{ width: 72, height: 72, borderRadius: '12px', objectFit: 'cover', border: '2px solid #c5e5ce' }} />
                    : <div style={{
                        width: 72, height: 72, borderRadius: '12px', border: '2px dashed #c5e5ce', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: 28, color: 'var(--hc-gray)', background: '#fff',
                      }}>🏫</div>
                  }
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>Logo del Colegio</div>
                  <div style={{ fontSize: '11px', color: 'var(--hc-gray)', marginBottom: '6px' }}>PNG, JPG, SVG o WEBP · Máx 2 MB</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                      {uploadingLogo ? <span className="spin"></span> : '📤 Subir logo'}
                    </button>
                    {logoPreview && (
                      <button type="button" className="btn btn-sm" onClick={removeLogo} style={{ background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2' }}>
                        🗑️ Quitar
                      </button>
                    )}
                  </div>
                  <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" style={{ display: 'none' }} onChange={handleLogoFileChange} />
                </div>
              </div>

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
              {!editandoColegioId && (
                <small style={{ fontSize: '11px', color: 'var(--hc-gray)', display: 'block', marginBottom: '8px' }}>
                  Se crearán las cuentas contables por defecto para el nuevo colegio.
                </small>
              )}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button type="button" className="btn btn-outline" onClick={() => { setColegioModalOpen(false); setEditandoColegioId(null); }}>Cancelar</button>
                <button type="submit" className="btn btn-green" disabled={savingColegio}>
                  {savingColegio ? <span className="spin"></span> : editandoColegioId ? 'Guardar Cambios' : 'Crear Colegio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
