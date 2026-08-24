// app/api/padres/[id]/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getPadre, updatePadre, deletePadre, padreExistsByCedula,
} from '@/lib/db';

function canManagePadres(role?: string) {
  return role === 'admin' || role === 'asistente' || role === 'superadmin';
}

// GET /api/padres/[id] - Obtener un padre por ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const padreId = parseInt(id);
    if (isNaN(padreId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const padre = await getPadre(session.colegioId!, padreId);
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
  const session = await getSession(request);
  if (!session || !canManagePadres(session.role)) {
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

    // Verificar que la cédula no esté en uso por otro padre del colegio
    if (await padreExistsByCedula(session.colegioId!, cedula.trim(), padreId)) {
      return NextResponse.json(
        { error: 'Ya existe otro padre con esa cédula' },
        { status: 400 }
      );
    }

    const updatedPadre = await updatePadre(session.colegioId!, padreId, {
      nombre: nombre.trim(),
      cedula: cedula.trim(),
      telefono: telefono?.trim() || '',
      email: email?.trim() || '',
      direccion: direccion?.trim() || '',
      hijos: hijos || [],
      descuentos: descuentos || [],
    });

    if (!updatedPadre) {
      return NextResponse.json({ error: 'Padre no encontrado' }, { status: 404 });
    }

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
  const session = await getSession(request);
  if (!session || !canManagePadres(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const padreId = parseInt(id);
    if (isNaN(padreId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const ok = await deletePadre(session.colegioId!, padreId);
    if (!ok) {
      return NextResponse.json({ error: 'Padre no encontrado' }, { status: 404 });
    }

    // La cascada elimina facturas, pagos, hijos y descuentos asociados
    return NextResponse.json({ message: 'Padre y sus datos eliminados correctamente' });
  } catch (error) {
    console.error('Error DELETE padre:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
