// Applies db/schema.sql to the database in DATABASE_URL.
// Usage: npm run db:init
require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // fallback to .env
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('✗ DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
    process.exit(1);
  }
  const pool = new Pool({
    connectionString,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('✓ Schema applied successfully.');
  } catch (err) {
    console.error('✗ Failed to apply schema:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
