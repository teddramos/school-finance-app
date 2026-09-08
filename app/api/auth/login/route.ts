// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { findUserForAuth, getColegioById } from '@/lib/db';
import { signJWT } from '@/lib/auth';


export async function POST(request: Request) {
  try {
    // Soportar tanto JSON como form data (formularios tradicionales)
    const contentType = request.headers.get('content-type') || '';
    let username: string | undefined;
    let password: string | undefined;
    let colegioIdRaw: string | number | undefined;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      username = body.username;
      password = body.password;
      colegioIdRaw = body.colegioId;
    } else {
      const form = await request.formData();
      username = form.get('username') as string | undefined;
      password = form.get('password') as string | undefined;
      colegioIdRaw = form.get('colegioId') as string | undefined;
    }

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuario y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const colegioId = parseInt(String(colegioIdRaw ?? ''), 10);
    if (!colegioId || isNaN(colegioId)) {
      return NextResponse.json(
        { error: 'Debes seleccionar un colegio' },
        { status: 400 }
      );
    }

    const userForAuth = await findUserForAuth(username);
    console.log('[login] findUserForAuth username=', username, 'userForAuth=', JSON.stringify(userForAuth));
    const colegio = await getColegioById(colegioId);

    console.log('[login] check userForAuth=', !!userForAuth, 'hasPassword=', !!userForAuth?.passwordHash);
    if (userForAuth && userForAuth.passwordHash) {
      const cmp = await comparePassword(password, userForAuth.passwordHash);
      console.log('[login] comparePassword result=', cmp);
      if (!cmp) {
        return NextResponse.json(
          { error: 'Credenciales inválidas' },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    if (!colegio) {
      return NextResponse.json({ error: 'El colegio seleccionado no existe' }, { status: 400 });
    }

    // Los usuarios normales solo pueden entrar a su propio colegio.
    // El superadmin puede entrar a cualquier colegio que seleccione.
    if (userForAuth.role !== 'superadmin' && userForAuth.colegio_id !== colegioId) {
      return NextResponse.json(
        { error: `El usuario no pertenece al colegio "${colegio.nombre}"` },
        { status: 403 }
      );
    }

    // Validar que el colegio esté activo (el superadmin puede entrar aunque esté desactivado)
    if (userForAuth.role !== 'superadmin' && !colegio.activo) {
      return NextResponse.json(
        { error: `El colegio "${colegio.nombre}" está desactivado. Contacte al administrador.` },
        { status: 403 }
      );
    }

    // Crear token JWT (sin incluir password)
    const tokenPayload = {
      id: userForAuth.id,
      username: userForAuth.username,
      role: userForAuth.role,
      name: userForAuth.name,
      colegioId,
    };
    const token = await signJWT(tokenPayload);

    // Si la petición fue JSON (fetch), devolver JSON con token
    if (contentType.includes('application/json')) {
      const response = NextResponse.json({
        user: {
          id: userForAuth.id,
          name: userForAuth.name,
          role: userForAuth.role,
          username: userForAuth.username,
          colegioId,
          colegioNombre: colegio.nombre,
        },
        token,
      });

      // Establecer cookie HttpOnly para el token
      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 8, // 8 horas
      });

      return response;
    }

    // Para formularios tradicionales, redirigir al dashboard y establecer cookie
    const redirectRes = NextResponse.redirect(new URL('/dashboard', request.url), 303);
    redirectRes.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    });
    return redirectRes;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Verificación dual de contraseña:
// - Si el hash está en formato bcrypt modular ($2a$/$2b$/$2y$), usamos bcrypt en Node.
// - Si no, asumimos hash creado con pgcrypto (`crypt($pass, gen_salt('bf', ...))`)
//   y lo verificamos en la BD.
async function comparePassword(plain: string, storedHash: string): Promise<boolean> {
  const stored = storedHash.trim();
  if (!stored) return false;

  const isBcryptFormat = /^\$2[aby]\$/.test(stored);

  if (isBcryptFormat) {
    // bcryptjs.compare es el camino correcto para hashes bcrypt existentes.
    try {
      const bcrypt = await import('bcryptjs');
      return bcrypt.compare(plain, stored);
    } catch (err) {
      console.error('[login] bcrypt.compare falló:', err);
      return false;
    }
  }

  // Fallback pgcrypto para hashes creados con `crypt($pass, gen_salt('bf', ...))`.
  try {
    const { pool } = await import('@/lib/db');
    const res = await pool.query(`SELECT crypt($1, $2) = $2 AS ok`, [plain, stored]);
    return res.rows[0]?.ok === true;
  } catch (err) {
    console.error('[login] pgcrypto compare falló:', err);
    return false;
  }
}

