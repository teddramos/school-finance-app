// app/api/colegios/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getColegios, createColegio, updateColegio } from '@/lib/db';

// GET /api/colegios
//  - Público (sin sesión): lista mínima para el selector del login.
//  - Autenticado: lista completa (superadmin gestiona colegios).
export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    const colegios = await getColegios();

    if (!session) {
      // Solo lo necesario para el selector de colegio en el login
      return NextResponse.json(colegios.map((c) => ({ id: c.id, nombre: c.nombre })));
    }

    return NextResponse.json(
      colegios.map((c) => ({ id: c.id, nombre: c.nombre, rif: c.rif, telefono: c.telefono, tarifa: Number(c.tarifa), activo: c.activo }))
    );
  } catch (error) {
    console.error('Error GET colegios:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST /api/colegios - Crear colegio (solo superadmin)
export async function POST(request: Request) {
  const session = await getSession(request);
  if (!session || session.role !== 'superadmin') {
    return NextResponse.json({ error: 'No autorizado, se requieren permisos de superadministrador' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { nombre, rif, telefono, email, direccion, director, tarifa } = body;

    if (!nombre || !String(nombre).trim()) {
      return NextResponse.json({ error: 'El nombre del colegio es requerido' }, { status: 400 });
    }

    const nuevoColegio = await createColegio({
      nombre: String(nombre).trim(),
      rif: rif?.trim() || '',
      telefono: telefono?.trim() || '',
      email: email?.trim() || '',
      direccion: direccion?.trim() || '',
      director: director?.trim() || '',
      tarifa: typeof tarifa === 'number' && tarifa > 0 ? tarifa : 1500,
    });

    return NextResponse.json(nuevoColegio, { status: 201 });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Ya existe un colegio con ese nombre' }, { status: 400 });
    }
    console.error('Error POST colegios:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PUT /api/colegios?id=123 - Actualizar datos de un colegio (solo superadmin)
export async function PUT(request: Request) {
  const session = await getSession(request);
  if (!session || session.role !== 'superadmin') {
    return NextResponse.json({ error: 'No autorizado, se requieren permisos de superadministrador' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '');
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { nombre, rif, telefono, email, direccion, director, tarifa } = body;

    const actualizado = await updateColegio(id, {
      nombre: nombre?.trim(),
      rif: rif?.trim(),
      telefono: telefono?.trim(),
      email: email?.trim(),
      direccion: direccion?.trim(),
      director: director?.trim(),
      tarifa: typeof tarifa === 'number' && tarifa > 0 ? tarifa : undefined,
    });

    if (!actualizado) {
      return NextResponse.json({ error: 'Colegio no encontrado' }, { status: 404 });
    }
    return NextResponse.json(actualizado);
  } catch (error) {
    console.error('Error PUT colegios:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
