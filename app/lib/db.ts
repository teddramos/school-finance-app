// lib/db.ts — Capa de acceso a datos PostgreSQL (multi-colegio)
import { Pool, types } from 'pg';
import fs from 'fs';
import path from 'path';

// Parsear tipos nativos de PG como valores JS simples
types.setTypeParser(1082, (v) => v);        // DATE -> 'YYYY-MM-DD'
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v))); // NUMERIC -> number
types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10))); // BIGINT -> number

// Resolver certificado CA: 1) env DB_SSL_CA (contenido PEM), 2) archivo en disco, 3) TLS sin verificación
function resolveCa(): string | null {
  const fromEnv = process.env.DB_SSL_CA;
  if (fromEnv && fromEnv.includes('-----BEGIN CERTIFICATE-----') && fromEnv.includes('-----END CERTIFICATE-----')) {
    // Soporta PEM pegado con saltos reales o con \n literales
    return fromEnv.replace(/\\n/g, '\n').trim();
  }
  try {
    const caPath = process.env.DB_SSL_CA_PATH || 'ca.pem';
    const caFile = path.isAbsolute(caPath) ? caPath : path.join(process.cwd(), caPath);
    return fs.readFileSync(caFile).toString('utf8');
  } catch {
    return null;
  }
}

// SSL configurable:
//  - DB_SSL=false -> sin TLS
//  - DB_SSL=true  -> TLS sin CA personalizada (Supabase pooler)
//  - vacio/otro   -> auto: usa DB_SSL_CA/ca.pem si existe (verificado); si no, TLS sin verificacion
const dbSslFlag = (process.env.DB_SSL || '').trim().toLowerCase();
const sslDisabled = ['false', '0', 'no', 'off'].includes(dbSslFlag);
const sslExplicit = ['true', '1', 'yes', 'on', 'require'].includes(dbSslFlag);
const sslCa = !sslDisabled && !sslExplicit ? resolveCa() : null;

function buildSsl(): any {
  if (sslDisabled) return false;
  if (sslCa) return { ca: sslCa, rejectUnauthorized: true };
  return { rejectUnauthorized: false };
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  ssl: buildSsl(),
});

if (!sslDisabled && !sslCa && !sslExplicit) {
  console.warn('⚠️ DB_SSL activo sin certificado CA: conectando sin verificación de certificado.');
}

export { pool };

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length ? rows[0] : null;
}

// ---------------- Interfaces (mismo contrato que el demo) ----------------

export type Role = 'superadmin' | 'admin' | 'asistente' | 'empleado';

export interface User {
  id: number;
  username: string;
  password?: string;
  role: Role;
  name: string;
  colegioId: number | null;
  colegioNombre?: string | null;
}

export interface Colegio {
  id: number;
  nombre: string;
  rif: string;
  telefono: string;
  email: string;
  direccion: string;
  director: string;
  tarifa: number;
}

export interface Cuenta {
  id: number;
  nombre: string;
  tipo: 'ingreso' | 'gasto';
  descripcion?: string;
}

export interface Movimiento {
  id: number;
  tipo: 'ingreso' | 'gasto';
  cuentaId: number;
  monto: number;
  fecha: string;
  descripcion?: string;
  periodo: string;
  usuario?: string;
  origen?: string;
  pagoId?: number;
  cuentaNombre?: string;
}

export interface Hijo {
  id?: number;
  nombre: string;
  grado: string;
}

export interface DescuentoPerfil {
  id?: number;
  nombre: string;
  tipo: 'porcentaje' | 'fijo';
  valor: number;
  activo: boolean;
}

export interface Padre {
  id: number;
  nombre: string;
  cedula: string;
  telefono: string;
  email: string;
  direccion: string;
  hijos: Hijo[];
  descuentos: DescuentoPerfil[];
  activo: boolean;
}

export interface Factura {
  id: number;
  padreId: number;
  periodo: string;
  monto: number;
  pagado: number;
  fecha: string;
  estado: 'pagado' | 'parcial' | 'pendiente';
}

export interface CargoAdicional {
  nombre: string;
  monto: number;
}

export interface DescuentoAdicional {
  nombre: string;
  tipo: 'porcentaje' | 'fijo';
  valor: number;
}

export interface FacturaCubierta {
  id: number;
  periodo: string;
  monto: number;
  pagado: number;
  abono: number;
  estado: 'pagado' | 'parcial' | 'pendiente';
}

export interface Pago {
  id: number;
  numRecibo: string;
  facturaId?: number;
  padreId: number;
  monto: number;
  fecha: string;
  forma: string;
  ref?: string;
  cardDigits?: string;
  obs?: string;
  facturasCubiertas: FacturaCubierta[];
  usuario?: string;
  cargos: CargoAdicional[];
  descuentosPerfil: number;
  descuentosAdicionales: DescuentoAdicional[];
  montoBase: number;
}

