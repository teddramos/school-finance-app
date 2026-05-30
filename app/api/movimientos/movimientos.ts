// app/api/movimientos/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { getMovimientos, setMovimientos, getCuentas } from '@/lib/db';

// Helper para obtener usuario autenticado
async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const decoded = await verifyJWT(token);
    return decoded;
  } catch {
    return null;
  }
}

// Verificar si puede editar (admin o asistente)
async function canEdit() {
  const user = await getAuthenticatedUser();
  return user?.role === 'admin' || user?.role === 'asistente';
}

// GET /api/movimientos?year=2025&month=3&tipo=todos
export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
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
    let movimientos = getMovimientos().filter(m => m.periodo === periodo);

    if (tipo !== 'todos') {
      if (tipo !== 'ingreso' && tipo !== 'gasto') {
        return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
      }
      movimientos = movimientos.filter(m => m.tipo === tipo);
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
  const can = await canEdit();
  if (!can) {
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
    const cuentas = getCuentas();
    const cuenta = cuentas.find(c => c.id === cuentaId);
    if (!cuenta) {
      return NextResponse.json({ error: 'Cuenta no existe' }, { status: 400 });
    }
    if (cuenta.tipo !== tipo) {
      return NextResponse.json({ error: `La cuenta no es de tipo ${tipo}` }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    const nuevoMovimiento = {
      id: Date.now(),
      tipo,
      cuentaId,
      monto: montoNum,
      fecha,
      descripcion: descripcion?.trim() || '',
      periodo,
      usuario: user?.name || 'Sistema',
      origen: 'manual',
    };

    const movimientos = getMovimientos();
    setMovimientos([...movimientos, nuevoMovimiento]);

    const { id, ...movimientoSinId } = nuevoMovimiento;
    return NextResponse.json(nuevoMovimiento, { status: 201 });
  } catch (error) {
    console.error('Error POST movimientos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}