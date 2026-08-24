// app/api/padres/route.ts - Updated for PostgreSQL
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

async function canManage() {
  const user = await getAuthenticatedUser();
  return user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'asistente';
}

function getColegioId(user: any, params: URLSearchParams): string | null {
  let cid = params.get('colegioId');
  if (!cid && user.role === 'superadmin' && !user.colegioId) cid = '1';
  if (!cid && user.colegioId) cid = String(user.colegioId);
  return cid;
}

// Helper para construir objeto padre con hijos y descuentos
async function buildPadre(padreRow: any): Promise<any> {
  const hijosResult = await query(
    'SELECT h.id, h.nombre, h.grado FROM hijos h JOIN padres_hijos ph ON ph.hijo_id = h.id WHERE ph.padre_id = $1 AND h.activo = true',
    [padreRow.id]
  );
  const descuentosResult = await query(
    'SELECT d.id, d.nombre, d.tipo, d.valor, d.activo FROM descuentos_perfil d JOIN padres_descuentos pd ON pd.descuento_id = d.id WHERE pd.padre_id = $1 AND d.activo = true',
    [padreRow.id]
  );
  return {
    id: padreRow.id, nombre: padreRow.nombre, cedula: padreRow.cedula,
    telefono: padreRow.telefono, email: padreRow.email, direccion: padreRow.direccion,
    activo: padreRow.activo,
    hijos: hijosResult.rows.map((h: any) => ({ id: h.id, nombre: h.nombre, grado: h.grado })),
    descuentos: descuentosResult.rows.map((d: any) => ({ id: d.id, nombre: d.nombre, tipo: d.tipo, valor: parseFloat(d.valor), activo: d.activo })),
  };
}

// GET /api/padres?colegioId=1&q=texto
export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const cid = getColegioId(user, searchParams);
  if (!cid) return NextResponse.json({ error: 'Colegio no especificado' }, { status: 400 });

  const q = searchParams.get('q')?.toLowerCase() || '';
  const params: any[] = [parseInt(cid)];
  let sql = 'SELECT * FROM padres WHERE colegio_id = $1 AND activo = true';
  if (q) { sql += ' AND (LOWER(nombre) LIKE $2 OR cedula LIKE $2)'; params.push(`%${q}%`); }
  sql += ' ORDER BY nombre';

  const result = await query(sql, params);
  const padres = await Promise.all(result.rows.map(buildPadre));
  return NextResponse.json(padres);
}

// POST /api/padres
export async function POST(request: Request) {
  const can = await canManage();
  if (!can) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const { nombre, cedula, telefono, email, direccion, hijos, descuentos, colegioId: bodyCid } = body;

  if (!nombre || !cedula) return NextResponse.json({ error: 'Nombre y cédula son requeridos' }, { status: 400 });

  const user = await getAuthenticatedUser();
  let cid = user?.colegioId;
  if (bodyCid && user?.role === 'superadmin') cid = bodyCid;
  if (!cid) return NextResponse.json({ error: 'Colegio no especificado' }, { status: 400 });

  // Verificar cédula única
  const existing = await query('SELECT id FROM padres WHERE colegio_id = $1 AND cedula = $2', [cid, cedula.trim()]);
  if (existing.rows.length > 0) return NextResponse.json({ error: 'Ya existe un padre con esa cédula' }, { status: 400 });

  const result = await query(
    `INSERT INTO padres (colegio_id, nombre, cedula, telefono, email, direccion) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [cid, nombre.trim(), cedula.trim(), telefono?.trim() || '', email?.trim() || '', direccion?.trim() || '']
  );

  const newPadre = result.rows[0];

  // Insertar hijos
  if (hijos && hijos.length > 0) {
    for (const h of hijos) {
      const hiRes = await query('SELECT id FROM hijos WHERE nombre = $1 AND grado = $2 LIMIT 1', [h.nombre.trim(), h.grado.trim()]);
      let hiId = hiRes.rows[0]?.id;
      if (!hiId) {
        const newHi = await query('INSERT INTO hijos (nombre, grado) VALUES ($1, $2) RETURNING id', [h.nombre.trim(), h.grado.trim()]);
        hiId = newHi.rows[0].id;
      }
      await query('INSERT INTO padres_hijos (padre_id, hijo_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [newPadre.id, hiId]);
    }
  }

  // Insertar descuentos
  if (descuentos && descuentos.length > 0) {
    for (const d of descuentos) {
      const desRes = await query('SELECT id FROM descuentos_perfil WHERE nombre = $1 LIMIT 1', [d.nombre.trim()]);
      let desId = desRes.rows[0]?.id;
      if (!desId) {
        const newDes = await query('INSERT INTO descuentos_perfil (nombre, tipo, valor) VALUES ($1, $2, $3) RETURNING id', [d.nombre.trim(), d.tipo, d.valor]);
        desId = newDes.rows[0].id;
      }
      await query('INSERT INTO padres_descuentos (padre_id, descuento_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [newPadre.id, desId]);
    }
  }

  return NextResponse.json(await buildPadre(newPadre), { status: 201 });
}