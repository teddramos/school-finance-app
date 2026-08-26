// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { findUserByUsername, getColegioById } from '@/lib/db';
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

    const user = await findUserByUsername(username);
    const colegio = await getColegioById(colegioId);

    if (!user || !user.password || !(await comparePassword(password, user.password))) {
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
    if (user.role !== 'superadmin' && user.colegioId !== colegioId) {
      return NextResponse.json(
        { error: `El usuario no pertenece al colegio "${colegio.nombre}"` },
        { status: 403 }
      );
    }

    // Validar que el colegio esté activo (el superadmin puede entrar aunque esté desactivado)
    if (user.role !== 'superadmin' && !colegio.activo) {
      return NextResponse.json(
        { error: `El colegio "${colegio.nombre}" está desactivado. Contacte al administrador.` },
        { status: 403 }
      );
    }

    // Crear token JWT (sin incluir password)
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      colegioId,
    };
    const token = await signJWT(tokenPayload);

    // Si la petición fue JSON (fetch), devolver JSON con token
    if (contentType.includes('application/json')) {
      const response = NextResponse.json({
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          username: user.username,
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

// Verificación bcrypt vía pgcrypto (hash guardado en BD)
async function comparePassword(plain: string, storedHash: string): Promise<boolean> {
  const { pool } = await import('@/lib/db');
  try {
    const res = await pool.query(`SELECT crypt($1, $2) = $2 AS ok`, [plain, storedHash]);
    return res.rows[0]?.ok === true;
  } catch {
    return false;
  }
}