// ---------------- COLEGIOS ----------------

const DEFAULT_CUENTAS: Array<[string, 'ingreso' | 'gasto', string]> = [
  ['Mensualidades Escolares', 'ingreso', 'Cobros de mensualidad por alumno'],
  ['Inscripciones', 'ingreso', 'Cobros de inscripción'],
  ['Actividades Extracurriculares', 'ingreso', 'Ingresos por actividades'],
  ['Nómina Docente', 'gasto', 'Pago a profesores'],
  ['Servicios Públicos', 'gasto', 'Agua, luz, gas'],
  ['Mantenimiento', 'gasto', 'Reparaciones'],
  ['Material Escolar', 'gasto', 'Útiles y materiales'],
  ['Administración', 'gasto', 'Gastos administrativos'],
];

export async function getColegios(): Promise<Array<{ id: number; nombre: string; rif: string; telefono: string; tarifa: number; activo: boolean }>> {
  return query(
    `SELECT id, nombre, rif, telefono, tarifa, activo FROM colegios ORDER BY id`
  );
}

export async function getColegioById(id: number): Promise<Colegio | null> {
  return queryOne<Colegio>(
    `SELECT id, nombre, rif, telefono, email, direccion, director, tarifa FROM colegios WHERE id = $1`,
    [id]
  );
}

export async function createColegio(data: {
  nombre: string; rif?: string; telefono?: string; email?: string;
  direccion?: string; director?: string; tarifa?: number;
}): Promise<Colegio> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      `INSERT INTO colegios (nombre, rif, telefono, email, direccion, director, tarifa)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, nombre, rif, telefono, email, direccion, director, tarifa`,
      [data.nombre, data.rif || '', data.telefono || '', data.email || '',
       data.direccion || '', data.director || '',
       typeof data.tarifa === 'number' && data.tarifa > 0 ? data.tarifa : 1500]
    );
    const colegio = res.rows[0];
    // Cuentas contables por defecto para que el colegio funcione de inmediato
    for (const [nombre, tipo, descripcion] of DEFAULT_CUENTAS) {
      await client.query(`INSERT INTO cuentas (colegio_id, nombre, tipo, descripcion) VALUES ($1,$2,$3,$4)`, [
        colegio.id, nombre, tipo, descripcion,
      ]);
    }
    await client.query('COMMIT');
    return colegio;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function updateColegio(id: number, data: Partial<Colegio>): Promise<Colegio | null> {
  return queryOne<Colegio>(
    `UPDATE colegios SET
       nombre    = COALESCE($2, nombre),
       rif       = COALESCE($3, rif),
       telefono  = COALESCE($4, telefono),
       email     = COALESCE($5, email),
       direccion = COALESCE($6, direccion),
       director  = COALESCE($7, director),
       tarifa    = COALESCE($8, tarifa)
     WHERE id = $1
     RETURNING id, nombre, rif, telefono, email, direccion, director, tarifa`,
    [id, data.nombre ?? null, data.rif ?? null, data.telefono ?? null, data.email ?? null,
     data.direccion ?? null, data.director ?? null, data.tarifa ?? null]
  );
}

// ---------------- USUARIOS ----------------

interface UserRow {
  id: number;
  colegio_id: number | null;
  username: string;
  password: string;
  role: Role;
  name: string;
  colegio_nombre?: string | null;
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    password: row.password,
    role: row.role,
    name: row.name,
    colegioId: row.colegio_id,
    colegioNombre: row.colegio_nombre ?? null,
  };
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const row = await queryOne<UserRow>(
    `SELECT u.id, u.colegio_id, u.username, u.password, u.role, u.name, c.nombre AS colegio_nombre
     FROM usuarios u LEFT JOIN colegios c ON c.id = u.colegio_id
     WHERE u.username = $1 AND u.activo = TRUE`,
    [username]
  );
  return row ? mapUser(row) : null;
}

export async function getUserById(id: number): Promise<User | null> {
  const row = await queryOne<UserRow>(
    `SELECT u.id, u.colegio_id, u.username, u.password, u.role, u.name, c.nombre AS colegio_nombre
     FROM usuarios u LEFT JOIN colegios c ON c.id = u.colegio_id
     WHERE u.id = $1 AND u.activo = TRUE`,
    [id]
  );
  return row ? mapUser(row) : null;
}

export async function listUsers(colegioId?: number): Promise<User[]> {
  const where = colegioId ? `WHERE u.colegio_id = ${Number(colegioId)}` : '';
  const rows = await query<UserRow>(
    `SELECT u.id, u.colegio_id, u.username, '' AS password, u.role, u.name, c.nombre AS colegio_nombre
     FROM usuarios u LEFT JOIN colegios c ON c.id = u.colegio_id
     ${where}
     ORDER BY c.id NULLS FIRST, u.id`
  );
  return rows.map(mapUser);
}

