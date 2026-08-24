// app/api/users/route.ts - Updated for PostgreSQL
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
    const decoded = await verifyJWT(token);
    return decoded;
  } catch {
    return null;
  }
}

async function canManageUsers() {
  const user = await getAuthenticatedUser();
  return user?.role === 'superadmin' || user?.role === 'admin';
}

// GET /api/users - Listar usuarios (superadmin ve todos, admin ve los del colegio)
export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    let result;
    if (user.role === 'superadmin') {
      // Superadmin ve todos los usuarios
      result = await query(
        'SELECT id, username, name, role, colegio_id, activo FROM usuarios ORDER BY id'
      );
    } else if (user.colegioId) {
      // Admin/asistente/empleado ve los del mismo colegio
      result = await query(
        'SELECT id, username, name, role, colegio_id, activo FROM usuarios WHERE colegio_id = $1 ORDER BY id',
        [user.colegioId]
      );
    } else {
      return NextResponse.json([]);
    }

    const users = result.rows.map((row: any) => ({
      id: row.id,
      username: row.username,
      name: row.name,
      role: row.role,
      colegioId: row.colegio_id,
      activo: row.activo,
    }));

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error GET users:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST /api/users - Crear nuevo usuario (superadmin o admin del colegio)
export async function POST(request: Request) {
  const can = await canManageUsers();
  if (!can) {
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

    const validRoles = ['admin', 'asistente', 'empleado'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }

    // Verificar que el username no exista
    const existing = await query('SELECT id FROM usuarios WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'El nombre de usuario ya existe' }, { status: 400 });
    }

    // Si es admin normal (no superadmin), solo puede crear usuarios para su colegio
    const user = await getAuthenticatedUser();
    const targetColegioId = user?.role === 'superadmin' ? (colegioId || user?.colegioId) : user?.colegioId;

    const result = await query(
      `INSERT INTO usuarios (username, password, name, role, colegio_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, username, name, role, colegio_id`,
      [username, password, name, role, targetColegioId]
    );

    const newUser = result.rows[0];
    return NextResponse.json({
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      role: newUser.role,
      colegioId: newUser.colegio_id,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}