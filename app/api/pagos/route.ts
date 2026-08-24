// app/api/pagos/route.ts - Updated for PostgreSQL
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

async function canRegisterPayment() {
  const user = await getAuthenticatedUser();
  return user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'asistente';
}

function getColegioId(user: any): number | null {
  if (user.role === 'superadmin' && !user.colegioId) return 1;
  return user.colegioId || null;
}

// GET /api/pagos?colegioId=1&padreId=101
export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  let cid = searchParams.get('colegioId');
  if (!cid) { const c = getColegioId(user); if (c) cid = String(c); }
  if (!cid) return NextResponse.json({ error: 'Colegio no especificado' }, { status: 400 });
  const padreId = searchParams.get('padreId');
  const limit = searchParams.get('limit');
  const params: any[] = [parseInt(cid)];
  let sql = 'SELECT * FROM pagos WHERE colegio_id = $1';
  if (padreId) { sql += ' AND padre_id = $2'; params.push(parseInt(padreId)); }
  sql += ' ORDER BY fecha DESC, id DESC';
  if (limit) sql += ' LIMIT ' + parseInt(limit);
  const result = await query(sql, params);
  return NextResponse.json(result.rows.map((r: any) => ({
    id: r.id, numRecibo: r.num_recibo, padreId: r.padre_id, monto: parseFloat(r.monto), fecha: r.fecha,
    forma: r.forma, ref: r.ref, cardDigits: r.card_digits, obs: r.obs,
    facturasCubiertas: [], usuario: r.usuario, cargos: r.cargos || [], descuentosPerfil: parseFloat(r.descuento_perfil || 0),
    descuentosAdicionales: r.descuentos_adicionales || [], montoBase: parseFloat(r.monto_base || 0),
  })));
}
// POST /api/pagos
export async function POST(request: Request) {
  const can = await canRegisterPayment();
  if (!can) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const body = await request.json();
  const { padreId, monto, fecha, forma, referencia, cardDigits, observacion, montoBase, descuentoPerfil, cargos, descuentosAdicionales, colegioId: bodyCid } = body;
  if (!padreId || !monto || !fecha || !forma) return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  const user = await getAuthenticatedUser();
  let cid = user?.colegioId;
  if (bodyCid && user?.role === 'superadmin') cid = bodyCid;
  if (!cid) return NextResponse.json({ error: 'Colegio no especificado' }, { status: 400 });
  const montoNum = parseFloat(monto);
  // Ensure pending invoice exists
  const facturasResult = await query('SELECT id FROM facturas WHERE colegio_id = $1 AND padre_id = $2 AND estado != $3', [cid, padreId, 'pagado']);
  if (facturasResult.rows.length === 0) {
    const periodoActual = fecha.slice(0, 7);
    const configResult = await query('SELECT tarifa FROM colegios WHERE id = $1', [cid]);
    const tarifa = parseFloat(configResult.rows[0]?.tarifa || 1500);
    const hijosCount = await query('SELECT COUNT(*) as cnt FROM hijos h JOIN padres_hijos ph ON ph.hijo_id = h.id WHERE ph.padre_id = $1 AND h.activo = true', [padreId]);
    const montoFactura = parseInt(hijosCount.rows[0]?.cnt || 0) * tarifa;
    await query('INSERT INTO facturas (colegio_id, padre_id, periodo, monto, pagado, fecha, estado) VALUES ($1, $2, $3, $4, 0, $5, $6)',
      [cid, padreId, periodoActual, montoFactura, `${periodoActual}-01`, 'pendiente']);
  }
  const facturas = await query('SELECT id, periodo, monto, pagado FROM facturas WHERE colegio_id = $1 AND padre_id = $2 AND estado != $3 ORDER BY periodo', [cid, padreId, 'pagado']);
  let restante = montoNum;
  const facturasCubiertas = [];
  for (const f of facturas.rows) {
    if (restante <= 0) break;
    const pendiente = parseFloat(f.monto) - parseFloat(f.pagado);
    const abono = Math.min(restante, pendiente);
    await query("UPDATE facturas SET pagado = pagado + $1, estado = CASE WHEN pagado + $1 >= monto THEN 'pagado' ELSE 'parcial' END, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [abono, f.id]);
    facturasCubiertas.push({ id: f.id, periodo: f.periodo, monto: parseFloat(f.monto), abono });
    restante -= abono;
  }
  const numRecibo = `REC-${Date.now().toString().slice(-8)}`;
  const pagoResult = await query(
    `INSERT INTO pagos (colegio_id, num_recibo, padre_id, monto, fecha, forma, ref, card_digits, obs, usuario, monto_base, descuento_perfil, cargos, descuentos_adicionales)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
    [cid, numRecibo, padreId, montoNum, fecha, forma, referencia || '', cardDigits || '', observacion || '', user?.name || 'Sistema',
     montoBase || montoNum, descuentoPerfil || 0, JSON.stringify(cargos || []), JSON.stringify(descuentosAdicionales || [])]
  );
  const pago = pagoResult.rows[0];
  for (const fc of facturasCubiertas) {
    await query('INSERT INTO facturas_cubiertas (pago_id, factura_id, abono) VALUES ($1, $2, $3)', [pago.id, fc.id, fc.abono]);
  }
  const cuentasResult = await query('SELECT id FROM cuentas WHERE colegio_id = $1 AND tipo = $2 AND activo = true LIMIT 1', [cid, 'ingreso']);
  if (cuentasResult.rows.length > 0) {
    const cuentaId = cuentasResult.rows[0].id;
    const periodo = fecha.slice(0, 7);
    await query('INSERT INTO movimientos (colegio_id, tipo, cuenta_id, monto, fecha, descripcion, periodo, usuario, origen, pago_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [cid, 'ingreso', cuentaId, montoNum, fecha, `Cobro · ${numRecibo}`, periodo, user?.name || 'Sistema', 'cobro', pago.id]);
  }
  return NextResponse.json({
    id: pago.id, numRecibo: pago.num_recibo, padreId: pago.padre_id, monto: parseFloat(pago.monto),
    fecha: pago.fecha, forma: pago.forma, ref: pago.ref, obs: pago.obs,
    facturasCubiertas, usuario: pago.usuario, cargos: pago.cargos || [], descuentosPerfil: parseFloat(pago.descuento_perfil || 0),
    descuentosAdicionales: pago.descuentos_adicionales || [], montoBase: parseFloat(pago.monto_base || 0),
  }, { status: 201 });
}