export async function createUser(data: {
  colegioId: number | null; username: string; password: string; role: Role; name: string;
}): Promise<User> {
  const row = await queryOne<UserRow>(
    `INSERT INTO usuarios (colegio_id, username, password, role, name)
     VALUES ($1, $2, crypt($3, gen_salt('bf', 10)), $4, $5)
     RETURNING id, colegio_id, username, '' AS password, role, name`,
    [data.colegioId, data.username, data.password, data.role, data.name]
  ) as UserRow;
  return mapUser(row);
}

export async function updateUser(id: number, data: {
  name?: string; username?: string; role?: Role; password?: string;
}): Promise<User | null> {
  let row;
  if (data.password) {
    row = await queryOne<UserRow>(
      `UPDATE usuarios SET name=$2, username=$3, role=$4, password=crypt($5, gen_salt('bf', 10))
       WHERE id=$1 RETURNING id, colegio_id, username, '' AS password, role, name`,
      [id, data.name, data.username, data.role, data.password]
    );
  } else {
    row = await queryOne<UserRow>(
      `UPDATE usuarios SET name=$2, username=$3, role=$4
       WHERE id=$1 RETURNING id, colegio_id, username, '' AS password, role, name`,
      [id, data.name, data.username, data.role]
    );
  }
  if (!row) return null;
  return await getUserById(row.id);
}

export async function deleteUser(id: number): Promise<boolean> {
  const row = await queryOne(`DELETE FROM usuarios WHERE id=$1 RETURNING id`, [id]);
  return !!row;
}

export async function usernameExists(username: string, excludeId?: number): Promise<boolean> {
  const row = await queryOne(
    `SELECT id FROM usuarios WHERE username=$1 AND ($2::int IS NULL OR id <> $2) LIMIT 1`,
    [username, excludeId ?? null]
  );
  return !!row;
}

// ---------------- CUENTAS ----------------

export async function listCuentas(colegioId: number): Promise<Cuenta[]> {
  return query<Cuenta>(
    `SELECT id, nombre, tipo, descripcion FROM cuentas WHERE colegio_id=$1 ORDER BY tipo DESC, nombre`,
    [colegioId]
  );
}

export async function createCuenta(colegioId: number, data: { nombre: string; tipo: 'ingreso' | 'gasto'; descripcion?: string }): Promise<Cuenta> {
  return queryOne<Cuenta>(
    `INSERT INTO cuentas (colegio_id, nombre, tipo, descripcion) VALUES ($1,$2,$3,$4)
     RETURNING id, nombre, tipo, descripcion`,
    [colegioId, data.nombre, data.tipo, data.descripcion || '']
  ) as Promise<Cuenta>;
}

export async function updateCuenta(colegioId: number, id: number, data: { nombre: string; tipo: 'ingreso' | 'gasto'; descripcion?: string }): Promise<Cuenta | null> {
  return queryOne<Cuenta>(
    `UPDATE cuentas SET nombre=$3, tipo=$4, descripcion=$5 WHERE id=$2 AND colegio_id=$1
     RETURNING id, nombre, tipo, descripcion`,
    [colegioId, id, data.nombre, data.tipo, data.descripcion || '']
  );
}

export async function deleteCuenta(colegioId: number, id: number): Promise<boolean> {
  // Los movimientos asociados se eliminan en cascada (misma conducta que el demo)
  const row = await queryOne(`DELETE FROM cuentas WHERE id=$2 AND colegio_id=$1 RETURNING id`, [colegioId, id]);
  return !!row;
}

// ---------------- PADRES (+ hijos y descuentos) ----------------

async function attachPadreRelations(padres: Padre[], colegioId: number): Promise<Padre[]> {
  if (!padres.length) return padres;
  const ids = padres.map((p) => p.id);
  const hijosRows = await query<any>(
    `SELECT id, padre_id, nombre, grado FROM hijos WHERE colegio_id=$1 AND padre_id = ANY($2::int[]) ORDER BY id`,
    [colegioId, ids]
  );
  const descRows = await query<DescuentoPerfil & { padre_id: number }>(
    `SELECT id, padre_id, nombre, tipo, valor, activo FROM descuentos WHERE padre_id = ANY($1::int[]) ORDER BY id`,
    [ids]
  );
  for (const p of padres) {
    p.hijos = hijosRows.filter((h) => h.padre_id === p.id).map((h) => ({ id: h.id, nombre: h.nombre, grado: h.grado }));
    p.descuentos = descRows
      .filter((d) => d.padre_id === p.id)
      .map((d) => ({ id: d.id, nombre: d.nombre, tipo: d.tipo, valor: Number(d.valor), activo: d.activo }));
  }
  return padres;
}

