// SOVEREIGN API — Postgres main. Serves clinic app data.
//
// TODO(TAS15): add real authentication, RBAC, rate limiting, a CORS allowlist and security headers.
// TODO(TAS15): derive clinicCode from an authenticated session; today it is a demo clinic.
import express from 'express';
import dotenv from 'dotenv';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDb, listPatients, listAppointments, createAppointment } from '@sovereign/db/dist/index.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json());

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
dotenv.config({ path: join(apiRoot, '.env') });

const PORT = Number(process.env.API_PORT || 3001);
const DEMO_CLINIC = process.env.DEMO_CLINIC_CODE || 'DEMO';
const DEMO_LOGIN = process.env.DEMO_LOGIN || '';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || '';
// Demo login is hard-blocked in production.
const DEMO_ENABLED = process.env.NODE_ENV !== 'production';

function logInternalError(context, err) {
  // Log diagnostics server-side only; never return them to the client.
  const name = err && typeof err === 'object' && 'name' in err ? String(err.name) : 'Error';
  const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : 'unknown';
  const message = err instanceof Error ? err.message : 'unknown error';
  console.error('[api] ' + context + ' failed (' + name + '/' + code + '): ' + message);
}

function sendInternalError(res, context, err) {
  logInternalError(context, err);
  res.status(500).json({ error: 'internal_error' });
}

function resolveClinicCode() {
  // TODO(TAS15): replace with the clinic code from an authenticated session.
  // Until then the API is single-clinic; RLS still enforces the selected clinic.
  return DEMO_CLINIC;
}

app.get('/health', async (req, res) => {
  const db = await checkDb();
  res.status(db.ok ? 200 : 503).json({
    ok: db.ok,
    db: { ok: db.ok, detail: db.ok ? 'postgres reachable' : 'unavailable' }
  });
});

app.post('/api/login', (req, res) => {
  if (!DEMO_ENABLED || !DEMO_LOGIN || !DEMO_PASSWORD) {
    return res.status(403).json({ error: 'demo_login_disabled' });
  }
  const { login, password } = req.body || {};
  if (login === DEMO_LOGIN && password === DEMO_PASSWORD) {
    return res.json({ ok: true, clinicCode: DEMO_CLINIC, user: login });
  }
  return res.status(401).json({ error: 'invalid_credentials' });
});

app.get('/api/patients', async (req, res) => {
  try {
    res.json({ ok: true, source: 'postgres', data: await listPatients(resolveClinicCode()) });
  } catch (err) {
    sendInternalError(res, 'GET /api/patients', err);
  }
});

app.get('/api/appointments', async (req, res) => {
  try {
    res.json({ ok: true, source: 'postgres', data: await listAppointments(resolveClinicCode()) });
  } catch (err) {
    sendInternalError(res, 'GET /api/appointments', err);
  }
});

app.post('/api/appointments', async (req, res) => {
  const { patientId, startsAt, note } = req.body || {};
  if (!patientId || !startsAt) {
    return res.status(400).json({ error: 'patientId_and_startsAt_required' });
  }
  try {
    const row = await createAppointment(resolveClinicCode(), patientId, startsAt, note || '');
    res.json({ ok: true, source: 'postgres', data: row });
  } catch (err) {
    sendInternalError(res, 'POST /api/appointments', err);
  }
});

// TODO(TAS15): add rate limiting, a CORS allowlist and security headers before exposing this API.
app.use((req, res) => {
  res.status(404).json({ error: 'not_found' });
});

app.use((err, req, res, next) => {
  logInternalError('unhandled', err);
  res.status(500).json({ error: 'internal_error' });
});

app.listen(PORT, () => console.log('SOVEREIGN API on :' + PORT));
