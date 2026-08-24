// app/api/config/route.ts - Updated for PostgreSQL
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

// GET /api/config?colegioId=1
export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    let colegioId = searchParams.get('colegioId');
    
    // Si es superadmin sin especificar colegio, usar el default (1)
    if (!colegioId && user.role === 'superadmin' && !user.colegioId) {
      colegioId = '1';
    }
    
    // Si no es superadmin, usar su colegio
    if (!colegioId && user.colegioId) {
      colegioId = String(user.colegioId);
    }

    if (!colegioId) {
      return NextResponse.json({ error: 'Colegio no especificado' }, { status: 400 });
    }

    const result = await query('SELECT * FROM colegios WHERE id = $1', [colegioId]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Colegio no encontrado' }, { status: 404 });
    }

    const c = result.rows[0];
    return NextResponse.json({
      nombre: c.nombre,
      rif: c.rif,
      telefono: c.telefono,
      email: c.email,
      direccion: c.direccion,
      director: c.director,
      tarifa: c.tarifa,
    });
  } catch (error) {
    console.error('Error GET config:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PUT /api/config
export async function PUT(request: Request) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { nombre, rif, telefono, email, direccion, director, tarifa, colegioId } = body;

    if (!nombre) {
      return NextResponse.json({ error: 'El nombre del colegio es requerido' }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    const targetId = user?.role === 'superadmin' ? (colegioId || user?.colegioId || 1) : (user?.colegioId || 1);

    const result = await query(
      `UPDATE colegios SET nombre=$1, rif=$2, telefono=$3, email=$4, direccion=$5, director=$6, tarifa=$7, updated_at=CURRENT_TIMESTAMP
       WHERE id=$8 RETURNING *`,
      [nombre.trim(), rif?.trim() || '', telefono?.trim() || '', email?.trim() || '',
       direccion?.trim() || '', director?.trim() || '', typeof tarifa === 'number' && tarifa > 0 ? tarifa : 1500, targetId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Colegio no encontrado' }, { status: 404 });
    }

    const c = result.rows[0];
    return NextResponse.json({
      nombre: c.nombre, rif: c.rif, telefono: c.telefono, email: c.email,
      direccion: c.direccion, director: c.director, tarifa: c.tarifa,
    });
  } catch (error) {
    console.error('Error PUT config:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}