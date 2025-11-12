import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='trial_requests' ORDER BY ordinal_position;");
  console.log('#\tcolumn_name');
    res.rows.forEach((r, i) => {
      console.log(`${i + 1}\t${r.column_name}`);
    });
    await pool.end();
  } catch (err) {
    console.error('Error querying DB:', err);
    process.exit(1);
  }
}

run();
