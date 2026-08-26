// components/Topbar.tsx
'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ColegioConfig } from './LayoutClient';

interface User {
  id: number;
  name: string;
  username: string;
  role: 'admin' | 'asistente' | 'empleado' | 'superadmin';
  colegioId?: number | null;
  colegioNombre?: string | null;
}

interface TopbarProps {
  user: User;
  config: ColegioConfig | null;
  onLogout: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/cobros': 'Cobros / Caja',
  '/movimientos': 'Movimientos',
  '/cuentas': 'Cuentas',
  '/reportes': 'Reportes',
  '/configuracion': 'Configuración',
  '/usuarios': 'Usuarios',
};

export default function Topbar({ user, config }: TopbarProps) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const pageTitle = PAGE_TITLES[pathname] || 'Sistema Financiero';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sb-overlay');
    if (!sidebar) return;
    if (isMobile) {
      sidebar.classList.toggle('open');
      overlay?.classList.toggle('show');
    } else {
      sidebar.classList.toggle('collapsed');
      document.getElementById('main-area')?.classList.toggle('expanded');
    }
  };

  const roleLabel = {
    admin: 'ADMIN',
    asistente: 'ASISTENTE',
    empleado: 'EMPLEADO',
    superadmin: 'SUPERADMIN',
  }[user.role];

  return (
    <>
      {/* Desktop topbar */}
      <div className="topbar-desk" id="topbar-desk">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {config?.logo_url
            ? <img src={config.logo_url} alt="Logo" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
            : <span style={{ fontSize: '16px' }}>🌿</span>
          }
          <span style={{ fontWeight: 700, fontSize: '12px', color: 'white' }}>{config?.nombre || 'Colegio'}</span>
          {config?.direccion && <span>📍 {config.direccion}</span>}
          {config?.telefono && <span>📞 {config.telefono}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span className="topbar-role">{roleLabel}</span>
        </div>
      </div>

      {/* Mobile topbar */}
      <div className="topbar-mobile" id="topbar-mobile">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="hamburger" onClick={toggleSidebar}>
            <span></span><span></span><span></span>
          </button>
          {config?.logo_url
            ? <img src={config.logo_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
            : <span style={{ fontSize: '18px' }}>🌿</span>
          }
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '14px', fontWeight: 700, color: 'white' }}>
            {pageTitle}
          </div>
        </div>
        <span className="topbar-role">{roleLabel}</span>
      </div>
    </>
  );
}
