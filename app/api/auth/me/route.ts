// app/api/auth/me/route.ts
import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';
import { getUserById, getColegioById } from '@/lib/db';

export async function GET(request: Request) {
  try {
    let token: string | undefined;
    try {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      token = cookieStore.get('token')?.value;
    } catch {}

    // If no cookie token, try Authorization header (Bearer)
    if (!token) {
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = await verifyJWT(token);
    } catch {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    const user = await getUserById(decoded.id);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // El colegio activo es el seleccionado en el login (contexto de trabajo)
    const colegio = decoded.colegioId ? await getColegioById(decoded.colegioId) : null;

    // Devolver datos del usuario sin contraseña
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        colegioId: colegio?.id ?? user.colegioId,
        colegioNombre: colegio?.nombre ?? user.colegioNombre ?? null,
      },
    });
  } catch (error) {
    console.error('Error en /api/auth/me:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
