import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sql = `ALTER TABLE trial_requests
  ADD COLUMN IF NOT EXISTS ip TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS note TEXT;

CREATE INDEX IF NOT EXISTS idx_trial_requests_ip_created_at ON trial_requests (ip, created_at);
CREATE INDEX IF NOT EXISTS idx_trial_requests_fingerprint ON trial_requests (fingerprint);
`;

async function run() {
  try {
    console.log('Applying ALTER TABLE to add anti-abuse columns (if missing)...');
    await pool.query(sql);
    console.log('Done.');
    await pool.end();
  } catch (err) {
    console.error('Error applying SQL:', err);
    process.exit(1);
  }
}

run();
