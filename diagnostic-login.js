// diagnostic-login.js: diagnóstico rápido del login para depurar 401
//
// Este script verifica que el hash de contraseña sea correcto y que la comparación funcione.
// Se ejecuta fuera del contexto de Next.js para aislar el problema.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function main() {
  const username = 'superadmin';
  const password = 'super123';

  const res = await pool.query(
    `SELECT id, username, role, password AS hash FROM usuarios WHERE username = $1 AND activo = TRUE`,
    [username]
  );

  if (res.rows.length === 0) {
    console.log(`❌ Usuario ${username} no encontrado o inactivo`);
    return;
  }

  const user = res.rows[0];
  const hash = user.hash.trim();

  console.log('🔍 Hash encontrado:');
  console.log('  username:', user.username);
  console.log('  role:', user.role);
  console.log('  hash length:', hash.length);
  console.log('  hash starts with $2a$:', hash.startsWith('$2a$'));
  console.log('  hash full:', hash);

  // bcryptjs.compare devuelve true/false asíncrono
  const match = await bcrypt.compare(password, hash);
  console.log('✅ bcrypt.compare result:', match);

  // También probar comparación pgcrypto directamente
  const pgRes = await pool.query(`SELECT crypt($1, $2) = $2 AS ok`, [password, hash]);
  console.log('✅ pgcrypto crypt() = hash result:', pgRes.rows[0]?.ok);

  await pool.end();
}

main().catch((err) => {
  console.error('❌ Error ejecutando diagnóstico:', err);
  process.exit(1);
});