function mapPadre(row: any): Padre {
  return {
    id: row.id,
    nombre: row.nombre,
    cedula: row.cedula,
    telefono: row.telefono,
    email: row.email,
    direccion: row.direccion,
    hijos: [],
    descuentos: [],
    activo: row.activo,
  };
}

export async function listPadres(colegioId: number, q?: string): Promise<Padre[]> {
  const search = q ? `%${q.toLowerCase()}%` : null;
  const rows = await query<any>(
    `SELECT id, nombre, cedula, telefono, email, direccion, activo FROM padres
     WHERE colegio_id=$1
       AND ($2::text IS NULL OR LOWER(nombre) LIKE $2 OR cedula LIKE $2)
     ORDER BY nombre`,
    [colegioId, search]
  );
  const padres = rows.map(mapPadre);
  return attachPadreRelations(padres, colegioId);
}

export async function getPadre(colegioId: number, id: number): Promise<Padre | null> {
  const row = await queryOne<any>(
    `SELECT id, nombre, cedula, telefono, email, direccion, activo FROM padres WHERE id=$2 AND colegio_id=$1`,
    [colegioId, id]
  );
  if (!row) return null;
  const [padre] = await attachPadreRelations([mapPadre(row)], colegioId);
  return padre;
}

async function replaceHijosYDescuentos(client: any, colegioId: number, padreId: number, hijos: Hijo[], descuentos: DescuentoPerfil[]) {
  await client.query(`DELETE FROM hijos WHERE padre_id=$1`, [padreId]);
  for (const h of hijos || []) {
    if (!h?.nombre) continue;
    await client.query(`INSERT INTO hijos (colegio_id, padre_id, nombre, grado) VALUES ($1,$2,$3,$4)`, [
      colegioId, padreId, h.nombre, h.grado || '',
    ]);
  }
  await client.query(`DELETE FROM descuentos WHERE padre_id=$1`, [padreId]);
  for (const d of descuentos || []) {
    if (!d?.nombre) continue;
    await client.query(`INSERT INTO descuentos (padre_id, nombre, tipo, valor, activo) VALUES ($1,$2,$3,$4,$5)`, [
      padreId, d.nombre, d.tipo, d.valor ?? 0, d.activo !== false,
    ]);
  }
}

export async function createPadre(
  colegioId: number,
  data: { nombre: string; cedula: string; telefono?: string; email?: string; direccion?: string; hijos?: Hijo[]; descuentos?: DescuentoPerfil[] }
): Promise<Padre> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      `INSERT INTO padres (colegio_id, nombre, cedula, telefono, email, direccion, activo)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE) RETURNING id, nombre, cedula, telefono, email, direccion, activo`,
      [colegioId, data.nombre, data.cedula, data.telefono || '', data.email || '', data.direccion || '']
    );
    const padreId = res.rows[0].id;
    await replaceHijosYDescuentos(client, colegioId, padreId, data.hijos || [], data.descuentos || []);
    await client.query('COMMIT');
    return (await getPadre(colegioId, padreId))!;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function updatePadre(
  colegioId: number,
  id: number,
  data: { nombre: string; cedula: string; telefono?: string; email?: string; direccion?: string; hijos?: Hijo[]; descuentos?: DescuentoPerfil[] }
): Promise<Padre | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      `UPDATE padres SET nombre=$3, cedula=$4, telefono=$5, email=$6, direccion=$7
       WHERE id=$2 AND colegio_id=$1 RETURNING id`,
      [colegioId, id, data.nombre, data.cedula, data.telefono || '', data.email || '', data.direccion || '']
    );
    if (!res.rows.length) {
      await client.query('ROLLBACK');
      return null;
    }
    await replaceHijosYDescuentos(client, colegioId, id, data.hijos || [], data.descuentos || []);
    await client.query('COMMIT');
    return await getPadre(colegioId, id);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function deletePadre(colegioId: number, id: number): Promise<boolean> {
  // Cascada: hijos, descuentos, facturas y pagos del padre (igual que el demo)
  const row = await queryOne(`DELETE FROM padres WHERE id=$2 AND colegio_id=$1 RETURNING id`, [colegioId, id]);
  return !!row;
}

export async function padreExistsByCedula(colegioId: number, cedula: string, excludeId?: number): Promise<boolean> {
  const row = await queryOne(
    `SELECT id FROM padres WHERE colegio_id=$1 AND cedula=$2 AND ($3::int IS NULL OR id <> $3) LIMIT 1`,
    [colegioId, cedula, excludeId ?? null]
  );
  return !!row;
}

// ---------------- FACTURAS ----------------

function mapFactura(row: any): Factura {
  return {
    id: row.id,
    padreId: row.padre_id,
    periodo: String(row.periodo).trim(),
    monto: Number(row.monto),
    pagado: Number(row.pagado),
    fecha: typeof row.fecha === 'string' ? row.fecha.slice(0, 10) : row.fecha,
    estado: row.estado,
  };
}

