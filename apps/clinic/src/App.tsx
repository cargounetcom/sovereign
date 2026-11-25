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
  const [offline, setOffline] = useState(false);
  const [offlineDetail, setOfflineDetail] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await apiLogin(login, password);
    if (r.ok) {
      setAuthed(true);
      setError('');
      const p = await apiPatients();
      setPatients(p.data);
      setSource(p.source);
      setOffline(p.offline);
      setOfflineDetail(p.error || '');
    } else {
      setError(r.error || 'login failed');
    }
  }

  if (authed) {
    return (
      <main style={{ fontFamily: 'system-ui', padding: 32 }}>
        <h1>Sovereign Clinic — dashboard</h1>
        <p>Logged in as <b>{login}</b>. Source: <b>{source}</b></p>
        {offline && (
          <div role="alert" style={{ border: '1px solid #b00', background: '#fff4f4', color: '#800', padding: 12, borderRadius: 6 }}>
            <b>Offline — live data unavailable.</b> The API could not be reached
            {offlineDetail ? ` (${offlineDetail})` : ''}. No patient data is shown.
          </div>
        )}
        <h2>Patients</h2>
        {patients.length === 0 && !offline && <p>No patients on record.</p>}
        <ul>
          {patients.map((p) => (
            <li key={p.id}>{p.full_name} — {p.dob}</li>
          ))}
        </ul>
        <button onClick={() => { setAuthed(false); setLogin(''); setPassword(''); setPatients([]); setOffline(false); setOfflineDetail(''); }}>Logout</button>
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
      <p style={{ opacity: 0.6 }}>Demo login is configured in the API environment. Postgres main.</p>
    </main>
  );
}
