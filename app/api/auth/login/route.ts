// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { query } from '@/lib/db-postgres';
import { signJWT } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let username: string | undefined;
    let password: string | undefined;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      username = body.username;
      password = body.password;
    } else {
      const form = await request.formData();
      username = form.get('username') as string | undefined;
      password = form.get('password') as string | undefined;
    }

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuario y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Buscar usuario en PostgreSQL
    const result = await query(
      'SELECT id, username, password, name, role, colegio_id FROM usuarios WHERE username = $1 AND activo = true',
      [username]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Simple password comparison (in production, use bcrypt)
    if (user.password !== password) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Crear token JWT con escuela
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      colegioId: user.colegio_id,
    };
    const token = await signJWT(tokenPayload);

    // Para JSON (fetch), devolver JSON con token
    if (contentType.includes('application/json')) {
      const response = NextResponse.json({
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          username: user.username,
          colegioId: user.colegio_id,
        },
        token,
      });

      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 8, // 8 horas
      });

      return response;
    }

    // Para formularios tradicionales
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