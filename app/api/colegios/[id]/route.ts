// app/api/colegios/[id]/route.ts - Single colegio management
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

// GET /api/colegios/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const result = await query('SELECT * FROM colegios WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Colegio no encontrado' }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error GET colegio:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PUT /api/colegios/[id] - Actualizar colegio (solo superadmin)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const can = await isSuperadmin();
  if (!can) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { nombre, rif, direccion, telefono, email, director, tarifa, activo } = body;

    if (!nombre) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const result = await query(
      `UPDATE colegios SET nombre=$1, rif=$2, direccion=$3, telefono=$4, email=$5, director=$6, tarifa=$7, activo=$8, updated_at=CURRENT_TIMESTAMP
       WHERE id=$9 RETURNING *`,
      [nombre.trim(), rif?.trim() || '', direccion?.trim() || '', telefono?.trim() || '',
       email?.trim() || '', director?.trim() || '', tarifa || 1500, activo !== false, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Colegio no encontrado' }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating colegio:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE /api/colegios/[id] - Eliminar colegio (solo superadmin)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const can = await isSuperadmin();
  if (!can) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const result = await query('DELETE FROM colegios WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Colegio no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Colegio eliminado' });
  } catch (error) {
    console.error('Error deleting colegio:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}