// app/api/facturas/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { getFacturas, setFacturas, getPadres, getConfig } from '@/lib/db';

// Helper para obtener usuario autenticado
async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const decoded = await verifyJWT(token);
    return decoded;
  } catch {
    return null;
  }
}

// Verificar si puede gestionar facturas (admin o asistente)
async function canManageFacturas() {
  const user = await getAuthenticatedUser();
  return user?.role === 'admin' || user?.role === 'asistente';
}

// GET /api/facturas?padreId=123&estado=pending
export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const padreId = searchParams.get('padreId');
    const estado = searchParams.get('estado'); // 'pending', 'pagado', 'parcial' o undefined

    let facturas = getFacturas();

    if (padreId) {
      const id = parseInt(padreId);
      if (isNaN(id)) {
        return NextResponse.json({ error: 'padreId inválido' }, { status: 400 });
      }
      facturas = facturas.filter(f => f.padreId === id);
    }

    if (estado) {
      if (estado === 'pending') {
        facturas = facturas.filter(f => f.pagado < f.monto);
      } else if (estado === 'pagado') {
        facturas = facturas.filter(f => f.pagado >= f.monto);
      } else if (estado === 'parcial') {
        facturas = facturas.filter(f => f.pagado > 0 && f.pagado < f.monto);
      } else {
        return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
      }
    }

    // Ordenar por periodo ascendente (más antigua primero)
    facturas.sort((a, b) => a.periodo.localeCompare(b.periodo));

    return NextResponse.json(facturas);
  } catch (error) {
    console.error('Error GET facturas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST /api/facturas - Generar facturas para un período (admin o asistente)
// Se espera: { padreId, periodo, monto } o generar para todos los padres del período
export async function POST(request: Request) {
  const can = await canManageFacturas();
  if (!can) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { padreId, periodo, monto, generarAutomatico } = body;

    // Si es generación automática para todos los padres en un período
    if (generarAutomatico && periodo) {
      const config = getConfig();
      const tarifa = config.tarifa || 1500;
      const padres = getPadres();
      const facturasExistentes = getFacturas();
      const nuevasFacturas = [];

      for (const padre of padres) {
        // Verificar si ya existe factura para este período
        const existe = facturasExistentes.some(f => f.padreId === padre.id && f.periodo === periodo);
        if (!existe) {
          const montoFactura = padre.hijos.length * tarifa;
          const nuevaFactura = {
            id: Date.now() + Math.random() * 1000,
            padreId: padre.id,
            periodo,
            monto: montoFactura,
            pagado: 0,
            fecha: `${periodo}-01`,
            estado: 'pendiente' as const,
          };
          nuevasFacturas.push(nuevaFactura);
        }
      }

      if (nuevasFacturas.length > 0) {
        setFacturas([...facturasExistentes, ...nuevasFacturas]);
      }
      return NextResponse.json({ generadas: nuevasFacturas.length, facturas: nuevasFacturas });
    }

    // Crear factura individual para un padre
    if (!padreId || !periodo || !monto) {
      return NextResponse.json(
        { error: 'Se requieren padreId, periodo y monto' },
        { status: 400 }
      );
    }

    const facturas = getFacturas();
    const existe = facturas.some(f => f.padreId === padreId && f.periodo === periodo);
    if (existe) {
      return NextResponse.json(
        { error: 'Ya existe una factura para este padre y período' },
        { status: 400 }
      );
    }

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    }

    const nuevaFactura = {
      id: Date.now(),
      padreId,
      periodo,
      monto: montoNum,
      pagado: 0,
      fecha: `${periodo}-01`,
      estado: 'pendiente' as const,
    };

    setFacturas([...facturas, nuevaFactura]);
    return NextResponse.json(nuevaFactura, { status: 201 });
  } catch (error) {
    console.error('Error POST factura:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}