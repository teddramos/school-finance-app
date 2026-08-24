// components/LayoutClient.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Footer from './Footer';
import SkeletonAppLayout from './skeletons/SkeletonAppLayout';

interface User {
  id: number;
  name: string;
  username: string;
  role: 'superadmin' | 'admin' | 'asistente' | 'empleado';
  colegioId?: number | null;
}

interface Colegio {
  id: number;
  nombre: string;
  rif: string;
  telefono: string;
  email: string;
  direccion: string;
  director: string;
  tarifa: number;
}

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [colegios, setColegios] = useState<Colegio[]>([]);
  const [selectedColegioId, setSelectedColegioId] = useState<number | null>(null);
  const [config, setConfig] = useState<Colegio | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const headers: Record<string, string> = {};
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/auth/me', { credentials: 'same-origin', headers });
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setUser(data.user);
        setSelectedColegioId(data.user.colegioId || 1);
      } catch (error) {
        console.error('Error fetching user:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  // Fetch schools and config when user is superadmin
  useEffect(() => {
    if (!user) return;
    const fetchColegios = async () => {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      try {
        const res = await fetch('/api/colegios', { headers });
        if (res.ok) {
          const data = await res.json();
          setColegios(Array.isArray(data) ? data : []);
        }
      } catch (e) { console.error(e); }
    };
    fetchColegios();
  }, [user]);

  // Fetch config for selected school
  useEffect(() => {
    if (!user || !selectedColegioId) return;
    const fetchConfig = async () => {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      try {
        const res = await fetch(`/api/config?colegioId=${selectedColegioId}`, { headers });
        if (res.ok) setConfig(await res.json());
      } catch (e) { console.error(e); }
    };
    fetchConfig();
  }, [user, selectedColegioId]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    router.push('/login');
  };

  const handleColegioChange = async (newId: number) => {
    setSelectedColegioId(newId);
    // Update config for new school
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(`/api/config?colegioId=${newId}`, { headers });
      if (res.ok) setConfig(await res.json());
    } catch (e) { console.error(e); }
  };

  if (loading) return <SkeletonAppLayout />;
  if (!user) return null;

  // Merge selected school info into user for components
  const userWithSchool = {
    ...user,
    selectedColegioId,
    config,
  };

  return (
    <div className="app-wrap">
      <Sidebar
        user={userWithSchool}
        onLogout={handleLogout}
        colegios={colegios}
        selectedColegioId={selectedColegioId ?? undefined}
        onColegioChange={handleColegioChange}
      />
      <div className="main-area">
        <Topbar
          user={userWithSchool}
          onLogout={handleLogout}
          config={config}
        />
        <div style={{ flex: 1 }}>
          {children}
        </div>
        <Footer />
      </div>
    </div>
  );
}