// components/Sidebar.tsx
'use client';
import { usePathname, useRouter } from 'next/navigation';

interface User {
  id: number;
  name: string;
  username: string;
  role: 'superadmin' | 'admin' | 'asistente' | 'empleado';
  colegioId?: number | null;
  config?: { nombre?: string } | null;
}

interface Colegio {
  id: number;
  nombre: string;
}

interface SidebarProps {
  user: User;
  onLogout: () => void;
  colegios?: Colegio[];
  selectedColegioId?: number;
  onColegioChange?: (id: number) => void;
}

export default function Sidebar({ user, onLogout, colegios = [], selectedColegioId, onColegioChange }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = (path: string) => pathname === path;
  const handleNavigation = (path: string) => {
    router.push(path);
    if (window.innerWidth < 768) {
      document.getElementById('sidebar')?.classList.remove('open');
      document.getElementById('sb-overlay')?.classList.remove('show');
    }
  };
  const isSuperadmin = user.role === 'superadmin';
  const isAdmin = user.role === 'admin';
  const canViewConfig = user.role === 'superadmin' || user.role === 'admin';

  return (
    <>
      <div className="sb-overlay" id="sb-overlay" onClick={() => {
        document.getElementById('sidebar')?.classList.remove('open');
        document.getElementById('sb-overlay')?.classList.remove('show');
      }}></div>
      <aside className="sidebar" id="sidebar">
        <div className="sb-header">
          <div className="sb-logo-icon">🌿</div>
          <div>
            <div className="sb-logo-text">{user.config?.nombre || 'Colegio'}</div>
            <div className="sb-logo-sub">Sistema Financiero</div>
          </div>
        </div>

        {isSuperadmin && colegios.length > 0 && (
          <div className="sb-school-selector">
            <label>Seleccionar Colegio:</label>
            <select value={selectedColegioId || ''} onChange={e => onColegioChange?.(parseInt(e.target.value))} className="sb-school-select">
              <option value="">-- Seleccionar --</option>
              {colegios.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        )}

        <nav className="sb-nav">
          <div className="sb-section-label">PRINCIPAL</div>
          <button className={`sb-link ${isActive('/dashboard') ? 'active' : ''}`} onClick={() => handleNavigation('/dashboard')}>
            <span className="sb-icon">📊</span> Dashboard
          </button>
          <button className={`sb-link ${isActive('/cobros') ? 'active' : ''}`} onClick={() => handleNavigation('/cobros')}>
            <span className="sb-icon">💵</span> Cobros
          </button>
          <button className={`sb-link ${isActive('/movimientos') ? 'active' : ''}`} onClick={() => handleNavigation('/movimientos')}>
            <span className="sb-icon">📋</span> Movimientos
          </button>

          {canViewConfig && (
            <>
              <div className="sb-section-label">CONFIGURACIÓN</div>
              <button className={`sb-link ${isActive('/cuentas') ? 'active' : ''}`} onClick={() => handleNavigation('/cuentas')}>
                <span className="sb-icon">🏷️</span> Cuentas
              </button>
              {isSuperadmin && (
                <button className={`sb-link ${isActive('/colegios') ? 'active' : ''}`} onClick={() => handleNavigation('/colegios')}>
                  <span className="sb-icon">🏫</span> Colegios
                </button>
              )}
              {isAdmin && (
                <button className={`sb-link ${isActive('/configuracion') ? 'active' : ''}`} onClick={() => handleNavigation('/configuracion')}>
                  <span className="sb-icon">⚙️</span> Configuración
                </button>
              )}
            </>
          )}

          {(isAdmin || isSuperadmin) && (
            <>
              <div className="sb-section-label">ADMINISTRACIÓN</div>
              <button className={`sb-link ${isActive('/usuarios') ? 'active' : ''}`} onClick={() => handleNavigation('/usuarios')}>
                <span className="sb-icon">👥</span> Usuarios
              </button>
            </>
          )}

          <div className="sb-spacer" />
          <div className="sb-user-info">
            <div className="sb-user-avatar">{user.name?.charAt(0).toUpperCase()}</div>
            <div className="sb-user-details">
              <div className="sb-user-name">{user.name}</div>
              <div className="sb-user-role">
                {user.role === 'superadmin' ? '👑 Super Admin' :
                 user.role === 'admin' ? '🔧 Administrador' :
                 user.role === 'asistente' ? '📋 Asistente' : '👤 Empleado'}
              </div>
            </div>
          </div>
          <button className="sb-logout" onClick={onLogout}>
            <span className="sb-icon">🚪</span> Cerrar Sesión
          </button>
        </nav>
      </aside>
    </>
  );
}

