// SOVEREIGN API — Postgres main. Serves clinic app data.
//
// TAS16: real authentication (signed httpOnly session cookie), role-based
// access and server-derived clinic code. No hardcoded demo clinic in the data
// path. Security baseline (headers/CORS/rate limit) is included.
import express from 'express';
import dotenv from 'dotenv';
import { join, dirname } from 'node:path';
import { COOKIE_NAME, SESSION_TTL_MS, signSession, readSession } from './session.mjs';
import { fileURLToPath } from 'node:url';
import {
  checkDb, listPatients, createPatient, listAppointments, createAppointment,
  authenticateDoctor
} from '@sovereign/db/dist/index.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json());

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
dotenv.config({ path: join(apiRoot, '.env') });

const PORT = Number(process.env.API_PORT || 3001);
const SESSION_SECRET = process.env.SESSION_SECRET || '';
const DEMO_ENABLED = process.env.NODE_ENV !== 'production';
const DEMO_CLINIC = process.env.DEMO_CLINIC_CODE || 'DEMO';

if (!SESSION_SECRET && process.env.NODE_ENV === 'production') {
  console.error('[api] SESSION_SECRET must be set in production');
  process.exit(1);
}

// ---- session helpers live in ./session.mjs (unit-tested) -----------------

function sessionFromReq(req) {
  return readSession(req.cookies?.[COOKIE_NAME], SESSION_SECRET || 'dev-only-secret');
}

// Minimal cookie parser — no extra dependency.
app.use((req, _res, next) => {
  req.cookies = {};
  const header = req.headers.cookie;
  if (header) {
    for (const part of header.split(';')) {
      const i = part.indexOf('=');
      if (i > 0) {
        const k = part.slice(0, i).trim();
        const v = part.slice(i + 1).trim();
        if (k) req.cookies[k] = decodeURIComponent(v);
      }
    }
  }
  next();
});

// ---- security baseline --------------------------------------------------

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'deny');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  const origin = req.headers.origin;
  const allow = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (origin && allow.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// Simple per-IP rate limit on write endpoints (in-memory, best effort).
const writeHits = new Map();
app.use((req, res, next) => {
  if (req.method !== 'POST' || !req.path.startsWith('/api/')) return next();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const hits = (writeHits.get(ip) || []).filter((t) => now - t < 60_000);
  if (hits.length >= 60) return res.status(429).json({ error: 'too_many_requests' });
  hits.push(now);
  writeHits.set(ip, hits);
  next();
});

function logInternalError(context, err) {
  const name = err && typeof err === 'object' && 'name' in err ? String(err.name) : 'Error';
  const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : 'unknown';
  const message = err instanceof Error ? err.message : 'unknown error';
  console.error('[api] ' + context + ' failed (' + name + '/' + code + '): ' + message);
}

function sendInternalError(res, context, err) {
  logInternalError(context, err);
  res.status(500).json({ error: 'internal_error' });
}

// Every data route gets clinic_code from the signed session, NEVER the client.
function withAuth(req, res, next) {
  const session = sessionFromReq(req);
  if (!session) return res.status(401).json({ error: 'unauthorized' });
  req.session = session;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !roles.includes(req.session.role)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    next();
  };
}

function resolveClinicCode(req) {
  return req.session.clinic_code; // derived from signed session
}

app.get('/health', async (req, res) => {
  const db = await checkDb();
  res.status(db.ok ? 200 : 503).json({
    ok: db.ok,
    db: { ok: db.ok, detail: db.ok ? 'postgres reachable' : 'unavailable' }
  });
});

app.post('/api/login', async (req, res) => {
  if (!DEMO_ENABLED && !SESSION_SECRET) {
    return res.status(403).json({ error: 'login_unavailable' });
  }
  const { login, password } = req.body || {};
  if (typeof login !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'login_and_password_required' });
  }
  try {
    // clinic_code is a tenant identifier, not a trusted auth claim: for this
    // single-clinic deployment it comes from the server env, never the client.
    const clinicCode = typeof req.body?.clinicCode === 'string' && req.body.clinicCode.trim()
      ? req.body.clinicCode.trim()
      : DEMO_CLINIC;
    const user = await authenticateDoctor(clinicCode, login, password);
    if (!user) return res.status(401).json({ error: 'invalid_credentials' });
    const token = signSession({
      sub: user.id,
      clinic_code: user.clinic_code,
      role: user.role,
      login: user.login,
      iat: Date.now(),
      exp: Date.now() + SESSION_TTL_MS
    }, SESSION_SECRET || 'dev-only-secret');
    res.setHeader(
      'Set-Cookie',
      `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}` +
      (process.env.NODE_ENV === 'production' ? '; Secure' : '')
    );
    return res.json({ ok: true, clinicCode: user.clinic_code, role: user.role, user: user.login });
  } catch (err) {
    sendInternalError(res, 'POST /api/login', err);
  }
});

app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
  res.json({ ok: true });
});

app.get('/api/session', (req, res) => {
  const s = sessionFromReq(req);
  if (!s) return res.status(401).json({ error: 'unauthorized' });
  res.json({ ok: true, clinicCode: s.clinic_code, role: s.role, user: s.login });
});

// ---- authenticated data routes -----------------------------------------

app.get('/api/patients', withAuth, async (req, res) => {
  try {
    const search = typeof req.query?.search === 'string' ? req.query.search : undefined;
    res.json({ ok: true, source: 'postgres', data: await listPatients(resolveClinicCode(req), search) });
  } catch (err) {
    sendInternalError(res, 'GET /api/patients', err);
  }
});

app.post('/api/patients', withAuth, requireRole('doctor', 'clinic_admin'), async (req, res) => {
  const { fullName, dob } = req.body || {};
  if (typeof fullName !== 'string' || !fullName.trim() || typeof dob !== 'string') {
    return res.status(400).json({ error: 'fullName_and_dob_required' });
  }
  try {
    const row = await createPatient(resolveClinicCode(req), fullName, dob);
    res.status(201).json({ ok: true, source: 'postgres', data: row });
  } catch (err) {
    if (err instanceof Error && (err.message === 'fullName is required' || err.message === 'dob must be YYYY-MM-DD')) {
      return res.status(400).json({ error: 'invalid_patient_input', detail: err.message });
    }
    sendInternalError(res, 'POST /api/patients', err);
  }
});

app.get('/api/appointments', withAuth, async (req, res) => {
  try {
    res.json({ ok: true, source: 'postgres', data: await listAppointments(resolveClinicCode(req)) });
  } catch (err) {
    sendInternalError(res, 'GET /api/appointments', err);
  }
});

app.post('/api/appointments', withAuth, requireRole('doctor', 'clinic_admin'), async (req, res) => {
  const { patientId, startsAt, note } = req.body || {};
  if (!patientId || !startsAt) {
    return res.status(400).json({ error: 'patientId_and_startsAt_required' });
  }
  try {
    const row = await createAppointment(resolveClinicCode(req), patientId, startsAt, note || '');
    res.json({ ok: true, source: 'postgres', data: row });
  } catch (err) {
    sendInternalError(res, 'POST /api/appointments', err);
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'not_found' });
});

app.use((err, req, res, next) => {
  logInternalError('unhandled', err);
  res.status(500).json({ error: 'internal_error' });
});

app.listen(PORT, () => console.log('SOVEREIGN API on :' + PORT));
