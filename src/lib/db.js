import { Pool } from 'pg';

// Reuse a single pool across hot reloads in dev.
const globalForPg = globalThis;

export const pool =
  globalForPg._pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPg._pgPool = pool;
}

export async function query(text, params) {
  return pool.query(text, params);
}
