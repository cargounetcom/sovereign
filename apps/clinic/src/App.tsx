import { useState } from 'react';
import { apiLogin, apiPatients, type Patient } from './api';

// TAS12-db: Postgres main via API. Mocks = fallback if API offline.
export default function App() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [source, setSource] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await apiLogin(login, password);
    if (r.ok) {
      setAuthed(true);
      setError('');
      const p = await apiPatients();
      setPatients(p.data);
      setSource(p.source);
    } else {
      setError(r.error || 'login failed');
    }
  }

  if (authed) {
    return (
      <main style={{ fontFamily: 'system-ui', padding: 32 }}>
        <h1>Sovereign Clinic — dashboard</h1>
        <p>Logged in as <b>{login}</b>. Source: <b>{source}</b></p>
        <h2>Patients</h2>
        <ul>
          {patients.map((p) => (
            <li key={p.id}>{p.full_name} — {p.dob}</li>
          ))}
        </ul>
        <button onClick={() => { setAuthed(false); setLogin(''); setPassword(''); setPatients([]); }}>Logout</button>
      </main>
    );
  }

  return (
    <main style={{ fontFamily: 'system-ui', padding: 32, maxWidth: 360 }}>
      <h1>Sovereign Clinic — login</h1>
      <form onSubmit={submit}>
        <div><input placeholder="login" value={login} onChange={(e) => setLogin(e.target.value)} /></div>
        <div><input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">Sign in</button>
      </form>
      <p style={{ opacity: 0.6 }}>doctor / test123. Postgres main, mocks fallback.</p>
    </main>
  );
}
