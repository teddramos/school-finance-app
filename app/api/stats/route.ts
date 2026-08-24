// app/api/stats/route.ts - Updated for PostgreSQL
import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db-postgres';

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
    return await verifyJWT(token);
  } catch {
    return null;
  }
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    let year = parseInt(searchParams.get('year') || '');
    let month = parseInt(searchParams.get('month') || '');
    let colegioId = searchParams.get('colegioId');

    const now = new Date();
    if (isNaN(year)) year = now.getFullYear();
    if (isNaN(month) || month < 1 || month > 12) month = now.getMonth() + 1;

    // Resolver colegioId
    if (!colegioId && user.role === 'superadmin' && !user.colegioId) {
      colegioId = '1';
    }
    if (!colegioId && user.colegioId) {
      colegioId = String(user.colegioId);
    }
    if (!colegioId) {
      return NextResponse.json({ error: 'Colegio no especificado' }, { status: 400 });
    }

    const cid = parseInt(colegioId);
    const periodoActual = `${year}-${String(month).padStart(2, '0')}`;
    const mesNombre = MESES[month - 1];

    // Movimientos del mes
    const movResult = await query(
      'SELECT tipo, monto FROM movimientos WHERE colegio_id = $1 AND periodo = $2',
      [cid, periodoActual]
    );
    const ingresosMes = (movResult.rows as any[]).filter((m: any) => m.tipo === 'ingreso').reduce((s: number, m: any) => s + parseFloat(m.monto), 0);
    const gastosMes = (movResult.rows as any[]).filter((m: any) => m.tipo === 'gasto').reduce((s: number, m: any) => s + parseFloat(m.monto), 0);

    // Pagos del mes
    const pagosResult = await query(
      `SELECT p.monto, p.facturas_cubiertas FROM pagos p
       WHERE p.colegio_id = $1 AND p.fecha LIKE $2`,
      [cid, `${periodoActual}%`]
    );
    const cobradoMes = (pagosResult.rows as any[]).reduce((s: number, p: any) => {
      const covered = p.facturas_cubiertas || [];
      const monthCovered = covered.filter((f: any) => f.periodo === periodoActual);
      if (monthCovered.length > 0) {
        return s + monthCovered.reduce((a: number, f: any) => a + f.abono, 0);
      }
      return s;
    }, 0);

    // Deuda total
    const deudaResult = await query(
      'SELECT COALESCE(SUM(monto - pagado), 0) as deuda FROM facturas WHERE colegio_id = $1 AND estado != $2',
      [cid, 'pagado']
    );
    const deudaTotal = parseFloat(deudaResult.rows[0]?.deuda || 0);

    // Tendencia últimos 6 meses
    const ultimosMeses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const periodo = `${y}-${String(m).padStart(2, '0')}`;
      const movs = await query(
        'SELECT tipo, monto FROM movimientos WHERE colegio_id = $1 AND periodo = $2',
        [cid, periodo]
      );
      const ingresos = ((movs as any).rows as any[]).filter((m: any) => m.tipo === 'ingreso').reduce((s: number, m: any) => s + parseFloat(m.monto), 0);
      const gastos = ((movs as any).rows as any[]).filter((m: any) => m.tipo === 'gasto').reduce((s: number, m: any) => s + parseFloat(m.monto), 0);
      ultimosMeses.push({ label: `${MESES[m-1].slice(0,3)}/${y.toString().slice(-2)}`, ingresos, gastos });
    }

    // Top 5 cuentas
    const cuentasResult = await query(
      `SELECT c.id, c.nombre, c.tipo, COALESCE(SUM(m.monto), 0) as total
       FROM cuentas c LEFT JOIN movimientos m ON m.cuenta_id = c.id AND m.periodo = $2 AND m.colegio_id = $1
       WHERE c.colegio_id = $1 AND c.activo = true
       GROUP BY c.id, c.nombre, c.tipo ORDER BY total DESC LIMIT 5`,
      [cid, periodoActual]
    );

    const balance = ingresosMes - gastosMes;

    return NextResponse.json({
      stats: {
        ingresosMes, gastosMes, cobradoMes, deudaTotal,
        subtitle: `${mesNombre} ${year} · Resumen financiero`,
      },
      chart: ultimosMeses,
      topCuentas: cuentasResult.rows.map((r: any) => ({
        id: r.id, nombre: r.nombre, tipo: r.tipo, total: parseFloat(r.total),
      })),
      balance: { label: `Balance ${mesNombre} ${year}`, value: balance, isPositive: balance >= 0 },
    });
  } catch (error) {
    console.error('Error en /api/stats:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}