export async function listFacturas(colegioId: number, opts?: {
  padreId?: number;
  estado?: 'pendiente' | 'pagado' | 'parcial';
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: Factura[]; total: number }> {
  const conds: string[] = [`colegio_id = $1`];
  const params: any[] = [colegioId];
  if (opts?.padreId) {
    params.push(opts.padreId);
    conds.push(`padre_id = $${params.length}`);
  }
  if (opts?.estado === 'pagado') conds.push(`pagado >= monto`);
  else if (opts?.estado === 'parcial') conds.push(`pagado > 0 AND pagado < monto`);
  else if (opts?.estado === 'pendiente') conds.push(`pagado < monto`);
  if (opts?.q) {
    params.push(`%${opts.q}%`);
    conds.push(`padre_id IN (SELECT id FROM padres WHERE colegio_id=$1 AND (nombre ILIKE $${params.length} OR cedula ILIKE $${params.length}))`);
  }
  const where = conds.join(' AND ');
  const countRow = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*)::int AS cnt FROM facturas WHERE ${where}`, params
  );
  const total = countRow?.cnt ?? 0;
  const lim = opts?.limit && opts.limit > 0 ? Math.floor(opts.limit) : 50;
  const off = opts?.offset && opts.offset >= 0 ? Math.floor(opts.offset) : 0;
  const rows = await query<any>(
    `SELECT * FROM facturas WHERE ${where} ORDER BY periodo DESC, padre_id ASC LIMIT ${lim} OFFSET ${off}`,
    params
  );
  return { data: rows.map(mapFactura), total };
}

export async function getFacturaById(colegioId: number, id: number): Promise<Factura | null> {
  const row = await queryOne<any>(`SELECT * FROM facturas WHERE id=$2 AND colegio_id=$1`, [colegioId, id]);
  return row ? mapFactura(row) : null;
}

export async function facturaExists(colegioId: number, padreId: number, periodo: string): Promise<boolean> {
  const row = await queryOne(
    `SELECT id FROM facturas WHERE colegio_id=$1 AND padre_id=$2 AND periodo=$3 LIMIT 1`,
    [colegioId, padreId, periodo]
  );
  return !!row;
}

export async function getDistinctFacturaPeriodos(colegioId: number): Promise<string[]> {
  const rows = await query<{ periodo: string }>(
    `SELECT DISTINCT periodo FROM facturas WHERE colegio_id=$1 ORDER BY periodo DESC`, [colegioId]
  );
  return rows.map(r => String(r.periodo).trim());
}

export async function getDistinctPagoMeses(colegioId: number): Promise<string[]> {
  const rows = await query<{ mes: string }>(
    `SELECT DISTINCT SUBSTR(fecha::text,1,7) AS mes FROM pagos WHERE colegio_id=$1 ORDER BY mes DESC`, [colegioId]
  );
  return rows.map(r => String(r.mes).trim());
}

export async function createFactura(colegioId: number, data: {
  padreId: number; periodo: string; monto: number;
}): Promise<Factura> {
  const row = await queryOne<any>(
    `INSERT INTO facturas (colegio_id, padre_id, periodo, monto, pagado, fecha, estado)
     VALUES ($1,$2,$3,$4,0,$5,'pendiente') RETURNING *`,
    [colegioId, data.padreId, data.periodo, data.monto, `${data.periodo}-01`]
  );
  return mapFactura(row);
}

export async function generarFacturasAutomatico(colegioId: number, periodo: string): Promise<{ generadas: number; facturas: Factura[] }> {
  const nuevas = await query<any>(
    `INSERT INTO facturas (colegio_id, padre_id, periodo, monto, pagado, fecha, estado)
     SELECT $1, p.id, $2,
            (SELECT COUNT(*) FROM hijos h WHERE h.padre_id = p.id) * c.tarifa,
            0, $2 || '-01', 'pendiente'
     FROM padres p JOIN colegios c ON c.id = p.colegio_id
     WHERE p.colegio_id = $1
       AND NOT EXISTS (SELECT 1 FROM facturas f WHERE f.colegio_id=$1 AND f.padre_id=p.id AND f.periodo=$2)
     RETURNING *`,
    [colegioId, periodo]
  );
  return { generadas: nuevas.length, facturas: nuevas.map(mapFactura) };
}

// ---------------- PAGOS ----------------

function mapPago(row: any): Pago {
  return {
    id: row.id,
    numRecibo: row.num_recibo,
    facturaId: row.factura_id ?? undefined,
    padreId: row.padre_id,
    monto: Number(row.monto),
    fecha: typeof row.fecha === 'string' ? row.fecha.slice(0, 10) : row.fecha,
    forma: row.forma,
    ref: row.ref ?? undefined,
    cardDigits: row.card_digits ?? undefined,
    obs: row.obs ?? undefined,
    facturasCubiertas: [],
    usuario: row.usuario ?? undefined,
    cargos: row.cargos || [],
    descuentosPerfil: Number(row.descuentos_perfil || 0),
    descuentosAdicionales: row.descuentos_adicionales || [],
    montoBase: Number(row.monto_base || 0),
  };
}

async function attachPagosCubiertas(pagos: Pago[], colegioId: number): Promise<Pago[]> {
  if (!pagos.length) return pagos;
  const ids = pagos.map((p) => p.id);
  const cubiertas = await query<any>(
    `SELECT pf.pago_id, f.id, f.periodo, f.monto, f.pagado, f.estado, pf.abono
     FROM pago_facturas pf JOIN facturas f ON f.id = pf.factura_id
      WHERE f.colegio_id=$1 AND pf.pago_id = ANY($2::int[]) ORDER BY f.periodo`,
    [colegioId, ids]
  );
  for (const p of pagos) {
    p.facturasCubiertas = cubiertas
      .filter((c) => c.pago_id === p.id)
      .map((c) => ({ id: c.id, periodo: String(c.periodo).trim(), monto: Number(c.monto), pagado: Number(c.pagado), abono: Number(c.abono), estado: c.estado }));
    if (p.facturasCubiertas.length && p.facturaId === undefined) {
      p.facturaId = p.facturasCubiertas[0].id;
    }
  }
  return pagos;
}

export async function listPagos(colegioId: number, opts?: {
  padreId?: number;
  limit?: number;
  offset?: number;
  q?: string;
  forma?: string;
  mes?: string;
  facturaId?: number;
}): Promise<{ data: Pago[]; total: number }> {
  const conds: string[] = [`p.colegio_id = $1`];
  const params: any[] = [colegioId];
  if (opts?.padreId) {
    params.push(opts.padreId);
    conds.push(`p.padre_id = $${params.length}`);
  }
  if (opts?.forma) {
    params.push(opts.forma);
    conds.push(`p.forma = $${params.length}`);
  }
  if (opts?.mes) {
    params.push(`${opts.mes}%`);
    conds.push(`p.fecha::text LIKE $${params.length}`);
  }
  if (opts?.facturaId) {
    params.push(opts.facturaId);
    conds.push(`p.id IN (SELECT pago_id FROM pago_facturas WHERE factura_id = $${params.length})`);
  }
  if (opts?.q) {
    params.push(`%${opts.q}%`);
    conds.push(`(p.num_recibo ILIKE $${params.length} OR p.padre_id IN (SELECT id FROM padres WHERE colegio_id=$1 AND (nombre ILIKE $${params.length} OR cedula ILIKE $${params.length})))`);
  }
  const where = conds.join(' AND ');
  const countRow = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*)::int AS cnt FROM pagos p WHERE ${where}`, params
  );
  const total = countRow?.cnt ?? 0;
  const lim = opts?.limit && opts.limit > 0 ? Math.floor(opts.limit) : 50;
  const off = opts?.offset && opts.offset >= 0 ? Math.floor(opts.offset) : 0;
  const sql = `SELECT p.* FROM pagos p WHERE ${where} ORDER BY p.fecha DESC, p.id DESC LIMIT ${lim} OFFSET ${off}`;
  const rows = await query<any>(sql, params);
  const pagos = rows.map(mapPago);
  return { data: await attachPagosCubiertas(pagos, colegioId), total };
}

