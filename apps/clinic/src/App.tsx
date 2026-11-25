import { useState } from 'react';
import { apiLogin, apiPatients, apiCreatePatient, type Patient } from './api';

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
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [newDob, setNewDob] = useState('');
  const [formError, setFormError] = useState('');

  async function refreshPatients(q = search) {
    const p = await apiPatients(q);
    setPatients(p.data);
    setSource(p.source);
    setOffline(p.offline);
    setOfflineDetail(p.error || '');
  }

  async function addPatient(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    const r = await apiCreatePatient(newName, newDob);
    if (!r.ok) { setFormError(r.error || 'could not create patient'); return; }
    setNewName(''); setNewDob('');
    await refreshPatients();
  }

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
        <div>
          <input
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => refreshPatients()}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); refreshPatients(); } }}
          />
          <button onClick={() => refreshPatients()}>Search</button>
        </div>
        <form onSubmit={addPatient} style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="Full name" value={newName} onChange={(e) => setNewName(e.target.value)} required />
          <input placeholder="DOB (YYYY-MM-DD)" value={newDob} onChange={(e) => setNewDob(e.target.value)} required />
          <button type="submit">Add patient</button>
        </form>
        {formError && <p style={{ color: 'red' }}>{formError}</p>}
        {patients.length === 0 && !offline && <p>No patients on record.</p>}
        <ul>
          {patients.map((p) => (
            <li key={p.id}>{p.full_name} — {p.dob}</li>
          ))}
        </ul>
        <button onClick={() => { setAuthed(false); setLogin(''); setPassword(''); setPatients([]); setOffline(false); setOfflineDetail(''); setSearch(''); setNewName(''); setNewDob(''); setFormError(''); }}>Logout</button>
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
