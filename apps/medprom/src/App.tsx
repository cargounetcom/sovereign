import { useState } from 'react';

// TAS11: mock login only. No DB, no real patients. medprom re-enabled as scaffold.
const TEST_USER = { login: 'doctor', password: 'test123' };

export default function App() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (login === TEST_USER.login && password === TEST_USER.password) {
      setAuthed(true);
      setError('');
    } else {
      setError('Wrong login or password (hint: doctor / test123)');
    }
  }

  if (authed) {
    return (
      <main style={{ fontFamily: 'system-ui', padding: 32 }}>
        <h1>Sovereign Medprom — promos (mock)</h1>
        <p>Logged in as <b>{login}</b>. Test data only, no real patients.</p>
        <button onClick={() => { setAuthed(false); setLogin(''); setPassword(''); }}>Logout</button>
      </main>
    );
  }

  return (
    <main style={{ fontFamily: 'system-ui', padding: 32, maxWidth: 360 }}>
      <h1>Sovereign Medprom — login (mock)</h1>
      <form onSubmit={submit}>
        <div><input placeholder="login" value={login} onChange={(e) => setLogin(e.target.value)} /></div>
        <div><input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">Sign in</button>
      </form>
      <p style={{ opacity: 0.6 }}>TAS11 mock: doctor / test123. No DB connected.</p>
    </main>
  );
}
