// app/api/movimientos/[id]/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateMovimiento, deleteMovimiento, getCuentaTipo } from '@/lib/db';

function canEdit(role?: string) {
  return role === 'admin' || role === 'asistente' || role === 'superadmin';
}

// PUT /api/movimientos/[id] - Actualizar movimiento manual (admin o asistente)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session || !canEdit(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const movId = parseInt(id);
    if (isNaN(movId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { tipo, cuentaId, monto, fecha, descripcion, periodo } = body;

    if (!tipo || !cuentaId || !monto || !fecha || !periodo) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: tipo, cuentaId, monto, fecha, periodo' },
        { status: 400 }
      );
    }
    if (tipo !== 'ingreso' && tipo !== 'gasto') {
      return NextResponse.json({ error: 'Tipo debe ser ingreso o gasto' }, { status: 400 });
    }

    const cuentaTipo = await getCuentaTipo(session.colegioId!, parseInt(cuentaId));
    if (!cuentaTipo) {
      return NextResponse.json({ error: 'Cuenta no existe' }, { status: 400 });
    }
    if (cuentaTipo !== tipo) {
      return NextResponse.json({ error: `La cuenta no es de tipo ${tipo}` }, { status: 400 });
    }

    const actualizado = await updateMovimiento(session.colegioId!, movId, {
      tipo,
      cuentaId: parseInt(cuentaId),
      monto: parseFloat(monto),
      fecha,
      descripcion: descripcion?.trim() || '',
      periodo,
    });

    if (!actualizado) {
      return NextResponse.json({ error: 'Movimiento no encontrado o generado por cobro' }, { status: 404 });
    }

    return NextResponse.json(actualizado);
  } catch (error) {
    console.error('Error PUT movimiento:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE /api/movimientos/[id] - Eliminar movimiento manual (admin o asistente)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session || !canEdit(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const movId = parseInt(id);
    if (isNaN(movId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const result = await deleteMovimiento(session.colegioId!, movId);
    if (!result.ok) {
      if (result.motivo === 'cobro') {
        return NextResponse.json({ error: 'No se puede eliminar un movimiento generado por cobro' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error DELETE movimiento:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
