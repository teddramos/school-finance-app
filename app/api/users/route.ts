// app/api/users/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { getUsers, setUsers } from '@/lib/db';
import { User } from '@/types';

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

// GET /api/users - Listar todos los usuarios (solo admin)
export async function GET() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const users = getUsers();
  // Ocultar contraseñas
  const safeUsers = users.map(({ password, ...rest }) => rest);
  return NextResponse.json(safeUsers);
}

// POST /api/users - Crear nuevo usuario (solo admin)
export async function POST(request: Request) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, username, password, role } = body;

    if (!name || !username || !password || !role) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos (name, username, password, role)' },
        { status: 400 }
      );
    }

    if (!['admin', 'asistente', 'empleado'].includes(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }

    const users = getUsers();
    // Verificar que el username no exista
    if (users.some(u => u.username === username)) {
      return NextResponse.json(
        { error: 'El nombre de usuario ya existe' },
        { status: 400 }
      );
    }

    const newUser: User = {
      id: Date.now(),
      name,
      username,
      password, // En producción debería ser hasheado con bcrypt
      role,
    };

    setUsers([...users, newUser]);

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