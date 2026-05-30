// app/api/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { getUsers, setUsers } from '@/lib/db';

// Helper para obtener el usuario autenticado y verificar rol admin
async function getAuthenticatedAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const decoded = await verifyJWT(token);
    if (decoded.role !== 'admin') return null;
    return decoded;
  } catch {
    return null;
  }
}

// PUT /api/users/[id] - Actualizar usuario (solo admin)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
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

    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Si se cambia el username, verificar que no exista ya en otro usuario
    if (username !== users[userIndex].username && users.some(u => u.username === username)) {
      return NextResponse.json(
        { error: 'El nombre de usuario ya existe' },
        { status: 400 }
      );
    }

    const updatedUser = {
      ...users[userIndex],
      name,
      username,
      role,
      ...(password ? { password } : {}), // Solo actualizar contraseña si se envió
    };

    users[userIndex] = updatedUser;
    setUsers(users);

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

// DELETE /api/users/[id] - Eliminar usuario (solo admin)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Evitar que el admin se elimine a sí mismo
    if (userId === admin.id) {
      return NextResponse.json(
        { error: 'No puedes eliminar tu propio usuario' },
        { status: 400 }
      );
    }

    const users = getUsers();
    const userExists = users.some(u => u.id === userId);
    if (!userExists) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const filteredUsers = users.filter(u => u.id !== userId);
    setUsers(filteredUsers);

    return NextResponse.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}