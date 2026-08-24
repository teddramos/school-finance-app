// lib/db-init.ts
// Database initialization - runs on startup to ensure tables exist
import { pool, query } from './db-postgres';
import * as fs from 'fs';
import * as path from 'path';

export async function initDatabase() {
  try {
    console.log('🔄 Initializing database connection...');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    
    // Read and execute schema-tables.sql
    const tablesPath = path.join(process.cwd(), 'schema-tables.sql');
    const tablesSQL = fs.readFileSync(tablesPath, 'utf-8');
    
    console.log('📋 Creating tables if not exist...');
    await client.query(tablesSQL);
    console.log('✅ Tables created/verified');
    
    // Read and execute schema-seed.sql
    const seedPath = path.join(process.cwd(), 'schema-seed.sql');
    const seedSQL = fs.readFileSync(seedPath, 'utf-8');
    
    console.log('🌱 Seeding demo data...');
    try {
      await client.query(seedSQL);
      console.log('✅ Demo data seeded');
    } catch (seedError: any) {
      // Some seeds might fail on conflict, that's OK
      if (seedError.code !== '23505') { // unique_violation
        console.log('⚠️ Some seed data already exists or error:', seedError.message);
      } else {
        console.log('ℹ️ Seed data already exists, skipping');
      }
    }
    
    client.release();
    
    // Initialize sequence counters
    await query(`
      SELECT setval('colegios_id_seq', COALESCE(MAX(id), 1), true) FROM colegios;
      SELECT setval('usuarios_id_seq', COALESCE(MAX(id), 1), true) FROM usuarios;
      SELECT setval('hijos_id_seq', COALESCE(MAX(id), 1), true) FROM hijos;
      SELECT setval('descuentos_perfil_id_seq', COALESCE(MAX(id), 1), true) FROM descuentos_perfil;
      SELECT setval('padres_id_seq', COALESCE(MAX(id), 1), true) FROM padres;
      SELECT setval('facturas_id_seq', COALESCE(MAX(id), 1), true) FROM facturas;
      SELECT setval('pagos_id_seq', COALESCE(MAX(id), 1), true) FROM pagos;
      SELECT setval('cuentas_id_seq', COALESCE(MAX(id), 1), true) FROM cuentas;
    `);
    
    console.log('✅ Database initialization complete');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
}

// Get the default school ID (Colegio Las Palmas = 1)
export async function getDefaultColegioId(): Promise<number> {
  try {
    const result = await query('SELECT id FROM colegios WHERE id = 1 LIMIT 1');
    if (result.rows.length > 0) {
      return result.rows[0].id;
    }
    // If no default, try to get the first one
    const first = await query('SELECT id FROM colegios LIMIT 1');
    return first.rows.length > 0 ? first.rows[0].id : 1;
  } catch {
    return 1;
  }
}

// Get all schools (for superadmin)
export async function getAllColegios() {
  const result = await query('SELECT id, nombre, rif, direccion, telefono, email, director, tarifa, activo FROM colegios ORDER BY nombre');
  return result.rows;
}

// Get school by ID
export async function getColegioById(id: number) {
  const result = await query('SELECT * FROM colegios WHERE id = $1', [id]);
  return result.rows[0] || null;
}