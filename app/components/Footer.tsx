// components/Footer.tsx
import type { ColegioConfig } from './LayoutClient';

export default function Footer({ config }: { config: ColegioConfig | null }) {
  return (
    <>
      <hr className="hc-divider" />
      <footer className="site-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {config?.logo_url
            ? <img src={config.logo_url} alt="Logo" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            : <span style={{ fontSize: '20px' }}>🌿</span>
          }
          <div>
            <div className="footer-logo">{config?.nombre || 'Colegio'}</div>
            <div style={{ marginTop: '2px' }}>
              {config?.direccion && <span>{config.direccion}</span>}
              {config?.telefono && <span> · Tel: {config.telefono}</span>}
            </div>
            {config?.email && <div style={{ marginTop: '2px' }}>{config.email}</div>}
          </div>
        </div>
        <div>
          © {new Date().getFullYear()} Derechos reservados
        </div>
      </footer>
    </>
  );
}
