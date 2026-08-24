// app/api/movimientos/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { listMovimientos, createMovimiento, deleteMovimiento, getCuentaTipo } from '@/lib/db';

// GET /api/movimientos?year=2025&month=3&tipo=todos
export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '');
    const month = parseInt(searchParams.get('month') || '');
    const tipo = searchParams.get('tipo') || 'todos';

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Parámetros year y month inválidos' }, { status: 400 });
    }

    const periodo = `${year}-${String(month).padStart(2, '0')}`;
    let movimientos = await listMovimientos(session.colegioId!, { periodo });

    if (tipo !== 'todos') {
      if (tipo !== 'ingreso' && tipo !== 'gasto') {
        return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
      }
      movimientos = movimientos.filter((m) => m.tipo === tipo);
    }

    // Ordenar por fecha descendente
    movimientos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    return NextResponse.json(movimientos);
  } catch (error) {
    console.error('Error GET movimientos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST /api/movimientos - Crear movimiento (admin o asistente)
export async function POST(request: Request) {
  const session = await getSession(request);
  if (!session || session.role !== 'admin' && session.role !== 'asistente' && session.role !== 'superadmin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
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

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    }

    // Verificar que la cuenta exista y coincida el tipo
    const cuentaTipo = await getCuentaTipo(session.colegioId!, parseInt(cuentaId));
    if (!cuentaTipo) {
      return NextResponse.json({ error: 'Cuenta no existe' }, { status: 400 });
    }
    if (cuentaTipo !== tipo) {
      return NextResponse.json({ error: `La cuenta no es de tipo ${tipo}` }, { status: 400 });
    }

    const nuevoMovimiento = await createMovimiento(session.colegioId!, {
      tipo,
      cuentaId: parseInt(cuentaId),
      monto: montoNum,
      fecha,
      descripcion: descripcion?.trim() || '',
      periodo,
    }, session.name || 'Sistema');

    return NextResponse.json(nuevoMovimiento, { status: 201 });
  } catch (error) {
    console.error('Error POST movimientos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE /api/movimientos?id=123
export async function DELETE(request: Request) {
  const session = await getSession(request);
  if (!session || session.role !== 'admin' && session.role !== 'asistente' && session.role !== 'superadmin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '');
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const result = await deleteMovimiento(session.colegioId!, id);
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
