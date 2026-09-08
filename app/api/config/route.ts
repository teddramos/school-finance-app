// app/api/config/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getColegioById, updateColegio } from '@/lib/db';
import { requireRole } from '@/lib/authorization';
import { auditLogFromSession } from '@/lib/audit';


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
  const session = await requireRole(request, ['admin', 'superadmin']);
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

    await auditLogFromSession(session, 'configuracion_actualizada', {
      colegioId: session.colegioId,
      nombre,
      rif,
      telefono,
      email,
      direccion,
      director,
      tarifa,
    });

    return NextResponse.json(updatedConfig);
  } catch (error) {
    console.error('Error PUT config:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
