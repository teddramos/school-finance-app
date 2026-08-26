// app/api/colegios/logo/route.ts
// POST /api/colegios/logo?id=123 - Subir logo del colegio (solo superadmin)
// Guarda el logo como data URI base64 en la columna logo_url de la tabla colegios.
// Límite: 2 MB. Formatos: PNG, JPG, SVG, WEBP.
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateColegio } from '@/lib/db';

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']);

export async function POST(request: Request) {
  const session = await getSession(request);
  if (!session || session.role !== 'superadmin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '');
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('logo') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 });
    }

    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: 'Formato no soportado. Use PNG, JPG, SVG o WEBP.' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'El archivo excede 2 MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    const actualizado = await updateColegio(id, { logo_url: dataUri });
    if (!actualizado) {
      return NextResponse.json({ error: 'Colegio no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ logo_url: dataUri });
  } catch (error) {
    console.error('Error subiendo logo:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE /api/colegios/logo?id=123 - Eliminar logo del colegio
export async function DELETE(request: Request) {
  const session = await getSession(request);
  if (!session || session.role !== 'superadmin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '');
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const actualizado = await updateColegio(id, { logo_url: '' });
    if (!actualizado) {
      return NextResponse.json({ error: 'Colegio no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error eliminando logo:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
