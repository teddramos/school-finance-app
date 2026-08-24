// app/api/cuentas/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { listCuentas, createCuenta } from '@/lib/db';

// GET /api/cuentas - Listar todas las cuentas del colegio activo (autenticado)
export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const cuentas = await listCuentas(session.colegioId!);
  return NextResponse.json(cuentas);
}

// POST /api/cuentas - Crear nueva cuenta (solo admin)
export async function POST(request: Request) {
  const session = await getSession(request);
  if (!session || session.role !== 'admin' && session.role !== 'superadmin') {
    return NextResponse.json({ error: 'No autorizado, se requieren permisos de administrador' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { nombre, tipo, descripcion } = body;

    if (!nombre || !tipo || (tipo !== 'ingreso' && tipo !== 'gasto')) {
      return NextResponse.json(
        { error: 'Campos requeridos: nombre, tipo (ingreso/gasto)' },
        { status: 400 }
      );
    }

    const nuevaCuenta = await createCuenta(session.colegioId!, {
      nombre: nombre.trim(),
      tipo,
      descripcion: descripcion?.trim() || '',
    });

    return NextResponse.json(nuevaCuenta, { status: 201 });
  } catch (error) {
    console.error('Error al crear cuenta:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
