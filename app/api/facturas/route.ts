// app/api/facturas/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  listFacturas, createFactura, facturaExists,
  generarFacturasAutomatico, getDistinctFacturaPeriodos,
} from '@/lib/db';

// Verificar si puede gestionar facturas (admin o asistente)
function canManageFacturas(role?: string) {
  return role === 'admin' || role === 'asistente' || role === 'superadmin';
}

// GET /api/facturas?padreId=123&estado=pending&q=search&limit=20&offset=0
export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const padreId = searchParams.get('padreId');
    const estado = searchParams.get('estado');
    const q = searchParams.get('q') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    let estadoFiltro: 'pendiente' | 'pagado' | 'parcial' | undefined;
    if (estado) {
      if (estado === 'pending') estadoFiltro = 'pendiente';
      else if (estado === 'pagado') estadoFiltro = 'pagado';
      else if (estado === 'parcial') estadoFiltro = 'parcial';
      else {
        return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
      }
    }

    const result = await listFacturas(session.colegioId!, {
      padreId: padreId ? parseInt(padreId) : undefined,
      estado: estadoFiltro,
      q,
      limit,
      offset,
    });

    const periodos = await getDistinctFacturaPeriodos(session.colegioId!);

    return NextResponse.json({ ...result, periodos });
  } catch (error) {
    console.error('Error GET facturas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST /api/facturas - Generar facturas para un período (admin o asistente)
// Se espera: { padreId, periodo, monto } o generar para todos los padres del período
export async function POST(request: Request) {
  const session = await getSession(request);
  if (!session || !canManageFacturas(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { padreId, periodo, monto, generarAutomatico } = body;

    // Si es generación automática para todos los padres en un período
    if (generarAutomatico && periodo) {
      const resultado = await generarFacturasAutomatico(session.colegioId!, periodo);
      return NextResponse.json(resultado);
    }

    // Crear factura individual para un padre
    if (!padreId || !periodo || !monto) {
      return NextResponse.json(
        { error: 'Se requieren padreId, periodo y monto' },
        { status: 400 }
      );
    }

    if (await facturaExists(session.colegioId!, padreId, periodo)) {
      return NextResponse.json(
        { error: 'Ya existe una factura para este padre y período' },
        { status: 400 }
      );
    }

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    }

    const nuevaFactura = await createFactura(session.colegioId!, {
      padreId,
      periodo,
      monto: montoNum,
    });

    return NextResponse.json(nuevaFactura, { status: 201 });
  } catch (error) {
    console.error('Error POST factura:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
