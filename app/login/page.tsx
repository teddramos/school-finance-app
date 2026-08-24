'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ColegioOption {
  id: number;
  nombre: string;
}

export default function LoginPage() {
  const [username, setUsername] = useState('superadmin');
  const [password, setPassword] = useState('super123');
  const [colegios, setColegios] = useState<ColegioOption[]>([]);
  const [colegioId, setColegioId] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Cargar colegios para el selector; por defecto "Colegio Las Palmas"
  useEffect(() => {
    fetch('/api/colegios')
      .then(res => res.ok ? res.json() : [])
      .then((data: ColegioOption[]) => {
        if (!Array.isArray(data) || data.length === 0) return;
        setColegios(data);
        const palmas = data.find(c => c.nombre.toLowerCase().includes('palmas'));
        setColegioId(String(palmas ? palmas.id : data[0].id));
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Intentar primero vía fetch (incluye credentials) y usar token como respaldo
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, colegioId }),
        });
        const data = await res.json();
        if (res.ok) {

          // Guardar token en localStorage como fallback para Authorization header
          if (data?.token) {
            try { localStorage.setItem('token', data.token); } catch (e) {}
          }
          // Forzar recarga completa para que la cookie (si fue establecida) sea enviada
          window.location.assign('/dashboard');
          return;
        }else{
          throw new Error(data.error || 'Error de autenticación');
        }
      } catch (err: any) {
      setError(err.message);
      }

      // Fallback: enviar como formulario tradicional para forzar navegación completa y Set-Cookie
      // const form = document.createElement('form');
      // form.method = 'POST';
      // form.action = '/api/auth/login';
      // form.style.display = 'none';
      // const u = document.createElement('input');
      // u.name = 'username';
      // u.value = username;
      // form.appendChild(u);
      // const p = document.createElement('input');
      // p.name = 'password';
      // p.value = password;
      // form.appendChild(p);
      // document.body.appendChild(form);
      // form.submit();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-topbar">
        <span>🌿 Colegio Las Palmas · Bonao, Monseñor Nouel, Rep. Dom.</span>
        <span>Tel: 809-832-9405</span>
      </div>
      <div className="login-body">
        <div className="lcircle"></div><div className="lcircle"></div><div className="lcircle"></div>
        <div className="login-card">
          <div className="login-logo">
            <div className="login-logo-icon">🌿</div>
            <h1>Sistema Financiero</h1>
            <p>COLEGIO LAS PALMAS · REP. DOM.</p>
          </div>
          {error && <div className="login-err" style={{ display: 'flex' }}>⚠️ {error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="lf">
              <label>Colegio</label>
              <select value={colegioId} onChange={e => setColegioId(e.target.value)} required>
                {colegios.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div className="lf">
              <label>Usuario</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Ingrese su usuario" required />
            </div>
            <div className="lf">
              <label>Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Ingrese su contraseña" required />
            </div>
            <button className="btn-login" type="submit" disabled={loading || !colegioId}>
              {loading ? <span className="spin"></span> : 'Iniciar Sesión'}
            </button>
          </form>
          <div className="login-demo">
            <strong>Accesos demo:</strong><br/>🛡️ superadmin / super123 &nbsp;·&nbsp; 👑 admin / admin123 &nbsp;·&nbsp; 📋 asistente / asist123
          </div>
        </div>
      </div>
    </div>
  );
}
