// app/api/padres/[id]/route.ts - Updated for PostgreSQL
import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { query } from '@/lib/db-postgres';

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  let token = cookieStore.get('token')?.value;
  if (!token) {
    try { const hdr = headers(); const auth = hdr.get('authorization') || hdr.get('Authorization'); if (auth?.startsWith('Bearer ')) token = auth.slice(7); } catch (e) {}
  }
  if (!token) return null;
  try { return await verifyJWT(token); } catch { return null; }
}

async function canManage() {
  const user = await getAuthenticatedUser();
  return user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'asistente';
}

async function buildPadre(padreRow: any): Promise<any> {
  const hijosResult = await query('SELECT h.id, h.nombre, h.grado FROM hijos h JOIN padres_hijos ph ON ph.hijo_id = h.id WHERE ph.padre_id = $1 AND h.activo = true', [padreRow.id]);
  const descuentosResult = await query('SELECT d.id, d.nombre, d.tipo, d.valor, d.activo FROM descuentos_perfil d JOIN padres_descuentos pd ON pd.descuento_id = d.id WHERE pd.padre_id = $1 AND d.activo = true', [padreRow.id]);
  return {
    id: padreRow.id, nombre: padreRow.nombre, cedula: padreRow.cedula, telefono: padreRow.telefono,
    email: padreRow.email, direccion: padreRow.direccion, activo: padreRow.activo,
    hijos: hijosResult.rows.map((h: any) => ({ id: h.id, nombre: h.nombre, grado: h.grado })),
    descuentos: descuentosResult.rows.map((d: any) => ({ id: d.id, nombre: d.nombre, tipo: d.tipo, valor: parseFloat(d.valor), activo: d.activo })),
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  const padreId = parseInt(id);
  if (isNaN(padreId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  const result = await query('SELECT * FROM padres WHERE id = $1', [padreId]);
  if (result.rows.length === 0) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  return NextResponse.json(await buildPadre(result.rows[0]));
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const can = await canManage();
  if (!can) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  const padreId = parseInt(id);
  if (isNaN(padreId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  const body = await request.json();
  const { nombre, cedula, telefono, email, direccion, hijos, descuentos, activo } = body;
  if (!nombre || !cedula) return NextResponse.json({ error: 'Nombre y cédula requeridos' }, { status: 400 });
  const existing = await query('SELECT id FROM padres WHERE id != $1 AND cedula = $2', [padreId, cedula.trim()]);
  if (existing.rows.length > 0) return NextResponse.json({ error: 'Ya existe otro padre con esa cédula' }, { status: 400 });
  const result = await query(`UPDATE padres SET nombre=$1, cedula=$2, telefono=$3, email=$4, direccion=$5, activo=$6, updated_at=CURRENT_TIMESTAMP WHERE id=$7 RETURNING *`,
    [nombre.trim(), cedula.trim(), telefono?.trim() || '', email?.trim() || '', direccion?.trim() || '', activo !== false, padreId]);
  if (result.rows.length === 0) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  await query('DELETE FROM padres_hijos WHERE padre_id = $1', [padreId]);
  if (hijos?.length) { for (const h of hijos) { let hiId = h.id; if (!hiId) { const newHi = await query('INSERT INTO hijos (nombre, grado) VALUES ($1, $2) RETURNING id', [h.nombre.trim(), h.grado.trim()]); hiId = newHi.rows[0].id; } await query('INSERT INTO padres_hijos (padre_id, hijo_id) VALUES ($1, $2)', [padreId, hiId]); } }
  await query('DELETE FROM padres_descuentos WHERE padre_id = $1', [padreId]);
  if (descuentos?.length) { for (const d of descuentos) { let desId = d.id; if (!desId) { const newDes = await query('INSERT INTO descuentos_perfil (nombre, tipo, valor) VALUES ($1, $2, $3) RETURNING id', [d.nombre.trim(), d.tipo, d.valor]); desId = newDes.rows[0].id; } await query('INSERT INTO padres_descuentos (padre_id, descuento_id) VALUES ($1, $2)', [padreId, desId]); } }
  return NextResponse.json(await buildPadre(result.rows[0]));
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const can = await canManage();
  if (!can) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  const padreId = parseInt(id);
  if (isNaN(padreId)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  await query('UPDATE padres SET activo = false WHERE id = $1', [padreId]);
  return NextResponse.json({ message: 'Padre desactivado' });
}

