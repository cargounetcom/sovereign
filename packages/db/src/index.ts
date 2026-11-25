import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import { scryptSync, timingSafeEqual, randomBytes } from 'node:crypto';

// Postgres main. Connection string from DATABASE_URL only — never hardcoded.
let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  pool = new Pool({ connectionString: url, max: 5 });
  return pool;
}

export async function checkDb(): Promise<{ ok: boolean; detail: string }> {
  try {
    const p = getPool();
    const r = await p.query('SELECT 1 AS ok');
    return r.rows[0]?.ok === 1 ? { ok: true, detail: 'postgres reachable' } : { ok: false, detail: 'unavailable' };
  } catch {
    // Never return database error details to the API layer.
    return { ok: false, detail: 'unavailable' };
  }
}

// Runs a query inside a transaction with a transaction-local clinic context.
// The RLS policies in migration 0002 read app.clinic_code.
async function withClinic<T>(
  clinicCode: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  if (!clinicCode) throw new Error('clinicCode is required');
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.clinic_code', $1, true)", [clinicCode]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback failure; the original error is more useful.
    }
    throw err;
  } finally {
    client.release();
  }
}

// ---- TAS16: authentication helpers -------------------------------------

export interface AuthUser {
  id: string;
  clinic_code: string;
  login: string;
  full_name: string;
  role: 'doctor' | 'clinic_admin';
}

// Scrypt password hash stored as: scrypt$N$r$saltHex$hashHex.
// Formatting is done here so the API never handles raw password material.
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64, SCRYPT_OPTIONS);
  return `scrypt$${SCRYPT_N}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

const SCRYPT_N = 16384;
const SCRYPT_OPTIONS = { N: SCRYPT_N, r: 8, p: 1 } as const;

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, nStr, saltHex, hashHex] = stored.split('$');
    if (scheme !== 'scrypt') return false;
    const n = Number(nStr);
    if (!Number.isInteger(n) || n < 1024) return false;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    if (expected.length !== 64) return false;
    const actual = scryptSync(password, salt, 64, { N: n, r: 8, p: 1 });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

// Looks up an active doctor by login within a clinic RLS context and verifies
// the scrypt hash. The clinic code must be supplied at login (tenant identifier);
// for a single-clinic demo the API falls back to DEMO_CLINIC_CODE. Running this
// inside withClinic keeps FORCE RLS satisfied and prevents cross-tenant login.
export async function authenticateDoctor(
  clinicCode: string,
  login: string,
  password: string
): Promise<AuthUser | null> {
  if (!clinicCode || !login || !password) return null;
  return withClinic(clinicCode, async (client) => {
    const r = await client.query(
      `SELECT id, clinic_code, login, full_name, role, password_hash
         FROM doctors
        WHERE login = $1 AND is_active = true`,
      [login]
    );
    const row = r.rows[0];
    if (!row || !verifyPassword(password, row.password_hash)) return null;
    return {
      id: row.id,
      clinic_code: row.clinic_code,
      login: row.login,
      full_name: row.full_name,
      role: row.role
    };
  });
}

export interface Patient {
  id: string;
  clinic_code: string;
  full_name: string;
  dob: string;
}

export async function listPatients(clinicCode: string, search?: string): Promise<Patient[]> {
  return withClinic(clinicCode, async (client) => {
    // Search is scoped inside the RLS clinic context; the pattern is bound,
    // never concatenated into SQL.
    const pattern = search && search.trim() ? `%${search.trim()}%` : '%';
    const r = await client.query(
      `SELECT id, clinic_code, full_name, to_char(dob, $1) AS dob
         FROM patients
        WHERE clinic_code = $2 AND full_name ILIKE $3
        ORDER BY full_name`,
      ['YYYY-MM-DD', clinicCode, pattern]
    );
    return r.rows;
  });
}

export async function createPatient(
  clinicCode: string,
  fullName: string,
  dob: string,
): Promise<Patient> {
  const name = fullName.trim();
  if (!name) throw new Error('fullName is required');
  // Strict YYYY-MM-DD validation before it reaches DATE cast.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(Date.parse(dob))) {
    throw new Error('dob must be YYYY-MM-DD');
  }
  return withClinic(clinicCode, async (client) => {
    const r = await client.query(
      `INSERT INTO patients (clinic_code, full_name, dob)
       VALUES ($1, $2, $3)
       RETURNING id, clinic_code, full_name, to_char(dob, 'YYYY-MM-DD') AS dob`,
      [clinicCode, name, dob]
    );
    return r.rows[0];
  });
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  starts_at: string;
  note: string;
}

export async function listAppointments(clinicCode: string): Promise<Appointment[]> {
  return withClinic(clinicCode, async (client) => {
    const r = await client.query(
      'SELECT id, patient_id, doctor_id, starts_at, note FROM appointments WHERE clinic_code = $1 ORDER BY starts_at DESC LIMIT 50',
      [clinicCode]
    );
    return r.rows;
  });
}

export async function createAppointment(clinicCode: string, patientId: string, startsAt: string, note: string): Promise<Appointment> {
  return withClinic(clinicCode, async (client) => {
    const r = await client.query(
      'INSERT INTO appointments (clinic_code, patient_id, starts_at, note) VALUES ($1, $2, $3, $4) RETURNING id, patient_id, doctor_id, starts_at, note',
      [clinicCode, patientId, startsAt, note]
    );
    return r.rows[0];
  });
}
