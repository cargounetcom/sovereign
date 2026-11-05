// TAS12-db: Postgres main via API (:3001). SQLite WASM + mocks = fallback/demo only.
export interface Patient {
  id: string;
  clinic_code: string;
  full_name: string;
  dob: string;
}

const API = '';

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
    // TODO(TAS15): replace mock fallback with a real offline/auth strategy.
    return { ok: false, error: 'API offline' };
  }
}

export async function apiPatients(): Promise<{ source: string; data: Patient[] }> {
  try {
    const r = await fetch(API + '/api/patients');
    const j = await r.json();
    if (j.ok) return { source: 'postgres', data: j.data };
  } catch { /* fallback below */ }
  const DEMO: Patient[] = [
    { id: 'demo-1', clinic_code: 'DEMO', full_name: 'Demo Patient 1', dob: '1990-01-01' },
    { id: 'demo-2', clinic_code: 'DEMO', full_name: 'Demo Patient 2', dob: '1990-01-01' },
    { id: 'demo-3', clinic_code: 'DEMO', full_name: 'Demo Patient 3', dob: '1990-01-01' },
  ];
  return { source: 'mock-fallback', data: DEMO };
}
