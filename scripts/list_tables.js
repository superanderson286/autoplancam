import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    console.log('Tables:');
    res.rows.forEach(r => console.log('-', r.table_name));
  } catch (e) {
    console.error('Error listing tables:', e);
  } finally {
    await pool.end();
  }
}

run();
