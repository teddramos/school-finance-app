// app/api/users/[id]/route.ts - Updated for PostgreSQL
import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db-postgres';

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  let token = cookieStore.get('token')?.value;
  if (!token) {
    try {
      const hdr = headers();
      const auth = hdr.get('authorization') || hdr.get('Authorization');
      if (auth && auth.startsWith('Bearer ')) token = auth.slice(7);
    } catch (e) {}
  }
  if (!token) return null;
  try {
    return await verifyJWT(token);
  } catch {
    return null;
  }
}

async function canManageUsers() {
  const user = await getAuthenticatedUser();
  return user?.role === 'superadmin' || user?.role === 'admin';
}

// PUT /api/users/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const can = await canManageUsers();
  if (!can) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { name, username, password, role, activo } = body;

    if (!name || !username || !role) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const validRoles = ['admin', 'asistente', 'empleado'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }

    // Verificar username único
    const existing = await query('SELECT id FROM usuarios WHERE username = $1 AND id != $2', [username, userId]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'El nombre de usuario ya existe' }, { status: 400 });
    }

    // Si se proporciona contraseña, actualizarla; si no, mantener la existente
    let result;
    if (password && password.trim() !== '') {
      result = await query(
        `UPDATE usuarios SET username=$1, name=$2, role=$3, password=$4, activo=$5, updated_at=CURRENT_TIMESTAMP
         WHERE id=$6 RETURNING id, username, name, role, colegio_id, activo`,
        [username, name, role, password, activo !== false, userId]
      );
    } else {
      result = await query(
        `UPDATE usuarios SET username=$1, name=$2, role=$3, activo=$4, updated_at=CURRENT_TIMESTAMP
         WHERE id=$5 RETURNING id, username, name, role, colegio_id, activo`,
        [username, name, role, activo !== false, userId]
      );
    }

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const u = result.rows[0];
    return NextResponse.json({
      id: u.id, username: u.username, name: u.name, role: u.role, colegioId: u.colegio_id, activo: u.activo,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE /api/users/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const can = await canManageUsers();
  if (!can) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    if (user?.id === userId) {
      return NextResponse.json({ error: 'No puedes eliminar tu propio usuario' }, { status: 400 });
    }

    const result = await query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [userId]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Usuario eliminado' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}