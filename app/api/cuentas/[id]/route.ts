// app/api/cuentas/[id]/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateCuenta, deleteCuenta } from '@/lib/db';

// PUT /api/cuentas/[id] - Actualizar cuenta (solo admin)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session || session.role !== 'admin' && session.role !== 'superadmin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const cuentaId = parseInt(id);
    if (isNaN(cuentaId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { nombre, tipo, descripcion } = body;

    if (!nombre || !tipo || (tipo !== 'ingreso' && tipo !== 'gasto')) {
      return NextResponse.json(
        { error: 'Campos requeridos: nombre, tipo (ingreso/gasto)' },
        { status: 400 }
      );
    }

    const actualizada = await updateCuenta(session.colegioId!, cuentaId, {
      nombre: nombre.trim(),
      tipo,
      descripcion: descripcion?.trim() || '',
    });

    if (!actualizada) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
    }

    return NextResponse.json(actualizada);
  } catch (error) {
    console.error('Error updating cuenta:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE /api/cuentas/[id] - Eliminar cuenta y sus movimientos (solo admin)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session || session.role !== 'admin' && session.role !== 'superadmin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const cuentaId = parseInt(id);
    if (isNaN(cuentaId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const ok = await deleteCuenta(session.colegioId!, cuentaId);
    if (!ok) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Cuenta eliminada correctamente' });
  } catch (error) {
    console.error('Error deleting cuenta:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
