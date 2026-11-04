import { Pool } from 'pg';

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
    return r.rows[0]?.ok === 1 ? { ok: true, detail: 'postgres reachable' } : { ok: false, detail: 'bad SELECT 1' };
  } catch (err) {
    return { ok: false, detail: String(err) };
  }
}

export interface Patient {
  id: string;
  clinic_code: string;
  full_name: string;
  dob: string;
}

export async function listPatients(clinicCode: string): Promise<Patient[]> {
  const p = getPool();
  const r = await p.query('SELECT id, clinic_code, full_name, to_char(dob, $1) AS dob FROM patients WHERE clinic_code = $2 ORDER BY full_name', ['YYYY-MM-DD', clinicCode]);
  return r.rows;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  starts_at: string;
  note: string;
}

export async function listAppointments(clinicCode: string): Promise<Appointment[]> {
  const p = getPool();
  const r = await p.query('SELECT id, patient_id, doctor_id, starts_at, note FROM appointments WHERE clinic_code = $1 ORDER BY starts_at DESC LIMIT 50', [clinicCode]);
  return r.rows;
}

export async function createAppointment(clinicCode: string, patientId: string, startsAt: string, note: string): Promise<Appointment> {
  const p = getPool();
  const r = await p.query(
    'INSERT INTO appointments (clinic_code, patient_id, starts_at, note) VALUES ($1, $2, $3, $4) RETURNING id, patient_id, doctor_id, starts_at, note',
    [clinicCode, patientId, startsAt, note]
  );
  return r.rows[0];
}
