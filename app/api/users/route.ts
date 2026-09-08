// app/api/users/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { listUsers, createUser, usernameExists } from '@/lib/db';
import type { Role } from '@/types';
import { isConfigRole, unauthorized } from '@/lib/authorization';
import { auditLog } from '@/lib/audit';

// GET /api/users - Listar usuarios (admin: su colegio · superadmin: todos o ?colegioId=)
export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session || !isConfigRole(session.role)) {
    return NextResponse.json({ error: unauthorized() }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    let colegioId = session.colegioId ?? undefined;
    if (session.role === 'superadmin') {
      const qId = parseInt(searchParams.get('colegioId') || '');
      colegioId = isNaN(qId) ? undefined : qId; // superadmin sin filtro ve todo
    }
    const users = await listUsers(colegioId);
    // Ocultar contraseñas (SessionUser ya no incluye password en la mayoría de los paths)
    const safeUsers = users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      colegioId: u.colegioId,
      colegioNombre: u.colegioNombre,
    }));
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
  const session = await getSession(request);  if (!session || !isConfigRole(session.role)) {
    return NextResponse.json({ error: unauthorized() }, { status: 401 });
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

    const roleTyped = role as Role;
    if (!['admin', 'asistente', 'empleado'].includes(roleTyped)) {
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

    const newUser = await createUser(
      {
        colegioId: targetColegioId,
        name,
        username,
        password,
        role: roleTyped,
      },
      {
        id: session.id,
        name: session.name,
        role: session.role,
      }
    );

    return NextResponse.json({
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      role: newUser.role,
      colegioId: newUser.colegioId,
      colegioNombre: newUser.colegioNombre,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
