// components/modals/ReciboModal.tsx
'use client';

import { useRef } from 'react';

interface FacturaCubierta {
  id: number;
  periodo: string;
  monto: number;
  abono: number;
}

interface Cargo {
  nombre: string;
  monto: number;
}

interface DescuentoAdicional {
  nombre: string;
  tipo: 'porcentaje' | 'fijo';
  valor: number;
}

interface Pago {
  id: number;
  numRecibo: string;
  monto: number;
  fecha: string;
  forma: string;
  ref?: string;
  cardDigits?: string;
  obs?: string;
  usuario?: string;
  facturasCubiertas: FacturaCubierta[];
  montoBase: number;
  descuentoPerfil: number;
  cargos: Cargo[];
  descuentosAdicionales: DescuentoAdicional[];
  // Datos adicionales para el recibo (deben venir del CobroModal)
  padre?: {
    nombre: string;
    cedula: string;
    telefono: string;
    email: string;
    direccion: string;
    hijos: Array<{ nombre: string; grado: string }>;
    descuentos?: Array<{ nombre: string; tipo: string; valor: number; activo: boolean }>;
  };
  config?: {
    nombre: string;
    rif: string;
    direccion: string;
    telefono: string;
    email: string;
    director: string;
    tarifa: number;
    logo_url?: string;
  };
}

