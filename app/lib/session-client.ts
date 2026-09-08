// lib/session-client.ts
'use client';

import { useEffect, useState } from 'react';
import type { SessionUser, ColegioConfig } from '@/types';

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [config, setConfig] = useState<ColegioConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchSession = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const [meRes, cfgRes] = await Promise.all([
          fetch('/api/auth/me', { credentials: 'same-origin', headers }),
          fetch('/api/config', { credentials: 'same-origin', headers }),
        ]);

        if (!meRes.ok) {
          setError('No autorizado');
          return;
        }

        const meData = await meRes.json();
        if (!mounted) return;
        setUser(meData.user ?? null);

        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          if (mounted) setConfig(cfg ?? null);
        }
      } catch (err) {
        if (mounted) setError('Error al cargar sesión');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSession();
    return () => {
      mounted = false;
    };
  }, []);

  return { user, config, loading, error };
}
