// TAS16 controlled bootstrap: creates/activates the first doctor account.
//
// NEVER put a password hash in a migration or commit a real password. Pass the
// password via environment at run time, e.g.:
//
//   DATABASE_URL=... DOCTOR_LOGIN=dr_iva DOCTOR_PASSWORD='...' \
//   DOCTOR_CLINIC=DEMO DOCTOR_ROLE=clinic_admin \
//   node db/bootstrap-doctor.mjs
//
// The script prints nothing sensitive. It is idempotent: re-running updates the
// hash/role/activation of the same (clinic_code, login) pair.
import pg from 'pg';
import dotenv from 'dotenv';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scryptSync, randomBytes } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: join(root, '.env') });

const url = process.env.DATABASE_URL;
const login = process.env.DOCTOR_LOGIN;
const password = process.env.DOCTOR_PASSWORD;
const clinic = process.env.DOCTOR_CLINIC || 'DEMO';
const role = process.env.DOCTOR_ROLE || 'doctor';
const fullName = process.env.DOCTOR_NAME || '';

if (!url) { console.error('DATABASE_URL is not set'); process.exit(1); }
if (!login) { console.error('DOCTOR_LOGIN is not set'); process.exit(1); }
if (!password || password.length < 10) { console.error('DOCTOR_PASSWORD must be set and >= 10 chars'); process.exit(1); }
if (!['doctor', 'clinic_admin'].includes(role)) { console.error('DOCTOR_ROLE must be doctor or clinic_admin'); process.exit(1); }

const N = 16384;
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64, { N, r: 8, p: 1 });
const stored = `scrypt$${N}$${salt.toString('hex')}$${hash.toString('hex')}`;

const pool = new pg.Pool({ connectionString: url });
try {
  // RLS (0002) is FORCE-enabled even for the owner: set the clinic context
  // transaction-locally so the inserts satisfy the isolation policy.
  await pool.query('BEGIN');
  await pool.query("SELECT set_config('app.clinic_code', $1, true)", [clinic]);
  // Ensure the clinic row exists (bootstrap only; never edits patient data).
  await pool.query(
    `INSERT INTO clinics (clinic_code, name) VALUES ($1, $2) ON CONFLICT (clinic_code) DO NOTHING`,
    [clinic, clinic]
  );
  const r = await pool.query(
    `INSERT INTO doctors (clinic_code, login, password_hash, full_name, role, is_active)
     VALUES ($1, $2, $3, $4, $5, true)
     ON CONFLICT (clinic_code, login) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           full_name = EXCLUDED.full_name,
           is_active = true
     RETURNING id, clinic_code, login, role`,
    [clinic, login, stored, fullName, role]
  );
  const row = r.rows[0];
  await pool.query('COMMIT');
  console.log('doctor ready: ' + row.clinic_code + '/' + row.login + ' (' + row.role + ') id=' + row.id);
} catch (err) {
  try { await pool.query('ROLLBACK'); } catch { /* keep original error */ }
  console.error('bootstrap failed (' + (err?.code || 'unknown') + ')');
  process.exitCode = 1;
} finally {
  await pool.end();
}
