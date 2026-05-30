// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { getUsers } from '@/lib/db';
import { signJWT } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    // Soportar tanto JSON como form data (formularios tradicionales)
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

    const users = getUsers();
    const user = users.find(
      (u) => u.username === username && u.password === password
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Crear token JWT (sin incluir password)
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
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