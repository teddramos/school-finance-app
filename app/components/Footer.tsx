// components/Footer.tsx
export default function Footer() {
  return (
    <>
      <hr className="hc-divider" />
      <footer className="site-footer">
        <div>
          <div className="footer-logo">🌿 Colegio Las Palmas</div>
          <div style={{ marginTop: '3px' }}>Sistema de Gestión Financiera · Bonao, Monseñor Nouel</div>
        </div>
        <div>
          © 2025 Derechos reservados &nbsp;·&nbsp; <a href="#">Hogar Campestre Las Palmas</a>
        </div>
      </footer>
    </>
  );
}