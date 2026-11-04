import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
// TAS10: mock login only. No DB, no real patients. Postgres = plan only.
const TEST_USER = { login: 'doctor', password: 'test123' };
export default function App() {
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [authed, setAuthed] = useState(false);
    const [error, setError] = useState('');
    function submit(e) {
        e.preventDefault();
        if (login === TEST_USER.login && password === TEST_USER.password) {
            setAuthed(true);
            setError('');
        }
        else {
            setError('Wrong login or password (hint: doctor / test123)');
        }
    }
    if (authed) {
        return (_jsxs("main", { style: { fontFamily: 'system-ui', padding: 32 }, children: [_jsx("h1", { children: "Sovereign Clinic \u2014 dashboard (mock)" }), _jsxs("p", { children: ["Logged in as ", _jsx("b", { children: login }), ". Test patient only: Test Test, 1990-01-01."] }), _jsx("button", { onClick: () => { setAuthed(false); setLogin(''); setPassword(''); }, children: "Logout" })] }));
    }
    return (_jsxs("main", { style: { fontFamily: 'system-ui', padding: 32, maxWidth: 360 }, children: [_jsx("h1", { children: "Sovereign Clinic \u2014 login (mock)" }), _jsxs("form", { onSubmit: submit, children: [_jsx("div", { children: _jsx("input", { placeholder: "login", value: login, onChange: (e) => setLogin(e.target.value) }) }), _jsx("div", { children: _jsx("input", { placeholder: "password", type: "password", value: password, onChange: (e) => setPassword(e.target.value) }) }), error && _jsx("p", { style: { color: 'red' }, children: error }), _jsx("button", { type: "submit", children: "Sign in" })] }), _jsx("p", { style: { opacity: 0.6 }, children: "TAS10 mock: doctor / test123. No DB connected." })] }));
}
