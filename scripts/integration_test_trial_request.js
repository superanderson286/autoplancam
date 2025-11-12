import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  console.log('Starting integration test: insert trial_request and verify anti-abuse fields');
  const testEmail = `itest+${Date.now()}@example.com`;
  const fingerprint = 'itest-fp-12345';
  const ip = '127.0.0.1';
  const userAgent = 'integration-test-agent/1.0';

  try {
    // Insert a test row
    const insertSQL = `INSERT INTO trial_requests (first_name,last_name,country,email,use_case,status,ip,user_agent,fingerprint,note)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, created_at`;
    const insertRes = await pool.query(insertSQL, ['Test','User','Testland', testEmail, 'integration-test', 'pending', ip, userAgent, fingerprint, 'itest']);
    const insertedId = insertRes.rows[0].id;
    console.log('Inserted id:', insertedId);

    // Read it back
    const selectSQL = `SELECT id, email, ip, user_agent, fingerprint, note FROM trial_requests WHERE id = $1`;
    const selectRes = await pool.query(selectSQL, [insertedId]);
    if (selectRes.rowCount !== 1) throw new Error('Inserted row not found');
    const row = selectRes.rows[0];

    const checks = [
      { key: 'email', ok: row.email === testEmail },
      { key: 'ip', ok: row.ip === ip },
      { key: 'user_agent', ok: row.user_agent === userAgent },
      { key: 'fingerprint', ok: row.fingerprint === fingerprint },
    ];

    checks.forEach(c => console.log(`${c.key}: ${c.ok ? 'OK' : 'FAIL'}`));

    const failed = checks.filter(c => !c.ok);
    if (failed.length > 0) {
      throw new Error('Some checks failed: ' + failed.map(f => f.key).join(', '));
    }

    // Cleanup
    await pool.query('DELETE FROM trial_requests WHERE id = $1', [insertedId]);
    console.log('Integration test passed, cleaned up.');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Integration test failed:', err);
    await pool.end();
    process.exit(1);
  }
}

run();
