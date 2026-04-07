/**
 * run: npm run db:migrate
 * applies schema.sql to the configured PostgreSQL database.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT) || 5432,
        database: process.env.PGDATABASE || 'ilkda',
        user: process.env.PGUSER || 'ilkda_user',
        password: process.env.PGPASSWORD || 'ilkda_pass',
      }
);

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, '../schema.sql'), 'utf8');
  const client = await pool.connect();
  try {
    console.log('Running migration…');
    await client.query(sql);
    console.log('Schema applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
