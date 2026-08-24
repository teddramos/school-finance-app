// app/api/padres/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { listPadres, createPadre, padreExistsByCedula } from '@/lib/db';

// Verificar si puede gestionar padres (admin o asistente)
function canManagePadres(role?: string) {
  return role === 'admin' || role === 'asistente' || role === 'superadmin';
}

// GET /api/padres?q=texto
export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';

    let padres = await listPadres(session.colegioId!, query || undefined);

    if (query) {
      padres = padres.filter(p =>
        p.nombre.toLowerCase().includes(query) ||
        p.cedula.includes(query)
      );
    }

    return NextResponse.json(padres);
  } catch (error) {
    console.error('Error GET padres:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST /api/padres - Crear nuevo padre (admin o asistente)
export async function POST(request: Request) {
  const session = await getSession(request);
  if (!session || !canManagePadres(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { nombre, cedula, telefono, email, direccion, hijos, descuentos } = body;

    if (!nombre || !cedula) {
      return NextResponse.json(
        { error: 'Nombre y cédula son requeridos' },
        { status: 400 }
      );
    }

    // Verificar cédula única dentro del colegio
    if (await padreExistsByCedula(session.colegioId!, cedula.trim())) {
      return NextResponse.json(
        { error: 'Ya existe un padre con esa cédula' },
        { status: 400 }
      );
    }

    const nuevoPadre = await createPadre(session.colegioId!, {
      nombre: nombre.trim(),
      cedula: cedula.trim(),
      telefono: telefono?.trim() || '',
      email: email?.trim() || '',
      direccion: direccion?.trim() || '',
      hijos: hijos || [],
      descuentos: descuentos || [],
    });

    return NextResponse.json(nuevoPadre, { status: 201 });
  } catch (error) {
    console.error('Error POST padre:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
