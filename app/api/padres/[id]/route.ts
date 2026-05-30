// app/api/padres/[id]/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { getPadres, setPadres, getFacturas, setFacturas, getPagos, setPagos } from '@/lib/db';

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

// Verificar si puede gestionar padres (admin o asistente)
async function canManagePadres() {
  const user = await getAuthenticatedUser();
  return user?.role === 'admin' || user?.role === 'asistente';
}

// GET /api/padres/[id] - Obtener un padre por ID
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
    const padreId = parseInt(id);
    if (isNaN(padreId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const padres = getPadres();
    const padre = padres.find(p => p.id === padreId);
    if (!padre) {
      return NextResponse.json({ error: 'Padre no encontrado' }, { status: 404 });
    }

    return NextResponse.json(padre);
  } catch (error) {
    console.error('Error GET padre:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PUT /api/padres/[id] - Actualizar un padre (admin o asistente)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const can = await canManagePadres();
  if (!can) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const padreId = parseInt(id);
    if (isNaN(padreId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { nombre, cedula, telefono, email, direccion, hijos, descuentos } = body;

    if (!nombre || !cedula) {
      return NextResponse.json(
        { error: 'Nombre y cédula son requeridos' },
        { status: 400 }
      );
    }

    const padres = getPadres();
    const padreIndex = padres.findIndex(p => p.id === padreId);
    if (padreIndex === -1) {
      return NextResponse.json({ error: 'Padre no encontrado' }, { status: 404 });
    }

    // Verificar que la cédula no esté en uso por otro padre
    const cedulaExists = padres.some(p => p.id !== padreId && p.cedula === cedula);
    if (cedulaExists) {
      return NextResponse.json(
        { error: 'Ya existe otro padre con esa cédula' },
        { status: 400 }
      );
    }

    const updatedPadre = {
      ...padres[padreIndex],
      nombre: nombre.trim(),
      cedula: cedula.trim(),
      telefono: telefono?.trim() || '',
      email: email?.trim() || '',
      direccion: direccion?.trim() || '',
      hijos: hijos || [],
      descuentos: descuentos || [],
    };

    padres[padreIndex] = updatedPadre;
    setPadres(padres);

    return NextResponse.json(updatedPadre);
  } catch (error) {
    console.error('Error PUT padre:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE /api/padres/[id] - Eliminar un padre y sus datos relacionados (admin o asistente)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const can = await canManagePadres();
  if (!can) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const padreId = parseInt(id);
    if (isNaN(padreId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const padres = getPadres();
    const padreExists = padres.some(p => p.id === padreId);
    if (!padreExists) {
      return NextResponse.json({ error: 'Padre no encontrado' }, { status: 404 });
    }

    // Eliminar padre
    const filteredPadres = padres.filter(p => p.id !== padreId);
    setPadres(filteredPadres);

    // Eliminar facturas asociadas
    const facturas = getFacturas();
    const filteredFacturas = facturas.filter(f => f.padreId !== padreId);
    setFacturas(filteredFacturas);

    // Eliminar pagos asociados
    const pagos = getPagos();
    const filteredPagos = pagos.filter(p => p.padreId !== padreId);
    setPagos(filteredPagos);

    return NextResponse.json({ message: 'Padre y sus datos eliminados correctamente' });
  } catch (error) {
    console.error('Error DELETE padre:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}