/**
 * Registra un pago dentro de una transacción:
 * distribuye el monto entre las facturas pendientes (FIFO), guarda el recibo,
 * las relaciones pago-factura y genera el movimiento contable de ingreso.
 */
export async function registerPago(colegioId: number, data: {
  padreId: number; monto: number; fecha: string; forma: string;
  ref?: string; cardDigits?: string; obs?: string; montoBase?: number;
  descuentoPerfil?: number; cargos?: CargoAdicional[]; descuentosAdicionales?: DescuentoAdicional[];
}, userName: string): Promise<Pago> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Cuenta contable de mensualidades
    const cuentaRes = await client.query(
      `SELECT id FROM cuentas
       WHERE colegio_id=$1 AND tipo='ingreso' AND nombre ILIKE '%mensualidad%'
       ORDER BY id LIMIT 1`,
      [colegioId]
    );
    let cuentaId = cuentaRes.rows[0]?.id;
    if (!cuentaId) {
      const alt = await client.query(
        `SELECT id FROM cuentas WHERE colegio_id=$1 AND tipo='ingreso' ORDER BY id LIMIT 1`,
        [colegioId]
      );
      cuentaId = alt.rows[0]?.id;
    }

    // Facturas pendientes del padre (bloqueadas para evitar carreras)
    let pendientes = (await client.query(
      `SELECT * FROM facturas
       WHERE colegio_id=$1 AND padre_id=$2 AND pagado < monto
       ORDER BY periodo ASC
       FOR UPDATE`,
      [colegioId, data.padreId]
    )).rows;

    // Si no hay pendientes, generar factura del mes actual
    if (!pendientes.length) {
      const tarifaRes = await client.query(`SELECT tarifa FROM colegios WHERE id=$1`, [colegioId]);
      const tarifa = Number(tarifaRes.rows[0]?.tarifa ?? 1500);
      const hijosRes = await client.query(`SELECT COUNT(*)::int AS cnt FROM hijos WHERE padre_id=$1`, [data.padreId]);
      const cnt = hijosRes.rows[0]?.cnt ?? 0;
      const periodoActual = new Date().toISOString().slice(0, 7);
      const nueva = (await client.query(
        `INSERT INTO facturas (colegio_id, padre_id, periodo, monto, pagado, fecha, estado)
         VALUES ($1,$2,$3,$4,0,$5,'pendiente')
         ON CONFLICT (colegio_id, padre_id, periodo) DO UPDATE SET pagado = EXCLUDED.pagado
         RETURNING *`,
        [colegioId, data.padreId, periodoActual, Math.max(cnt, 0) * tarifa, `${periodoActual}-01`]
      )).rows[0];
      pendientes = [nueva];
    }

    // Distribuir el pago entre facturas pendientes
    let restante = data.monto;
    const cubiertas: Array<{ id: number; abono: number }> = [];
    for (const factura of pendientes) {
      if (restante <= 0) break;
      const pendiente = Number(factura.monto) - Number(factura.pagado);
      const abono = Math.min(restante, pendiente);
      const nuevoPagado = Number(factura.pagado) + abono;
      const estado = nuevoPagado >= Number(factura.monto) ? 'pagado' : 'parcial';
      await client.query(`UPDATE facturas SET pagado=$3, estado=$4 WHERE id=$1 AND colegio_id=$2`, [
        factura.id, colegioId, nuevoPagado, estado,
      ]);
      restante -= abono;
      cubiertas.push({ id: factura.id, abono });
    }

    // Insertar recibo
    const numRecibo = `REC-${Date.now().toString().slice(-8)}`;
    const pagoRow = (await client.query(
      `INSERT INTO pagos (colegio_id, num_recibo, padre_id, monto, monto_base, descuentos_perfil,
                          fecha, forma, ref, card_digits, obs, usuario, cargos, descuentos_adicionales)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb)
       RETURNING *`,
      [colegioId, numRecibo, data.padreId, data.monto, data.montoBase || 0, data.descuentoPerfil || 0,
       data.fecha, data.forma, data.ref || null, data.cardDigits || null, data.obs || null, userName,
       JSON.stringify((data.cargos || []).filter((c) => c.nombre && c.monto > 0)),
       JSON.stringify((data.descuentosAdicionales || []).filter((d) => d.nombre && d.valor > 0))]
    )).rows[0];

    // Relación pago ↔ factura (muchos a muchos)
    for (const c of cubiertas) {
      await client.query(`INSERT INTO pago_facturas (pago_id, factura_id, abono) VALUES ($1,$2,$3)`, [
        pagoRow.id, c.id, c.abono,
      ]);
    }

    // Movimiento contable automático (origen cobro)
    if (cuentaId) {
      const periodo = data.fecha.slice(0, 7);
      await client.query(
        `INSERT INTO movimientos (colegio_id, tipo, cuenta_id, pago_id, monto, fecha, descripcion, periodo, usuario, origen)
         VALUES ($1,'ingreso',$2,$3,$4,$5,$6,$7,$8,'cobro')`,
        [colegioId, cuentaId, pagoRow.id, data.monto, data.fecha,
         `Mensualidad padre ${data.padreId} · ${numRecibo}`, periodo, userName]
      );
    }

    await client.query('COMMIT');

    const pago = mapPago({ ...pagoRow });
    await attachPagosCubiertas([pago], colegioId);
    return pago;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// ---------------- MOVIMIENTOS ----------------

