// app/api/reporte-mensual/route.ts - Updated for PostgreSQL
import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db-postgres';

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  let token = cookieStore.get('token')?.value;
  if (!token) { try { const hdr = headers(); const auth = hdr.get('authorization') || hdr.get('Authorization'); if (auth?.startsWith('Bearer ')) token = auth.slice(7); } catch (e) {} }
  if (!token) return null;
  try { return await verifyJWT(token); } catch { return null; }
}

// GET /api/reporte-mensual?year=2025&month=8&colegioId=1
export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  let year = parseInt(searchParams.get('year') || '');
  let month = parseInt(searchParams.get('month') || '');
  let cid = searchParams.get('colegioId');

  if (isNaN(year) || isNaN(month)) { const now = new Date(); year = now.getFullYear(); month = now.getMonth() + 1; }
  if (!cid) { if (user.role === 'superadmin' && !user.colegioId) cid = '1'; else if (user.colegioId) cid = String(user.colegioId); }
  if (!cid) return NextResponse.json({ error: 'Colegio no especificado' }, { status: 400 });

  const cId = parseInt(cid);
  const periodo = `${year}-${String(month).padStart(2, '0')}`;
  const movResult = await query(
    `SELECT m.id, m.tipo, m.monto, m.fecha, m.descripcion, m.usuario, c.nombre as cuenta_nombre, c.tipo as cuenta_tipo
     FROM movimientos m LEFT JOIN cuentas c ON c.id = m.cuenta_id
     WHERE m.colegio_id = $1 AND m.periodo = $2 ORDER BY m.fecha DESC`,
    [cId, periodo]
  );
  const configResult = await query('SELECT nombre, rif, direccion, telefono, email, director, tarifa FROM colegios WHERE id = $1', [cId]);
  const config = configResult.rows[0] || {};
  const movs: any[] = movResult.rows.map((r: any) => ({ id: r.id, tipo: r.tipo, monto: parseFloat(r.monto), fecha: r.fecha, descripcion: r.descripcion, usuario: r.usuario, cuentaNombre: r.cuenta_nombre || 'N/A' }));
  const ingresos = movs.filter(m => m.tipo === 'ingreso');
  const gastos = movs.filter(m => m.tipo === 'gasto');
  const totalIngresos = ingresos.reduce((s, m) => s + m.monto, 0);
  const totalGastos = gastos.reduce((s, m) => s + m.monto, 0);
  return NextResponse.json({
    config: { nombre: config.nombre || 'Colegio Las Palmas', rif: config.rif || '', direccion: config.direccion || '', telefono: config.telefono || '', email: config.email || '', director: config.director || '', tarifa: parseFloat(config.tarifa || 1500) },
    periodo, ingresos, gastos, totalIngresos, totalGastos, balance: totalIngresos - totalGastos,
  });
}

