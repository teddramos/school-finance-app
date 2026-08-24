// app/api/users/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { listUsers, createUser, usernameExists } from '@/lib/db';

// GET /api/users - Listar usuarios (admin: su colegio · superadmin: todos o ?colegioId=)
export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session || session.role !== 'admin' && session.role !== 'superadmin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    let colegioId = session.colegioId ?? undefined;
    if (session.role === 'superadmin') {
      const qId = parseInt(searchParams.get('colegioId') || '');
      colegioId = isNaN(qId) ? undefined : qId; // superadmin sin filtro ve todo
    }
    const users = await listUsers(colegioId);
    // Ocultar contraseñas
    const safeUsers = users.map(({ password, ...rest }) => rest);
    return NextResponse.json(safeUsers);
  } catch (error) {
    console.error('Error GET users:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST /api/users - Crear usuario
//  - admin: crea usuarios de su propio colegio
//  - superadmin: crea usuarios para cualquier colegio (body.colegioId)
export async function POST(request: Request) {
  const session = await getSession(request);
  if (!session || session.role !== 'admin' && session.role !== 'superadmin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, username, password, role, colegioId } = body;

    if (!name || !username || !password || !role) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos (name, username, password, role)' },
        { status: 400 }
      );
    }

    if (!['admin', 'asistente', 'empleado'].includes(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }

    // Determinar colegio destino
    let targetColegioId: number | null;
    if (session.role === 'superadmin') {
      targetColegioId = parseInt(String(colegioId ?? ''), 10);
      if (isNaN(targetColegioId)) {
        return NextResponse.json({ error: 'Debe seleccionar el colegio del usuario' }, { status: 400 });
      }
    } else {
      targetColegioId = session.colegioId;
    }

    // Verificar que el username no exista
    if (await usernameExists(username)) {
      return NextResponse.json(
        { error: 'El nombre de usuario ya existe' },
        { status: 400 }
      );
    }

    const newUser = await createUser({
      colegioId: targetColegioId,
      name,
      username,
      password,
      role,
    });

    const { password: _, ...safeUser } = newUser;
    return NextResponse.json(safeUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