interface ReciboModalProps {
  isOpen: boolean;
  pago: Pago | null;
  copia?: boolean;
  onClose: () => void;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const formatMoney = (value: number): string => {
  return `RD$${value.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function ReciboModal({ isOpen, pago, copia, onClose }: ReciboModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !pago) return null;

  // Extraer datos con valores por defecto
  const padre = pago.padre;
  const config = pago.config;
  const facturasCubiertas = pago.facturasCubiertas || [];
  const descuentoPerfil = pago.descuentoPerfil || 0;
  const cargos = pago.cargos || [];
  const descuentosAdicionales = pago.descuentosAdicionales || [];
  const montoBase = pago.montoBase || 0;

  // Si no hay padre o config, mostrar mensaje de error
  if (!padre || !config) {
    return (
      <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="modal modal-lg">
          <div className="modal-head">
            <h3>🧾 Recibo de Pago</h3>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          <div className="empty">
            No se pudo cargar la información completa del recibo.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
            <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    );
  }

  const tarifa = config.tarifa || 1500;
  const formaLabels: Record<string, string> = {
    efectivo: '💵 Efectivo',
    transferencia: '🏦 Transferencia Bancaria',
    tarjeta: '💳 Tarjeta de Crédito',
  };

  // Construir filas de mensualidades
  const filasMensualidades = facturasCubiertas.map((fc, idx) => {
    const [year, month] = fc.periodo.split('-');
    const mesNombre = MESES[parseInt(month) - 1];
    const abono = fc.abono !== undefined ? fc.abono : fc.monto; // compatibilidad
    return (
      <tr key={idx} style={{ borderBottom: '1px solid #eaeee8' }}>
        <td style={{ padding: '7px 10px' }}>
          <div style={{ fontWeight: 600 }}>Mensualidad Escolar — {mesNombre} {year}</div>
          <div style={{ fontSize: '10px', color: '#6b7068' }}>
            {padre.hijos.length} alumno(s) × {formatMoney(tarifa)}/mes · Abono: {formatMoney(abono)}
          </div>
        </td>
        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: '#3a6b35' }}>
          {formatMoney(abono)}
        </td>
      </tr>
    );
  });

  // Fila de descuento de perfil
  const descPerfilRow = descuentoPerfil > 0 ? (
    <tr style={{ borderBottom: '1px solid #eaeee8' }}>
      <td style={{ padding: '7px 10px' }}>
        <div style={{ fontWeight: 600 }}>Descuento de Perfil</div>
        <div style={{ fontSize: '10px', color: '#6b7068' }}>
          {(padre.descuentos || []).filter(d => d.activo).map(d => d.nombre).join(', ') || 'Descuento aplicado'}
        </div>
      </td>
      <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: '#3a6b35' }}>
        -{formatMoney(descuentoPerfil)}
      </td>
    </tr>
  ) : null;

  // Filas de cargos adicionales
  const cargosRows = cargos.filter(c => c.monto > 0).map((cargo, idx) => (
    <tr key={`cargo-${idx}`} style={{ borderBottom: '1px solid #eaeee8' }}>
      <td style={{ padding: '7px 10px' }}>
        <div style={{ fontWeight: 600 }}>Cargo: {cargo.nombre}</div>
      </td>
      <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: '#c07a2b' }}>
        +{formatMoney(cargo.monto)}
      </td>
    </tr>
  ));

  // Filas de descuentos adicionales
  const descAdRows = descuentosAdicionales.filter(d => d.valor > 0).map((desc, idx) => {
    const valorAplicado = desc.tipo === 'porcentaje' ? (montoBase * (desc.valor / 100)) : desc.valor;
    return (
      <tr key={`desc-${idx}`} style={{ borderBottom: '1px solid #eaeee8' }}>
        <td style={{ padding: '7px 10px' }}>
          <div style={{ fontWeight: 600 }}>
            Descuento: {desc.nombre} {desc.tipo === 'porcentaje' ? `(${desc.valor}%)` : ''}
          </div>
        </td>
        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: '#3a6b35' }}>
          -{formatMoney(valorAplicado)}
        </td>
      </tr>
    );
  });

  // Información adicional según forma de pago
  let infoForma = null;
  if (pago.forma === 'transferencia' && pago.ref) {
    infoForma = (
      <tr>
        <td style={{ color: '#6b7068', padding: '3px 0' }}>Ref. Transferencia:</td>
        <td style={{ fontWeight: 700, padding: '3px 0' }}>{pago.ref}</td>
      </tr>
    );
  } else if (pago.forma === 'tarjeta') {
    infoForma = (
      <>
        <tr>
          <td style={{ color: '#6b7068', padding: '3px 0' }}>Tarjeta terminada en:</td>
          <td style={{ fontWeight: 700, padding: '3px 0' }}>**** {pago.cardDigits || '—'}</td>
        </tr>
        {pago.ref && (
          <tr>
            <td style={{ color: '#6b7068', padding: '3px 0' }}>Aprobación:</td>
            <td style={{ fontWeight: 700, padding: '3px 0' }}>{pago.ref}</td>
          </tr>
        )}
      </>
    );
  }

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const printWindow = window.open('', '_blank', 'width=680,height=900');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Recibo ${pago.numRecibo}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Open Sans', sans-serif;
              padding: 28px;
              color: #1e2d1a;
              background: white;
              max-width: 640px;
              margin: 0 auto;
            }
            @media print {
              body { padding: 12px; }
              @page { margin: 10mm; }
            }
            .recibo-container {
              font-family: 'Open Sans', sans-serif;
              max-width: 580px;
              margin: 0 auto;
              color: #1e2d1a;
            }
            .header {
              text-align: center;
              padding: 18px 0 14px;
              border-bottom: 3px solid #3a6b35;
              margin-bottom: 16px;
            }
            .logo { font-size: 28px; margin-bottom: 5px; }
            .colegio-nombre {
              font-family: 'Playfair Display', serif;
              font-size: 18px;
              font-weight: 700;
              color: #3a6b35;
            }
            .colegio-datos {
              font-size: 10px;
              color: #6b7068;
              margin-top: 2px;
            }
            .recibo-titulo {
              margin-top: 9px;
              display: inline-block;
              background: #3a6b35;
              color: white;
              padding: 4px 16px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.06em;
            }
            .info-recibo {
              display: flex;
              justify-content: space-between;
              margin-bottom: 14px;
              flex-wrap: wrap;
            }
            .info-padre {
              background: #f7f5f0;
              border-radius: 8px;
              padding: 12px 14px;
              margin-bottom: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            th, td {
              padding: 6px 10px;
              text-align: left;
            }
            .detalle-pago {
              background: #f7f5f0;
              border-radius: 8px;
              padding: 12px 14px;
              margin-bottom: 12px;
            }
            .total {
              background: #3a6b35;
              border-radius: 8px;
              padding: 14px 18px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 16px;
            }
            .total-label {
              color: white;
              font-weight: 700;
              font-size: 14px;
            }
            .total-value {
              font-family: 'Playfair Display', serif;
              font-size: 24px;
              font-weight: 700;
              color: #c9a84c;
            }
            .firmas {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 28px;
              margin-bottom: 16px;
            }
            .firma {
              text-align: center;
              border-top: 1px solid #1e2d1a;
              padding-top: 7px;
              font-size: 10px;
              color: #6b7068;
            }
            .footer {
              text-align: center;
              padding-top: 10px;
              border-top: 1px solid #eaeee8;
              font-size: 10px;
              color: #6b7068;
              line-height: 1.7;
            }
          </style>
        </head>
        <body>
          <div class="recibo-container">
            ${printRef.current?.innerHTML || ''}
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-lg">
        <div className="modal-head">
          <h3>🧾 Recibo de Pago{copia ? ' (COPIA)' : ''}</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="btn btn-green btn-sm" onClick={handlePrint}>🖨️ Imprimir</button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        <div ref={printRef} className="recibo-printable" style={{ fontFamily: "'Open Sans', sans-serif", maxWidth: '580px', margin: '0 auto', color: '#1e2d1a' }}>
          {/* Encabezado */}
          <div style={{ textAlign: 'center', padding: '18px 0 14px', borderBottom: '3px solid #3a6b35', marginBottom: '16px' }}>
            <div style={{ fontSize: '28px', marginBottom: '5px' }}>{config.logo_url ? <img src={config.logo_url} alt="Logo" style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover' }} /> : '🌿'}</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: 700, color: '#3a6b35' }}>{config.nombre}</div>
            <div style={{ fontSize: '10px', color: '#6b7068', marginTop: '2px' }}>{config.rif} · {config.direccion}</div>
            <div style={{ fontSize: '10px', color: '#6b7068' }}>{config.telefono} · {config.email}</div>
            <div style={{ marginTop: '9px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', background: '#3a6b35', color: 'white', padding: '4px 16px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em' }}>RECIBO DE PAGO</span>
              {copia && <span style={{ display: 'inline-block', background: '#b8860b', color: 'white', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em' }}>COPIA</span>}
            </div>
          </div>

          {/* Número de recibo y fecha */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#6b7068', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Número de Recibo</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', fontWeight: 700, color: '#3a6b35' }}>{pago.numRecibo}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#6b7068', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fecha de Pago</div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>{new Date(pago.fecha + 'T12:00').toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>

          {/* Datos del padre */}
          <div style={{ background: '#f7f5f0', borderRadius: '8px', padding: '12px 14px', marginBottom: '12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#6b7068', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '7px' }}>Datos del Padre / Tutor</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <tbody>
                <tr><td style={{ color: '#6b7068', padding: '2px 0', width: '38%' }}>Nombre:</td><td style={{ fontWeight: 700, padding: '2px 0' }}>{padre.nombre}</td></tr>
                <tr><td style={{ color: '#6b7068', padding: '2px 0' }}>Cédula:</td><td style={{ fontWeight: 700, padding: '2px 0' }}>{padre.cedula || '—'}</td></tr>
                <tr><td style={{ color: '#6b7068', padding: '2px 0' }}>Teléfono:</td><td style={{ fontWeight: 700, padding: '2px 0' }}>{padre.telefono || '—'}</td></tr>
                <tr><td style={{ color: '#6b7068', padding: '2px 0' }}>Hijos:</td><td style={{ fontWeight: 700, padding: '2px 0' }}>{padre.hijos.map(h => `${h.nombre} (${h.grado})`).join(', ')}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Detalle del cobro (tabla) */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#6b7068', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '7px' }}>Detalle del Cobro</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#eaeee8' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#6b7068', textTransform: 'uppercase' }}>Concepto</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', fontSize: '10px', fontWeight: 700, color: '#6b7068', textTransform: 'uppercase' }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {filasMensualidades}
                {descPerfilRow}
                {cargosRows}
                {descAdRows}
              </tbody>
            </table>
          </div>

          {/* Datos del pago */}
          <div style={{ background: '#f7f5f0', borderRadius: '8px', padding: '12px 14px', marginBottom: '12px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#6b7068', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '7px' }}>Datos del Pago</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <tbody>
                <tr><td style={{ color: '#6b7068', padding: '3px 0', width: '38%' }}>Forma de Pago:</td><td style={{ fontWeight: 700, padding: '3px 0' }}>{formaLabels[pago.forma] || pago.forma}</td></tr>
                {infoForma}
                {pago.obs && <tr><td style={{ color: '#6b7068', padding: '3px 0' }}>Observación:</td><td style={{ fontWeight: 700, padding: '3px 0' }}>{pago.obs}</td></tr>}
                <tr><td style={{ color: '#6b7068', padding: '3px 0' }}>Atendido por:</td><td style={{ fontWeight: 700, padding: '3px 0' }}>{pago.usuario || '—'}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div style={{ background: '#3a6b35', borderRadius: '8px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>TOTAL PAGADO</span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', fontWeight: 700, color: '#c9a84c' }}>{formatMoney(pago.monto)}</span>
          </div>

          {/* Firmas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', marginBottom: '16px' }}>
            <div style={{ textAlign: 'center' }}><div style={{ borderTop: '1px solid #1e2d1a', paddingTop: '7px', fontSize: '10px', color: '#6b7068' }}>Firma y Sello del Cajero</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ borderTop: '1px solid #1e2d1a', paddingTop: '7px', fontSize: '10px', color: '#6b7068' }}>Firma del Padre / Tutor</div></div>
          </div>

          {/* Pie de página */}
          <div style={{ textAlign: 'center', paddingTop: '10px', borderTop: '1px solid #eaeee8', fontSize: '10px', color: '#6b7068', lineHeight: '1.7' }}>
            <strong style={{ color: '#3a6b35' }}>{config.nombre}</strong> · {config.direccion}<br />
            Tel: {config.telefono} · {config.email}<br />
            {copia
              ? <span style={{ color: '#b8860b', fontWeight: 700 }}>Esta impresión es una COPIA y no constituye recibo original de pago.</span>
              : <em>Este recibo es comprobante válido de pago. Consérvelo para sus registros.</em>
            }
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--hc-gray-l)' }}>
          <button className="btn btn-outline" onClick={onClose}>Cerrar</button>
          <button className="btn btn-green" onClick={handlePrint}>🖨️ Imprimir Recibo</button>
        </div>
      </div>
    </div>
  );
}