import { Pool } from 'pg';
import type { PoolClient } from 'pg';

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

export interface Patient {
  id: string;
  clinic_code: string;
  full_name: string;
  dob: string;
}

export async function listPatients(clinicCode: string): Promise<Patient[]> {
  return withClinic(clinicCode, async (client) => {
    const r = await client.query(
      'SELECT id, clinic_code, full_name, to_char(dob, $1) AS dob FROM patients WHERE clinic_code = $2 ORDER BY full_name',
      ['YYYY-MM-DD', clinicCode]
    );
    return r.rows;
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
