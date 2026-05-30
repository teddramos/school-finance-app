// app/api/padres/route.ts
import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { getPadres, setPadres } from '@/lib/db';

// Helper para obtener usuario autenticado
async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  let token = cookieStore.get('token')?.value;
  // Fallback: Authorization header Bearer <token>
  if (!token) {
    try {
      const hdr = headers();
      const auth = hdr.get('authorization') || hdr.get('Authorization');
      if (auth && auth.startsWith('Bearer ')) {
        token = auth.slice(7);
      }
    } catch (e) {
      // ignore
    }
  }
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

// GET /api/padres?q=texto
export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';

    let padres = getPadres();

    if (query) {
      padres = padres.filter(p =>
        p.nombre.toLowerCase().includes(query) ||
        p.cedula.includes(query)
      );
    }

    // Ordenar por nombre
    padres.sort((a, b) => a.nombre.localeCompare(b.nombre));

    return NextResponse.json(padres);
  } catch (error) {
    console.error('Error GET padres:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST /api/padres - Crear nuevo padre (admin o asistente)
export async function POST(request: Request) {
  const can = await canManagePadres();
  if (!can) {
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

    const padres = getPadres();
    // Verificar cédula única
    if (padres.some(p => p.cedula === cedula)) {
      return NextResponse.json(
        { error: 'Ya existe un padre con esa cédula' },
        { status: 400 }
      );
    }

    const nuevoPadre = {
      id: Date.now(),
      nombre: nombre.trim(),
      cedula: cedula.trim(),
      telefono: telefono?.trim() || '',
      email: email?.trim() || '',
      direccion: direccion?.trim() || '',
      hijos: hijos || [],
      descuentos: descuentos || [],
      activo: true,
    };

    setPadres([...padres, nuevoPadre]);
    return NextResponse.json(nuevoPadre, { status: 201 });
  } catch (error) {
    console.error('Error POST padre:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}