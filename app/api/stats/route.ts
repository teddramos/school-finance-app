// app/api/stats/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import {
  getMovimientos,
  getPagos,
  getFacturas,
  getPadres,
  getConfig,
  getCuentas,
} from '@/lib/db';

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

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    let year = parseInt(searchParams.get('year') || '');
    let month = parseInt(searchParams.get('month') || '');

    const now = new Date();
    if (isNaN(year)) year = now.getFullYear();
    if (isNaN(month) || month < 1 || month > 12) month = now.getMonth() + 1;

    const periodoActual = `${year}-${String(month).padStart(2, '0')}`;
    const mesIndex = month - 1;
    const mesNombre = MESES[mesIndex];

    // Movimientos del mes
    const movimientosMes = getMovimientos().filter(m => m.periodo === periodoActual);
    const ingresosMes = movimientosMes
      .filter(m => m.tipo === 'ingreso')
      .reduce((sum, m) => sum + m.monto, 0);
    const gastosMes = movimientosMes
      .filter(m => m.tipo === 'gasto')
      .reduce((sum, m) => sum + m.monto, 0);

    // Cobrado en mensualidades: pagos que afectan facturas del mes actual
    const pagosMes = getPagos().filter(p => {
      const facturasCubiertas = p.facturasCubiertas || [];
      return facturasCubiertas.some((f: any) => f.periodo === periodoActual);
    });
    const cobradoMes = pagosMes.reduce((sum, p) => sum + p.monto, 0);

    // Deuda total de todos los padres
    const facturas = getFacturas();
    const deudaTotal = facturas.reduce((sum, f) => sum + (f.monto - f.pagado), 0);

    // Tendencia últimos 6 meses (incluyendo el actual)
    const ultimosMeses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const periodo = `${y}-${String(m).padStart(2, '0')}`;
      const movs = getMovimientos().filter(mv => mv.periodo === periodo);
      const ingresos = movs.filter(mv => mv.tipo === 'ingreso').reduce((s, mv) => s + mv.monto, 0);
      const gastos = movs.filter(mv => mv.tipo === 'gasto').reduce((s, mv) => s + mv.monto, 0);
      ultimosMeses.push({
        label: `${MESES[m-1].slice(0,3)}/${y.toString().slice(-2)}`,
        ingresos,
        gastos,
      });
    }

    // Top 5 cuentas del mes (con mayor monto, según ingresos/gastos combinados)
    const cuentas = getCuentas();
    const cuentasConTotal = cuentas.map(cuenta => {
      const total = movimientosMes
        .filter(m => m.cuentaId === cuenta.id)
        .reduce((sum, m) => sum + m.monto, 0);
      return { ...cuenta, total };
    });
    const topCuentas = cuentasConTotal
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Balance
    const balance = ingresosMes - gastosMes;

    // Configuración del colegio para el subtítulo
    const config = getConfig();

    // Estadísticas para los cards
    const stats = {
      ingresosMes: ingresosMes,
      gastosMes: gastosMes,
      cobradoMes: cobradoMes,
      deudaTotal: deudaTotal,
      subtitle: `${mesNombre} ${year} · Resumen financiero`,
    };

    return NextResponse.json({
      stats,
      chart: ultimosMeses,
      topCuentas,
      balance: {
        label: `Balance ${mesNombre} ${year}`,
        value: balance,
        isPositive: balance >= 0,
      },
    });
  } catch (error) {
    console.error('Error en /api/stats:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}