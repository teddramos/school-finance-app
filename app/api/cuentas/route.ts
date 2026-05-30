// app/api/cuentas/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { getCuentas, setCuentas } from '@/lib/db';

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

// Helper para verificar si es admin
async function isAdmin() {
  const user = await getAuthenticatedUser();
  return user?.role === 'admin';
}

// GET /api/cuentas - Listar todas las cuentas (autenticado)
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const cuentas = getCuentas();
  return NextResponse.json(cuentas);
}

// POST /api/cuentas - Crear nueva cuenta (solo admin)
export async function POST(request: Request) {
  const admin = await isAdmin();
  if (!admin) {
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

    const cuentas = getCuentas();
    const nuevaCuenta = {
      id: Date.now(),
      nombre: nombre.trim(),
      tipo,
      descripcion: descripcion?.trim() || '',
    };

    setCuentas([...cuentas, nuevaCuenta]);
    return NextResponse.json(nuevaCuenta, { status: 201 });
  } catch (error) {
    console.error('Error al crear cuenta:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}