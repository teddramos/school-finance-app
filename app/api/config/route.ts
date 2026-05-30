// app/api/config/route.ts
import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { getConfig, setConfig } from '@/lib/db';

// Helper para obtener usuario autenticado
async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  let token = cookieStore.get('token')?.value;
  if (!token) {
    try {
      const hdr = headers();
      const auth = hdr.get('authorization') || hdr.get('Authorization');
      if (auth && auth.startsWith('Bearer ')) token = auth.slice(7);
    } catch (e) {}
  }
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

// GET /api/config - Obtener configuración del colegio (cualquier usuario autenticado)
export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const config = getConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error GET config:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PUT /api/config - Actualizar configuración (solo admin)
export async function PUT(request: Request) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado, se requieren permisos de administrador' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { nombre, rif, telefono, email, direccion, director, tarifa } = body;

    // Validar campos requeridos
    if (!nombre) {
      return NextResponse.json({ error: 'El nombre del colegio es requerido' }, { status: 400 });
    }

    const config = getConfig();
    const updatedConfig = {
      ...config,
      nombre: nombre.trim(),
      rif: rif?.trim() || '',
      telefono: telefono?.trim() || '',
      email: email?.trim() || '',
      direccion: direccion?.trim() || '',
      director: director?.trim() || '',
      tarifa: typeof tarifa === 'number' && tarifa > 0 ? tarifa : 1500,
    };

    setConfig(updatedConfig);
    return NextResponse.json(updatedConfig);
  } catch (error) {
    console.error('Error PUT config:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}