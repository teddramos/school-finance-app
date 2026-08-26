// components/LayoutClient.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Footer from './Footer';
import SkeletonAppLayout from './skeletons/SkeletonAppLayout';

interface User {
  id: number;
  name: string;
  username: string;
  role: 'admin' | 'asistente' | 'empleado' | 'superadmin';
  colegioId?: number | null;
  colegioNombre?: string | null;
}

export interface ColegioConfig {
  id: number;
  nombre: string;
  rif: string;
  telefono: string;
  email: string;
  direccion: string;
  director: string;
  tarifa: number;
  activo: boolean;
  logo_url: string;
}

export function logoHTML(logo_url?: string | null, size = 40): string {
  if (logo_url) {
    return `<img src="${logo_url}" alt="Logo" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0" />`;
  }
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,#e8f5ee,#c5e5ce);display:flex;align-items:center;justify-content:center;font-size:${size * 0.45};flex-shrink:0;border:2px solid #c5e5ce">🌿</div>`;
}

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<ColegioConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const headers: Record<string, string> = {};
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const [meRes, cfgRes] = await Promise.all([
          fetch('/api/auth/me', { credentials: 'same-origin', headers }),
          fetch('/api/config', { credentials: 'same-origin', headers }),
        ]);
        if (!meRes.ok) { router.push('/login'); return; }
        const meData = await meRes.json();
        setUser(meData.user);
        if (cfgRes.ok) setConfig(await cfgRes.json());
      } catch (error) {
        console.error('Error fetching user:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    router.push('/login');
  };

  if (loading) return <SkeletonAppLayout />;
  if (!user) return null;

  return (
    <div className="app-wrap">
      <Sidebar user={user} config={config} onLogout={handleLogout} />
      <div className="main-area">
        <Topbar user={user} config={config} onLogout={handleLogout} />
        <div style={{ flex: 1 }}>
          {children}
        </div>
        <Footer config={config} />
      </div>
    </div>
  );
}
