// components/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface User {
  id: number;
  name: string;
  username: string;
  role: 'admin' | 'asistente' | 'empleado' | 'superadmin';
  colegioId?: number | null;
  colegioNombre?: string | null;
}

interface SidebarProps {
  user: User;
  onLogout: () => void;
}

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => pathname === path;

  const handleNavigation = (path: string) => {
    router.push(path);
    // Cerrar sidebar en móvil (si está abierto)
    if (window.innerWidth < 768) {
      document.getElementById('sidebar')?.classList.remove('open');
      document.getElementById('sb-overlay')?.classList.remove('show');
    }
  };

  const isAdmin = user.role === 'admin' || user.role === 'superadmin';
  const canEdit = isAdmin || user.role === 'asistente';

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
            <div className="sb-logo-text">{user.colegioNombre || 'Las Palmas'}</div>
            <div className="sb-logo-sub">Sistema Financiero</div>
          </div>
        </div>
        <nav className="sb-nav">
          <div className="sb-section">Principal</div>
          <button
            className={`sb-link ${isActive('/dashboard') ? 'active' : ''}`}
            onClick={() => handleNavigation('/dashboard')}
          >
            <span className="sb-icon">📊</span>Dashboard
          </button>

          {canEdit && (
            <>
              <div className="sb-section">Cobros</div>
              <button
                className={`sb-link ${isActive('/cobros') ? 'active' : ''}`}
                onClick={() => handleNavigation('/cobros')}
              >
                <span className="sb-icon">💳</span>Cobros / Caja
              </button>
            </>
          )}

          {canEdit && (
            <>
              <div className="sb-section">Finanzas</div>
              <button
                className={`sb-link ${isActive('/movimientos') ? 'active' : ''}`}
                onClick={() => handleNavigation('/movimientos')}
              >
                <span className="sb-icon">💰</span>Movimientos
              </button>
            </>
          )}

          {isAdmin && (
            <button
              className={`sb-link ${isActive('/cuentas') ? 'active' : ''}`}
              onClick={() => handleNavigation('/cuentas')}
            >
              <span className="sb-icon">📋</span>Cuentas
            </button>
          )}

          <button
            className={`sb-link ${isActive('/reportes') ? 'active' : ''}`}
            onClick={() => handleNavigation('/reportes')}
          >
            <span className="sb-icon">📄</span>Reportes
          </button>

          {isAdmin && (
            <>
              <div className="sb-section">Administración</div>
              <button
                className={`sb-link ${isActive('/configuracion') ? 'active' : ''}`}
                onClick={() => handleNavigation('/configuracion')}
              >
                <span className="sb-icon">⚙️</span>Configuración
              </button>
              <button
                className={`sb-link ${isActive('/usuarios') ? 'active' : ''}`}
                onClick={() => handleNavigation('/usuarios')}
              >
                <span className="sb-icon">👥</span>Usuarios
              </button>
            </>
          )}
        </nav>
        <div className="sb-footer">
          <div className="sb-user">
            <div className="sb-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div className="sb-uname">{user.name}</div>
              <div className="sb-urole">
                {user.role === 'superadmin' ? 'Super Administrador' : user.role === 'admin' ? 'Administrador' : user.role === 'asistente' ? 'Asistente' : 'Empleado'}
              </div>
            </div>
          </div>
          <button className="sb-logout" onClick={onLogout}>
            ← Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}