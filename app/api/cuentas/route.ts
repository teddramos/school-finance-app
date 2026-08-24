// app/api/cuentas/route.ts - Updated for PostgreSQL
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

async function isAdmin() {
  const user = await getAuthenticatedUser();
  return user?.role === 'superadmin' || user?.role === 'admin';
}

// GET /api/cuentas
export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const colegioId = searchParams.get('colegioId');

    let result;
    if (colegioId) {
      result = await query(
        'SELECT id, nombre, tipo, descripcion, activo FROM cuentas WHERE colegio_id = $1 ORDER BY tipo, nombre',
        [colegioId]
      );
    } else if (user.colegioId) {
      result = await query(
        'SELECT id, nombre, tipo, descripcion, activo FROM cuentas WHERE colegio_id = $1 ORDER BY tipo, nombre',
        [user.colegioId]
      );
    } else {
      return NextResponse.json([]);
    }

    return NextResponse.json(result.rows.map((r: any) => ({
      id: r.id, nombre: r.nombre, tipo: r.tipo, descripcion: r.descripcion, activo: r.activo,
    })));
  } catch (error) {
    console.error('Error GET cuentas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST /api/cuentas
export async function POST(request: Request) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { nombre, tipo, descripcion, colegioId } = body;

    if (!nombre || !tipo || (tipo !== 'ingreso' && tipo !== 'gasto')) {
      return NextResponse.json({ error: 'Campos requeridos: nombre, tipo (ingreso/gasto)' }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    const targetColegioId = user?.role === 'superadmin' ? (colegioId || user?.colegioId) : user?.colegioId;

    if (!targetColegioId) {
      return NextResponse.json({ error: 'Colegio no especificado' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO cuentas (colegio_id, nombre, tipo, descripcion) VALUES ($1, $2, $3, $4) RETURNING *`,
      [targetColegioId, nombre.trim(), tipo, descripcion?.trim() || '']
    );

    const r = result.rows[0];
    return NextResponse.json({ id: r.id, nombre: r.nombre, tipo: r.tipo, descripcion: r.descripcion }, { status: 201 });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese nombre' }, { status: 400 });
    }
    console.error('Error POST cuenta:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}