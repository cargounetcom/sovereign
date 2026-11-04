import { useState } from 'react';

// TAS11: mock login only. No DB, no real patients.
// TODO(TAS15): replace this mock login with the real API auth flow.
const DEMO_LOGIN = import.meta.env.VITE_DEMO_LOGIN || '';
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || '';
const DEMO_ENABLED = !import.meta.env.PROD && Boolean(DEMO_LOGIN && DEMO_PASSWORD);

export default function App() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!DEMO_ENABLED) {
      setError('Demo login is disabled in this environment.');
      return;
    }
    if (login === DEMO_LOGIN && password === DEMO_PASSWORD) {
      setAuthed(true);
      setError('');
    } else {
      setError('Wrong login or password.');
    }
  }

  if (authed) {
    return (
      <main style={{ fontFamily: 'system-ui', padding: 32 }}>
        <h1>Sovereign Meet — rooms (mock)</h1>
        <p>Logged in as <b>{login}</b>. Test room: TEST-ROOM-01.</p>
        <button onClick={() => { setAuthed(false); setLogin(''); setPassword(''); }}>Logout</button>
      </main>
    );
  }

  return (
    <main style={{ fontFamily: 'system-ui', padding: 32, maxWidth: 360 }}>
      <h1>Sovereign Meet — login (mock)</h1>
      <form onSubmit={submit}>
        <div><input placeholder="login" value={login} onChange={(e) => setLogin(e.target.value)} /></div>
        <div><input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">Sign in</button>
      </form>
      <p style={{ opacity: 0.6 }}>Demo login is configured in the environment. No DB connected.</p>
    </main>
  );
}
