// components/Topbar.tsx
'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
  id: number;
  name: string;
  username: string;
  role: 'superadmin' | 'admin' | 'asistente' | 'empleado';
  config?: { nombre?: string; telefono?: string } | null;
}

interface TopbarProps {
  user: User;
  onLogout: () => void;
  config?: { nombre?: string; telefono?: string } | null;
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/cobros': 'Cobros / Caja',
  '/movimientos': 'Movimientos',
  '/cuentas': 'Cuentas',
  '/reportes': 'Reportes',
  '/configuracion': 'Configuración',
  '/usuarios': 'Usuarios',
  '/colegios': 'Colegios',
};

export default function Topbar({ user, onLogout }: TopbarProps) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  const pageTitle = PAGE_TITLES[pathname] || 'Sistema Financiero';

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
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
    superadmin: 'SUPER ADMIN',
    admin: 'ADMIN',
    asistente: 'ASISTENTE',
    empleado: 'EMPLEADO',
  }[user.role];

  return (
    <>
      {/* Desktop topbar */}
      <div className="topbar-desk" id="topbar-desk">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span>📍 Carretera Las Palmas, Bonao, Monseñor Nouel, Rep. Dom.</span>
          <span>📞 809-832-9405</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <a href="#">Inicio</a>
          <a href="#">Contacto</a>
          <span className="topbar-role" id="desk-role">{roleLabel}</span>
        </div>
      </div>

      {/* Mobile topbar */}
      <div className="topbar-mobile" id="topbar-mobile">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="hamburger" onClick={toggleSidebar}>
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '14px', fontWeight: 700, color: 'white' }}>
            {pageTitle}
          </div>
        </div>
        <span className="topbar-role" id="mob-role">{roleLabel}</span>
      </div>
    </>
  );
}