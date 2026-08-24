// app/api/movimientos/route.ts - Updated for PostgreSQL
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
  try { return await verifyJWT(token); } catch { return null; }
}

async function canEdit() {
  const user = await getAuthenticatedUser();
  return user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'asistente';
}

function getColegioId(user: any, url: URL): string | null {
  const sp = url.searchParams;
  let cid = sp.get('colegioId');
  if (!cid && user.role === 'superadmin' && !user.colegioId) cid = '1';
  if (!cid && user.colegioId) cid = String(user.colegioId);
  return cid;
}

// GET /api/movimientos?year=2025&month=3&colegioId=1
export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const cid = getColegioId(user, new URL(request.url));
  if (!cid) return NextResponse.json({ error: 'Colegio no especificado' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || '');
  const month = parseInt(searchParams.get('month') || '');
  const tipo = searchParams.get('tipo') || 'todos';

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
  }

  const periodo = `${year}-${String(month).padStart(2, '0')}`;
  const params: any[] = [parseInt(cid), periodo];
  let sql = 'SELECT * FROM movimientos WHERE colegio_id = $1 AND periodo = $2';
  if (tipo !== 'todos') { sql += ' AND tipo = $3'; params.push(tipo); }
  sql += ' ORDER BY fecha DESC, id DESC';

  const result = await query(sql, params);
  return NextResponse.json(result.rows.map((r: any) => ({
    id: r.id, tipo: r.tipo, cuentaId: r.cuenta_id, monto: parseFloat(r.monto),
    fecha: r.fecha, descripcion: r.descripcion, periodo: r.periodo,
    usuario: r.usuario, origen: r.origen, pagoId: r.pago_id,
  })));
}

// POST /api/movimientos
export async function POST(request: Request) {
  const can = await canEdit();
  if (!can) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const { tipo, cuentaId, monto, fecha, descripcion, periodo, colegioId: bodyCid } = body;
  if (!tipo || !cuentaId || !monto || !fecha || !periodo) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  }

  const user = await getAuthenticatedUser();
  let cid = user?.colegioId;
  if (bodyCid && user?.role === 'superadmin') cid = bodyCid;
  if (!cid) return NextResponse.json({ error: 'Colegio no especificado' }, { status: 400 });

  const cuentaRes = await query('SELECT id FROM cuentas WHERE id = $1 AND colegio_id = $2 AND tipo = $3', [cuentaId, cid, tipo]);
  if (cuentaRes.rows.length === 0) return NextResponse.json({ error: 'Cuenta no existe o tipo incorrecto' }, { status: 400 });

  const result = await query(
    `INSERT INTO movimientos (colegio_id, tipo, cuenta_id, monto, fecha, descripcion, periodo, usuario, origen)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'manual') RETURNING *`,
    [cid, tipo, cuentaId, parseFloat(monto), fecha, descripcion?.trim() || '', periodo, user?.name || 'Sistema']
  );

  const r = result.rows[0];
  return NextResponse.json({
    id: r.id, tipo: r.tipo, cuentaId: r.cuenta_id, monto: parseFloat(r.monto),
    fecha: r.fecha, descripcion: r.descripcion, periodo: r.periodo, usuario: r.usuario, origen: r.origen,
  }, { status: 201 });
}

// DELETE /api/movimientos?id=123
export async function DELETE(request: Request) {
  const can = await canEdit();
  if (!can) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get('id') || '');
  if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

  const movRes = await query('SELECT origen FROM movimientos WHERE id = $1', [id]);
  if (movRes.rows.length === 0) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  if (movRes.rows[0].origen === 'cobro') return NextResponse.json({ error: 'No se puede eliminar' }, { status: 400 });

  await query('DELETE FROM movimientos WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
