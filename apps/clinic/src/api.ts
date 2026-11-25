// TAS12-db: Postgres main via API (:3001). No silent mock fallback.
// If the API is offline, callers receive an explicit error + offline flag so
// the UI can show a banner instead of presenting synthetic patients as real.
export interface Patient {
  id: string;
  clinic_code: string;
  full_name: string;
  dob: string;
}

const API = '';

export interface PatientsResult {
  source: 'postgres' | 'unavailable';
  data: Patient[];
  offline: boolean;
  error?: string;
}

export async function apiLogin(login: string, password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch(API + '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password })
    });
    const j = await r.json();
    return j.ok ? { ok: true } : { ok: false, error: j.error || 'login failed' };
  } catch {
    return { ok: false, error: 'API offline — sign-in unavailable' };
  }
}

export async function apiPatients(search?: string): Promise<PatientsResult> {
  try {
    const url = API + '/api/patients' + (search && search.trim() ? '?search=' + encodeURIComponent(search.trim()) : '');
    const r = await fetch(url);
    const j = await r.json();
    if (r.ok && j.ok) return { source: 'postgres', data: j.data ?? [], offline: false };
    return { source: 'unavailable', data: [], offline: true, error: j.error || 'API error' };
  } catch {
    // No mock fallback: never show synthetic patients as live data.
    return { source: 'unavailable', data: [], offline: true, error: 'API unreachable' };
  }
}

export async function apiCreatePatient(fullName: string, dob: string): Promise<{ ok: boolean; error?: string; patient?: Patient }> {
  try {
    const r = await fetch(API + '/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, dob })
    });
    const j = await r.json();
    if (r.ok && j.ok) return { ok: true, patient: j.data };
    return { ok: false, error: j.detail || j.error || 'could not create patient' };
  } catch {
    return { ok: false, error: 'API unreachable' };
  }
}
