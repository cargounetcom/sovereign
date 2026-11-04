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
    // API down = fallback to local mock login (demo only)
    return login === 'doctor' && password === 'test123'
      ? { ok: true }
      : { ok: false, error: 'API offline + wrong mock credentials (doctor / test123)' };
  }
}

export async function apiPatients(): Promise<{ source: string; data: Patient[] }> {
  try {
    const r = await fetch(API + '/api/patients');
    const j = await r.json();
    if (j.ok) return { source: 'postgres', data: j.data };
  } catch { /* fallback below */ }
  const { INITIAL_CODE_FILES } = await import('../../../src/data/mockData');
  return {
    source: 'mock-fallback',
    data: INITIAL_CODE_FILES.slice(0, 3).map((f, i) => ({
      id: 'mock-' + i,
      clinic_code: 'DEMO',
      full_name: f.name,
      dob: '1990-01-01'
    }))
  };
}
