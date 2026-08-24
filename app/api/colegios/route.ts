// app/api/colegios/route.ts - Colegios management for superadmin
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

async function isSuperadmin() {
  const user = await getAuthenticatedUser();
  return user?.role === 'superadmin';
}

// GET /api/colegios - Listar colegios (superadmin ve todos)
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    if (user.role !== 'superadmin') {
      // Usuarios normales ven solo su colegio
      if (user.colegioId) {
        const result = await query(
          'SELECT * FROM colegios WHERE id = $1 AND activo = true',
          [user.colegioId]
        );
        return NextResponse.json(result.rows);
      }
      return NextResponse.json([]);
    }

    const result = await query(
      'SELECT id, nombre, rif, direccion, telefono, email, director, tarifa, activo FROM colegios ORDER BY nombre'
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error GET colegios:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST /api/colegios - Crear nuevo colegio (solo superadmin)
export async function POST(request: Request) {
  const can = await isSuperadmin();
  if (!can) {
    return NextResponse.json({ error: 'No autorizado. Solo el superadmin puede crear colegios.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { nombre, rif, direccion, telefono, email, director, tarifa } = body;

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre del colegio es requerido' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO colegios (nombre, rif, direccion, telefono, email, director, tarifa)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        nombre.trim(),
        rif?.trim() || '',
        direccion?.trim() || '',
        telefono?.trim() || '',
        email?.trim() || '',
        director?.trim() || '',
        typeof tarifa === 'number' && tarifa > 0 ? tarifa : 1500,
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating colegio:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}