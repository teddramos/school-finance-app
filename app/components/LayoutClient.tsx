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
  role: 'admin' | 'asistente' | 'empleado';
}

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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

  if (loading) {
    return <SkeletonAppLayout />;
  }

  if (!user) return null;

  return (
    <div className="app-wrap">
      <Sidebar user={user} onLogout={handleLogout} />
      <div className="main-area">
        <Topbar user={user} onLogout={handleLogout} />
        <div style={{ flex: 1 }}>
          {children}
        </div>
        <Footer />
      </div>
    </div>
  );
}