// app/components/TopCuentas.tsx
'use client';

import React from 'react';

interface TopCuenta {
  id: number;
  nombre: string;
  tipo?: string;
  descripcion?: string;
  total: number;
}

interface TopCuentasProps {
  cuentas: TopCuenta[];
}

export default function TopCuentas({ cuentas }: TopCuentasProps) {
  if (!cuentas || cuentas.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon">📈</div>
        <p>No hay cuentas destacadas</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {cuentas.map((c) => (
        <div key={c.id} className="row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>{c.nombre}</div>
            {c.descripcion && <div style={{ fontSize: '11px', color: 'var(--hc-gray)' }}>{c.descripcion}</div>}
          </div>
          <div style={{ fontWeight: 700 }}>{formatMoney(c.total)}</div>
        </div>
      ))}
    </div>
  );
}

function formatMoney(value: number): string {
  return `RD$${value.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
