// app/api/pagos/route.ts
import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { getPagos, setPagos, getFacturas, setFacturas, getPadres, getConfig, getCuentas, getMovimientos, setMovimientos } from '@/lib/db';
import type { Factura, Movimiento } from '@/lib/db';

// Helper para obtener usuario autenticado
async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  let token = cookieStore.get('token')?.value;
  if (!token) {
    try {
      const hdr = headers();
      const auth = hdr.get('authorization') || hdr.get('Authorization');
      if (auth && auth.startsWith('Bearer ')) token = auth.slice(7);
    } catch (e) { }
  }
  if (!token) return null;
  try {
    const decoded = await verifyJWT(token);
    return decoded;
  } catch {
    return null;
  }
}

// Verificar si puede registrar pagos (admin o asistente)
async function canRegisterPayment() {
  const user = await getAuthenticatedUser();
  return user?.role === 'admin' || user?.role === 'asistente';
}

// GET /api/pagos?padreId=123&limit=1
export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const padreId = searchParams.get('padreId');
    const limit = searchParams.get('limit');

    let pagos = getPagos();

    if (padreId) {
      const id = parseInt(padreId);
      if (isNaN(id)) {
        return NextResponse.json({ error: 'padreId inválido' }, { status: 400 });
      }
      pagos = pagos.filter(p => p.padreId === id);
    }

    // Ordenar por fecha descendente
    pagos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    if (limit) {
      const lim = parseInt(limit);
      if (!isNaN(lim) && lim > 0) {
        pagos = pagos.slice(0, lim);
      }
    }

    return NextResponse.json(pagos);
  } catch (error) {
    console.error('Error GET pagos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST /api/pagos - Registrar un pago
export async function POST(request: Request) {
  const can = await canRegisterPayment();
  if (!can) {
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

    // Obtener deudas pendientes del padre (facturas con pagado < monto)
    let facturas = getFacturas();
    let facturasPendientes = facturas
      .filter(f => f.padreId === padreId && f.pagado < f.monto)
      .sort((a, b) => a.periodo.localeCompare(b.periodo));

    if (facturasPendientes.length === 0) {
      // Generar factura para el mes actual si no existe
      const config = getConfig();
      const tarifa = config.tarifa || 1500;
      const padres = getPadres();
      const padre = padres.find(p => p.id === padreId);
      if (!padre) {
        return NextResponse.json({ error: 'Padre no encontrado' }, { status: 404 });
      }
      const periodoActual = new Date().toISOString().slice(0, 7); // YYYY-MM
      const nuevaFactura: Factura = {
        id: Date.now(),
        padreId: padreId as unknown as number,
        periodo: periodoActual,
        monto: padre.hijos.length * tarifa,
        pagado: 0,
        fecha: `${periodoActual}-01`,
        estado: 'pendiente',
      };
      facturas.push(nuevaFactura);
      setFacturas(facturas);
      facturasPendientes = [nuevaFactura];
    }

    // Distribuir el pago entre las facturas pendientes
    let restante = montoNum;
    const facturasCubiertas = [];
    for (const factura of facturasPendientes) {
      if (restante <= 0) break;
      const pendiente = factura.monto - factura.pagado;
      const abono = Math.min(restante, pendiente);
      factura.pagado += abono;
      factura.estado = factura.pagado >= factura.monto ? 'pagado' : 'parcial';
      restante -= abono;
      facturasCubiertas.push({
        id: factura.id,
        periodo: factura.periodo,
        monto: factura.monto,
        abono,
      });
    }

    // Actualizar facturas en la base de datos
    setFacturas(facturas);

    // Generar número de recibo
    const numRecibo = `REC-${Date.now().toString().slice(-8)}`;
    const user = await getAuthenticatedUser();

    const nuevoPago = {
      id: Date.now(),
      numRecibo,
      facturaId: facturasCubiertas[0]?.id,
      padreId,
      monto: montoNum,
      fecha,
      forma,
      ref: referencia,
      cardDigits,
      obs: observacion,
      facturasCubiertas,
      usuario: user?.name || 'Sistema',
      cargos: cargos.filter((c: any) => c.nombre && c.monto > 0),
      descuentosPerfil: descuentoPerfil || 0,
      descuentosAdicionales: descuentosAdicionales.filter((d: any) => d.nombre && d.valor > 0),
      montoBase: montoBase || 0,
    };

    const pagos = getPagos();
    setPagos([...pagos, nuevoPago]);

    // Registrar movimiento contable (ingreso)
    const cuentas = getCuentas();
    const cuentaMensualidad = cuentas.find(c => c.nombre.toLowerCase().includes('mensualidad')) ||
      cuentas.find(c => c.tipo === 'ingreso');
    if (cuentaMensualidad) {
      const periodo = new Date(fecha).toISOString().slice(0, 7);
      const nuevoMovimiento: Movimiento = {
        id: Date.now() + 1000000, // asegurar ID único
        tipo: 'ingreso',
        cuentaId: cuentaMensualidad.id,
        monto: montoNum,
        fecha,
        descripcion: `Mensualidad ${padreId ? `padre ${padreId}` : ''} · ${numRecibo}`,
        periodo,
        usuario: user?.name || 'Sistema',
        origen: 'cobro',
        pagoId: nuevoPago.id,
      };
      const movimientos = getMovimientos();
      setMovimientos([...movimientos, nuevoMovimiento]);
    }
    const padre = getPadres().find(p => p.id === padreId);
    const config = getConfig();
    const pagoResponse = { ...nuevoPago, padre, config };
    return NextResponse.json(pagoResponse, { status: 201 });

    // return NextResponse.json(nuevoPago, { status: 201 });
  } catch (error) {
    console.error('Error POST pago:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}