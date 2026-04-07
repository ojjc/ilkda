require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false }
    : {
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT) || 5432,
        database: process.env.PGDATABASE || 'ilkda',
        user: process.env.PGUSER || 'ilkda_user',
        password: process.env.PGPASSWORD || 'ilkda_pass',
      }
);

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

/**
 * run a parameterized query and return all rows.
 * usage: await db.query('SELECT * FROM users WHERE id = $1', [id])
 */
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`  pg [${Date.now() - start}ms] ${text.slice(0, 80)}`);
  }
  return res;
}
// return first row or null 
async function queryOne(text, params) {
  const res = await query(text, params);
  return res.rows[0] ?? null;
}

// return all rows 
async function queryAll(text, params) {
  const res = await query(text, params);
  return res.rows;
}

async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW() AS now');
    console.log(`PostgreSQL connected — server time: ${res.rows[0].now}`);
  } catch (err) {
    console.error('Could not connect to PostgreSQL:', err.message);
    console.error('Make sure Postgres is running and .env credentials are correct.');
    process.exit(1);
  }
}

module.exports = { pool, query, queryOne, queryAll, testConnection };
