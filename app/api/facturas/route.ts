// app/api/facturas/route.ts - Updated for PostgreSQL
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

async function canManage() { const u = await getAuthenticatedUser(); return u?.role === 'superadmin' || u?.role === 'admin' || u?.role === 'asistente'; }

function getColegioId(user: any, params: URLSearchParams): number | null {
  let cid = params.get('colegioId');
  if (!cid && user.role === 'superadmin' && !user.colegioId) cid = '1';
  if (!cid && user.colegioId) cid = String(user.colegioId);
  return cid ? parseInt(cid) : null;
}

// GET /api/facturas?colegioId=1&padreId=101
export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const cid = getColegioId(user, searchParams);
  if (!cid) return NextResponse.json({ error: 'Colegio no especificado' }, { status: 400 });
  const padreId = searchParams.get('padreId');
  const estado = searchParams.get('estado');
  const params: any[] = [cid];
  let sql = 'SELECT id, padre_id, periodo, monto, pagado, fecha, estado FROM facturas WHERE colegio_id = $1';
  if (padreId) { sql += ' AND padre_id = $' + (params.length + 1); params.push(parseInt(padreId)); }
  if (estado === 'pending') sql += ' AND pagado < monto';
  else if (estado === 'pagado') sql += ' AND pagado >= monto';
  else if (estado === 'parcial') sql += ' AND pagado > 0 AND pagado < monto';
  sql += ' ORDER BY periodo ASC';
  const result = await query(sql, params);
  return NextResponse.json(result.rows.map((r: any) => ({ id: r.id, padreId: r.padre_id, periodo: r.periodo, monto: parseFloat(r.monto), pagado: parseFloat(r.pagado), fecha: r.fecha, estado: r.estado })));
}

// POST /api/facturas
export async function POST(request: Request) {
  const can = await canManage();
  if (!can) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const body = await request.json();
  const { padreId, periodo, monto, generarAutomatico, colegioId: bodyCid } = body;
  const user = await getAuthenticatedUser();
  let cid = user?.colegioId;
  if (bodyCid && user?.role === 'superadmin') cid = bodyCid;
  if (!cid) return NextResponse.json({ error: 'Colegio no especificado' }, { status: 400 });

  if (generarAutomatico && periodo) {
    // Generate for all active parents
    const configResult = await query('SELECT tarifa FROM colegios WHERE id = $1', [cid]);
    const tarifa = parseFloat(configResult.rows[0]?.tarifa || 1500);
    const padresResult = await query('SELECT id FROM padres WHERE colegio_id = $1 AND activo = true', [cid]);
    let count = 0;
    for (const p of padresResult.rows) {
      const hijosResult = await query('SELECT COUNT(*) as cnt FROM hijos h JOIN padres_hijos ph ON ph.hijo_id = h.id WHERE ph.padre_id = $1 AND h.activo = true', [p.id]);
      const numHijos = parseInt(hijosResult.rows[0]?.cnt || 0);
      const montoPadre = numHijos * tarifa;
      const existente = await query('SELECT id FROM facturas WHERE padre_id = $1 AND periodo = $2', [p.id, periodo]);
      if (existente.rows.length === 0) {
        await query('INSERT INTO facturas (colegio_id, padre_id, periodo, monto, pagado, fecha, estado) VALUES ($1, $2, $3, $4, 0, $5, $6)', [cid, p.id, periodo, montoPadre, `${periodo}-01`, 'pendiente']);
        count++;
      }
    }
    return NextResponse.json({ generadas: count });
  }

  if (!padreId || !periodo || !monto) return NextResponse.json({ error: 'Se requieren padreId, periodo y monto' }, { status: 400 });
  const existente = await query('SELECT id FROM facturas WHERE padre_id = $1 AND periodo = $2', [padreId, periodo]);
  if (existente.rows.length > 0) return NextResponse.json({ error: 'Ya existe factura para este padre y período' }, { status: 400 });
  const result = await query('INSERT INTO facturas (colegio_id, padre_id, periodo, monto, pagado, fecha, estado) VALUES ($1, $2, $3, $4, 0, $5, $6) RETURNING *',
    [cid, padreId, periodo, parseFloat(monto), `${periodo}-01`, 'pendiente']);
  const r = result.rows[0];
  return NextResponse.json({ id: r.id, padreId: r.padre_id, periodo: r.periodo, monto: parseFloat(r.monto), pagado: 0, fecha: r.fecha, estado: r.estado }, { status: 201 });
}

