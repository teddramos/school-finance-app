'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SkeletonUsuarios from '@/components/skeletons/SkeletonUsuarios';

interface User {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'asistente' | 'empleado';
  password?: string; // only for creation/editing
  colegioId?: number | null;
  colegioNombre?: string | null;
}

interface ColegioItem {
  id: number;
  nombre: string;
}

const ROLES = {
  admin: { label: 'Administrador', badge: 'badge-admin', description: 'Acceso completo' },
  asistente: { label: 'Asistente', badge: 'badge-asistente', description: 'Cobros y movimientos' },
  empleado: { label: 'Empleado', badge: 'badge-empleado', description: 'Solo reportes' },
};

export default function UsuariosPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'asistente' as 'admin' | 'asistente' | 'empleado',
    colegioId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Colegios (para superadmin)
  const [colegios, setColegios] = useState<ColegioItem[]>([]);
  const [filtroColegio, setFiltroColegio] = useState<string>('');
  const [colegioNombreActual, setColegioNombreActual] = useState<string>('');
  const [colegioSesion, setColegioSesion] = useState<string>('');

  // Verificar permisos y obtener usuario actual
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch('/api/auth/me', { credentials: 'same-origin', headers })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.user.role === 'admin') {
          setIsAdmin(true);
          setCurrentUserId(data.user.id);
          setColegioNombreActual(data.user.colegioNombre || '');
          loadUsers();
        } else if (data && data.user.role === 'superadmin') {
          setIsAdmin(true);
          setIsSuperAdmin(true);
          setCurrentUserId(data.user.id);
          // Colegio seleccionado en el login: filtro y destino por defecto de nuevos usuarios
          if (data.user.colegioId) {
            const cid = String(data.user.colegioId);
            setColegioSesion(cid);
            setFiltroColegio(cid);
          }
          setColegioNombreActual(data.user.colegioNombre || '');
          loadColegios().then(() => loadUsers());
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

  const loadColegios = async () => {
    try {
      const res = await fetch('/api/colegios', { credentials: 'same-origin', headers: authHeaders() });
      if (!res.ok) throw new Error('Error al cargar colegios');
      const data = await res.json();
      setColegios(Array.isArray(data) ? data : []);
      return data;
    } catch (err: any) {
      console.error(err.message);
      return [];
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users', { credentials: 'same-origin', headers: authHeaders() });
      if (!res.ok) throw new Error('Error al cargar usuarios');
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      username: '',
      password: '',
      role: 'asistente',
      colegioId: colegioSesion || filtroColegio || '',
    });
    setModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      password: '', // password field empty, only fill if changing
      role: user.role,
      colegioId: user.colegioId ? String(user.colegioId) : '',
    });
    setModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username) {
      alert('Nombre y usuario son obligatorios');
      return;
    }
    if (!editingUser && !formData.password) {
      alert('Contraseña es obligatoria para usuarios nuevos');
      return;
    }
    if (isSuperAdmin && !editingUser && !formData.colegioId) {
      alert('Debe seleccionar el colegio del usuario');
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        name: formData.name,
        username: formData.username,
        role: formData.role,
        ...(formData.password ? { password: formData.password } : {}),
      };
      if (isSuperAdmin && !editingUser) {
        payload.colegioId = parseInt(formData.colegioId, 10);
      }
      let res;
      if (editingUser) {
        res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/users', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al guardar usuario');
      }
      setModalOpen(false);
      loadUsers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (user.id === currentUserId) {
      alert('No puedes eliminar tu propio usuario');
      return;
    }
    if (!confirm(`¿Eliminar al usuario "${user.name}"?`)) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE', credentials: 'same-origin', headers: authHeaders() });
      if (!res.ok) throw new Error('Error al eliminar');
      loadUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!isAdmin || loading) {
    return <SkeletonUsuarios />;
  }

  return (
    <div className="page active">
      <div className="page-header">
        <div>
          <h2>Usuarios</h2>
          <p>Accesos y roles{!isSuperAdmin && colegioNombreActual ? ` · ${colegioNombreActual}` : ''}</p>
        </div>
        <button className="btn btn-gold" onClick={openCreateModal}>
          + Nuevo
        </button>
      </div>
      <div className="page-wrap">
        {/* Filtro por colegio (solo superadmin) */}
        {isSuperAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--hc-gray)' }}>🏫 Colegio:</label>
            <select
              className="inp"
              style={{ width: 'auto', minWidth: '220px' }}
              value={filtroColegio}
              onChange={(e) => setFiltroColegio(e.target.value)}
            >
              <option value="">Todos los colegios</option>
              {colegios.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        )}

        {/* Lista de usuarios en formato tarjeta para móvil y tabla para escritorio */}
        {error ? (
          <div className="card empty" style={{ color: 'var(--hc-red)' }}>⚠️ {error}</div>
        ) : (
          <>
            <div className="card" style={{ overflowX: 'auto' }}>
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Nombre</th>
                      {isSuperAdmin && <th>Colegio</th>}
                      <th>Rol</th>
                      <th>Permisos</th>
                      <th>Acc.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter(u => !isSuperAdmin || !filtroColegio || String(u.colegioId ?? '') === filtroColegio)
                      .map(user => (
                      <tr key={user.id}>
                        <td>
                          <code style={{ background: 'var(--hc-gray-l)', padding: '2px 7px', borderRadius: '3px', fontSize: '11px' }}>
                            {user.username}
                          </code>
                        </td>
                        <td style={{ fontWeight: 600 }}>{user.name}</td>
                        {isSuperAdmin && <td>{user.colegioNombre || '—'}</td>}
                        <td>
                          <span className={`badge ${ROLES[user.role].badge}`}>
                            {ROLES[user.role].label}
                          </span>
                        </td>
                        <td style={{ fontSize: '11px', color: 'var(--hc-gray)' }}>
                          {ROLES[user.role].description}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button className="btn btn-outline btn-sm" onClick={() => openEditModal(user)}>✏️</button>
                            {user.id !== currentUserId && (
                              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(user)}>🗑️</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tarjeta informativa de roles */}
            <div className="card" style={{ marginTop: '16px' }}>
              <div className="card-title">📋 Roles y Permisos</div>
              <div className="three-col">
                <div style={{ background: '#e8ecff', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '12px', color: '#3b4fd8', marginBottom: '7px' }}>👑 Administrador</div>
                  <div style={{ fontSize: '11px', color: '#3b4fd8', lineHeight: '1.9' }}>
                    ✓ Todo el sistema<br />
                    ✓ Cobros y Caja<br />
                    ✓ Configuración<br />
                    ✓ Usuarios
                  </div>
                </div>
                <div style={{ background: '#fff3e8', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '12px', color: '#c47a2b', marginBottom: '7px' }}>📋 Asistente</div>
                  <div style={{ fontSize: '11px', color: '#c47a2b', lineHeight: '1.9' }}>
                    ✓ Cobros y Caja<br />
                    ✓ Movimientos<br />
                    ✓ Ver reportes<br />
                    ✗ Config / Usuarios
                  </div>
                </div>
                <div style={{ background: 'var(--hc-gray-l)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--hc-gray)', marginBottom: '7px' }}>👤 Empleado</div>
                  <div style={{ fontSize: '11px', color: 'var(--hc-gray)', lineHeight: '1.9' }}>
                    ✓ Ver reportes<br />
                    ✓ Imprimir<br />
                    ✗ Cobros<br />
                    ✗ Movimientos
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal para crear/editar usuario */}
      {modalOpen && (
        <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal">
            <div className="modal-head">
              <h3>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              {isSuperAdmin && !editingUser && (
                <div className="fgroup">
                  <label className="lbl">Colegio *</label>
                  <select className="inp" name="colegioId" value={formData.colegioId} onChange={handleChange} required>
                    <option value="">Seleccionar colegio...</option>
                    {colegios.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="fgroup">
                <label className="lbl">Nombre Completo</label>
                <input className="inp" name="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="fgroup">
                <label className="lbl">Usuario</label>
                <input className="inp" name="username" value={formData.username} onChange={handleChange} required disabled={!!editingUser} />
                {editingUser && <small style={{ fontSize: '10px', color: 'var(--hc-gray)' }}>El nombre de usuario no se puede modificar</small>}
              </div>
              <div className="fgroup">
                <label className="lbl">{editingUser ? 'Contraseña (dejar en blanco para no cambiar)' : 'Contraseña'}</label>
                <input className="inp" name="password" type="password" value={formData.password} onChange={handleChange} required={!editingUser} />
              </div>
              <div className="fgroup">
                <label className="lbl">Rol</label>
                <select className="inp" name="role" value={formData.role} onChange={handleChange}>
                  <option value="admin">Administrador</option>
                  <option value="asistente">Asistente</option>
                  <option value="empleado">Empleado</option>
                </select>
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
