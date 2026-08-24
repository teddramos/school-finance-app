// app/api/config/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getColegioById, updateColegio } from '@/lib/db';

// Helper para verificar si es admin
async function isAdmin(request: Request) {
  const session = await getSession(request);
  return session?.role === 'admin' || session?.role === 'superadmin' ? session : null;
}

// GET /api/config - Obtener configuración del colegio activo (autenticado)
export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    if (!session.colegioId) {
      return NextResponse.json({ error: 'Sin colegio activo' }, { status: 400 });
    }
    const config = await getColegioById(session.colegioId);
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error GET config:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PUT /api/config - Actualizar configuración del colegio activo (solo admin)
export async function PUT(request: Request) {
  const session = await isAdmin(request);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado, se requieren permisos de administrador' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { nombre, rif, telefono, email, direccion, director, tarifa } = body;

    // Validar campos requeridos
    if (!nombre) {
      return NextResponse.json({ error: 'El nombre del colegio es requerido' }, { status: 400 });
    }

    const updatedConfig = await updateColegio(session.colegioId!, {
      nombre: nombre.trim(),
      rif: rif?.trim() || '',
      telefono: telefono?.trim() || '',
      email: email?.trim() || '',
      direccion: direccion?.trim() || '',
      director: director?.trim() || '',
      tarifa: typeof tarifa === 'number' && tarifa > 0 ? tarifa : undefined,
    });

    return NextResponse.json(updatedConfig);
  } catch (error) {
    console.error('Error PUT config:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
