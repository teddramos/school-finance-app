// app/api/pagos/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  listPagos, registerPago, getPadre, getColegioById,
} from '@/lib/db';
import { getDistinctPagoMeses } from '@/lib/db';

// Verificar si puede registrar pagos (admin o asistente)
function canRegisterPayment(role?: string) {
  return role === 'admin' || role === 'asistente' || role === 'superadmin';
}

// GET /api/pagos?padreId=123&limit=20&offset=0&q=search&forma=efectivo&mes=2026-01
export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const padreId = searchParams.get('padreId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
    const q = searchParams.get('q') || undefined;
    const forma = searchParams.get('forma') || undefined;
    const mes = searchParams.get('mes') || undefined;
    const facturaId = searchParams.get('facturaId') ? parseInt(searchParams.get('facturaId')!) : undefined;

    const result = await listPagos(session.colegioId!, {
      padreId: padreId ? parseInt(padreId) : undefined,
      limit,
      offset,
      q,
      forma,
      mes,
      facturaId,
    });

    const meses = await getDistinctPagoMeses(session.colegioId!);

    return NextResponse.json({ ...result, meses });
  } catch (error) {
    console.error('Error GET pagos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST /api/pagos - Registrar un pago
export async function POST(request: Request) {
  const session = await getSession(request);
  if (!session || !canRegisterPayment(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      padreId,
      monto,
      fecha,
      forma,
      referencia,
      cardDigits,
      observacion,
      montoBase,
      descuentoPerfil,
      cargos = [],
      descuentosAdicionales = [],
    } = body;

    if (!padreId || !monto || !fecha || !forma) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: padreId, monto, fecha, forma' },
        { status: 400 }
      );
    }

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    }

    const padre = await getPadre(session.colegioId!, parseInt(padreId));
    if (!padre) {
      return NextResponse.json({ error: 'Padre no encontrado' }, { status: 404 });
    }

    // Registrar el pago (transacción): distribuye entre facturas pendientes,
    // guarda recibo + relaciones y genera el movimiento contable.
    const nuevoPago = await registerPago(session.colegioId!, {
      padreId: parseInt(padreId),
      monto: montoNum,
      fecha,
      forma,
      ref: referencia,
      cardDigits,
      obs: observacion,
      montoBase: montoBase ? parseFloat(montoBase) : 0,
      descuentoPerfil: descuentoPerfil ? parseFloat(descuentoPerfil) : 0,
      cargos: cargos.filter((c: any) => c.nombre && c.monto > 0),
      descuentosAdicionales: descuentosAdicionales.filter((d: any) => d.nombre && d.valor > 0),
    }, session.name || 'Sistema');

    const config = await getColegioById(session.colegioId!);
    const pagoResponse = { ...nuevoPago, padre, config };
    return NextResponse.json(pagoResponse, { status: 201 });
  } catch (error) {
    console.error('Error POST pago:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
