// app/api/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { listUsers, updateUser, deleteUser, usernameExists } from '@/lib/db';

// Helper: verificar permisos (admin de su colegio o superadmin global)
async function getAuthorizedAdmin(request: Request) {
  const session = await getSession(request);
  if (!session || (session.role !== 'admin' && session.role !== 'superadmin')) return null;
  return session;
}

async function userInScope(session: any, userId: number): Promise<boolean> {
  const users = await listUsers(session.role === 'superadmin' ? undefined : session.colegioId);
  return users.some((u) => u.id === userId);
}

// PUT /api/users/[id] - Actualizar usuario (solo admin / superadmin)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthorizedAdmin(request);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { name, username, password, role } = body;

    if (!name || !username || !role) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos (name, username, role)' },
        { status: 400 }
      );
    }

    if (!['admin', 'asistente', 'empleado'].includes(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }

    // El usuario debe pertenecer al alcance del admin (su colegio) o ser global (superadmin)
    if (!(await userInScope(session, userId))) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Si se cambia el username, verificar que no exista ya en otro usuario
    if (await usernameExists(username, userId)) {
      return NextResponse.json(
        { error: 'El nombre de usuario ya existe' },
        { status: 400 }
      );
    }

    const updatedUser = await updateUser(userId, {
      name,
      username,
      role,
      ...(password ? { password } : {}), // Solo actualizar contraseña si se envió
    });

    if (!updatedUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const { password: _, ...safeUser } = updatedUser;
    return NextResponse.json(safeUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Eliminar usuario (solo admin / superadmin)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthorizedAdmin(request);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Evitar que el usuario se elimine a sí mismo
    if (userId === session.id) {
      return NextResponse.json(
        { error: 'No puedes eliminar tu propio usuario' },
        { status: 400 }
      );
    }

    if (!(await userInScope(session, userId))) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    await deleteUser(userId);

    return NextResponse.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
