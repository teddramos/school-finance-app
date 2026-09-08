// lib/ui-toast.tsx
'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Toast, ToastType } from '@/types';

interface ToastContextValue {
  toasts: Toast[];
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;
function toastId(): string {
  return `toast-${++nextId}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = toastId();
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}

export function ToastStack() {
  const { toasts, removeToast } = useToast();

  if (!toasts.length) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 360,
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          aria-live="polite"
          style={{
            background: t.type === 'error' ? 'var(--hc-red)' : t.type === 'success' ? 'var(--hc-green)' : 'var(--hc-blue)',
            color: '#fff',
            padding: '10px 12px',
            borderRadius: 8,
            boxShadow: 'var(--shadow-m)',
            fontFamily: "'Open Sans', sans-serif",
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <span>{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              borderRadius: 4,
              padding: '2px 6px',
              cursor: 'pointer',
              fontSize: 14,
            }}
            aria-label="Cerrar notificación"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