function mapMovimiento(row: any): Movimiento {
  return {
    id: row.id,
    tipo: row.tipo,
    cuentaId: row.cuenta_id,
    monto: Number(row.monto),
    fecha: typeof row.fecha === 'string' ? row.fecha.slice(0, 10) : row.fecha,
    descripcion: row.descripcion ?? undefined,
    periodo: String(row.periodo).trim(),
    usuario: row.usuario ?? undefined,
    origen: row.origen ?? undefined,
    pagoId: row.pago_id ?? undefined,
  };
}

export async function listMovimientos(colegioId: number, opts?: { periodo?: string; tipo?: 'ingreso' | 'gasto'; desdePeriodo?: string }): Promise<Movimiento[]> {
  const conds: string[] = [`m.colegio_id = $1`];
  const params: any[] = [colegioId];
  if (opts?.periodo) {
    params.push(opts.periodo);
    conds.push(`m.periodo = $${params.length}`);
  }
  if (opts?.desdePeriodo) {
    params.push(opts.desdePeriodo);
    conds.push(`m.periodo >= $${params.length}`);
  }
  if (opts?.tipo) {
    params.push(opts.tipo);
    conds.push(`m.tipo = $${params.length}`);
  }
  const rows = await query<any>(
    `SELECT m.* FROM movimientos m WHERE ${conds.join(' AND ')} ORDER BY m.fecha DESC, m.id DESC`,
    params
  );
  return rows.map(mapMovimiento);
}

