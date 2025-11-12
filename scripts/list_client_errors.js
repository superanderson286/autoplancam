import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query('SELECT id, message, url, user_agent, created_at FROM client_errors ORDER BY created_at DESC LIMIT 20');
    if (res.rowCount === 0) {
      console.log('No client_errors rows found.');
    } else {
      res.rows.forEach(r => console.log(r));
    }
  } catch (e) {
    console.error('Error querying client_errors:', e);
  } finally {
    await pool.end();
  }
}

run();
