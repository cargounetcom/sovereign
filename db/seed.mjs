// Idempotent demo seed for local development only.
// Adds the synthetic clinic `DEMO` and test patient `Test Test` (1990-01-01).
// NEVER inserts real patient data. NEVER deletes real data.
// Re-running is safe: a row is inserted only when none with the same key exists.
// Usage: DATABASE_URL=... npm run db:seed
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: join(root, '.env') });
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: url });
let client;
try {
  client = await pool.connect();
  // RLS FORCE requires the clinic context on every statement, including seed.
  await client.query('BEGIN');
  await client.query("SELECT set_config('app.clinic_code', 'DEMO', true)");

  const clinic = await client.query(
    `INSERT INTO clinics (clinic_code, name)
     SELECT 'DEMO', 'Demo Clinic'
     WHERE NOT EXISTS (SELECT 1 FROM clinics WHERE clinic_code = 'DEMO')
     RETURNING clinic_code`
  );
  const patient = await client.query(
    `INSERT INTO patients (clinic_code, full_name, dob)
     SELECT 'DEMO', 'Test Test', DATE '1990-01-01'
     WHERE NOT EXISTS (
       SELECT 1 FROM patients WHERE clinic_code = 'DEMO' AND full_name = 'Test Test' AND dob = DATE '1990-01-01'
     )
     RETURNING id`
  );
  const counts = await client.query(
    `SELECT (SELECT count(*) FROM clinics)::int AS clinics,
            (SELECT count(*) FROM patients)::int AS patients`
  );
  await client.query('COMMIT');
  console.log('seed: clinic ' + (clinic.rowCount ? 'created' : 'already present')
    + ', test patient ' + (patient.rowCount ? 'created' : 'already present'));
  console.log('counts: ' + JSON.stringify(counts.rows[0]));
} catch (err) {
  if (client) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
  }
  console.error('seed failed: ' + (err instanceof Error ? err.message : String(err)));
  process.exitCode = 1;
} finally {
  if (client) client.release();
  await pool.end();
}