export async function getCuentaTipo(colegioId: number, cuentaId: number): Promise<'ingreso' | 'gasto' | null> {
  const row = await queryOne<{ tipo: 'ingreso' | 'gasto' }>(
    `SELECT tipo FROM cuentas WHERE id=$2 AND colegio_id=$1`,
    [colegioId, cuentaId]
  );
  return row?.tipo ?? null;
}

export async function createMovimiento(colegioId: number, data: {
  tipo: 'ingreso' | 'gasto'; cuentaId: number; monto: number; fecha: string;
  descripcion?: string; periodo: string;
}, userName: string): Promise<Movimiento> {
  const row = await queryOne<any>(
    `INSERT INTO movimientos (colegio_id, tipo, cuenta_id, monto, fecha, descripcion, periodo, usuario, origen)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'manual') RETURNING *`,
    [colegioId, data.tipo, data.cuentaId, data.monto, data.fecha, data.descripcion || '', data.periodo, userName]
  );
  return mapMovimiento(row);
}

export async function updateMovimiento(colegioId: number, id: number, data: {
  tipo: 'ingreso' | 'gasto'; cuentaId: number; monto: number; fecha: string; descripcion?: string; periodo: string;
}): Promise<Movimiento | null> {
  const row = await queryOne<any>(
    `UPDATE movimientos SET tipo=$3, cuenta_id=$4, monto=$5, fecha=$6, descripcion=$7, periodo=$8
     WHERE id=$2 AND colegio_id=$1 AND origen <> 'cobro' RETURNING *`,
    [colegioId, id, data.tipo, data.cuentaId, data.monto, data.fecha, data.descripcion || '', data.periodo]
  );
  return row ? mapMovimiento(row) : null;
}

export async function deleteMovimiento(colegioId: number, id: number): Promise<{ ok: boolean; motivo?: 'no_encontrado' | 'cobro' }> {
  const mov = await queryOne<any>(`SELECT origen FROM movimientos WHERE id=$2 AND colegio_id=$1`, [colegioId, id]);
  if (!mov) return { ok: false, motivo: 'no_encontrado' };
  if (mov.origen === 'cobro') return { ok: false, motivo: 'cobro' };
  await query(`DELETE FROM movimientos WHERE id=$2 AND colegio_id=$1`, [colegioId, id]);
  return { ok: true };
}

// ---------------- ESTADÍSTICAS / REPORTES ----------------

export async function getTotalDeuda(colegioId: number): Promise<number> {
  const row = await queryOne<{ total: number | null }>(
    `SELECT SUM(monto - pagado) AS total FROM facturas WHERE colegio_id=$1`,
    [colegioId]
  );
  return Number(row?.total ?? 0);
}

export async function getPagosQueAfectanPeriodo(colegioId: number, periodo: string): Promise<Pago[]> {
  const rows = await query<any>(
    `SELECT DISTINCT p.* FROM pagos p
     JOIN pago_facturas pf ON pf.pago_id = p.id
     JOIN facturas f ON f.id = pf.factura_id
     WHERE p.colegio_id=$1 AND f.periodo=$2`,
    [colegioId, periodo]
  );
  const pagos = rows.map(mapPago);
  return attachPagosCubiertas(pagos, colegioId);
}

export async function getReporteMensual(colegioId: number, year: number, month: number) {
  const periodo = `${year}-${String(month).padStart(2, '0')}`;
  const rows = await query<any>(
    `SELECT m.*, c.nombre AS cuenta_nombre
     FROM movimientos m LEFT JOIN cuentas c ON c.id = m.cuenta_id
     WHERE m.colegio_id=$1 AND m.periodo=$2
     ORDER BY m.fecha ASC, m.id ASC`,
    [colegioId, periodo]
  );
  const movs = rows.map((row) => ({
    ...mapMovimiento(row),
    cuentaNombre: row.cuenta_nombre || 'Cuenta eliminada',
  }));
  const ingresos = movs.filter((m) => m.tipo === 'ingreso');
  const gastos = movs.filter((m) => m.tipo === 'gasto');
  const totalIngresos = ingresos.reduce((s, m) => s + m.monto, 0);
  const totalGastos = gastos.reduce((s, m) => s + m.monto, 0);
  return { periodo, ingresos, gastos, totalIngresos, totalGastos, balance: totalIngresos - totalGastos };
}
