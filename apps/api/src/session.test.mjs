// TAS16 unit tests for signed sessions — no dependencies, node:test only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { signSession, readSession, SESSION_TTL_MS } from './session.mjs';

const SECRET = 'unit-test-secret';
const valid = () => ({
  sub: 'doctor-1',
  clinic_code: 'DEMO',
  role: 'doctor',
  login: 'dr_test',
  iat: Date.now(),
  exp: Date.now() + SESSION_TTL_MS
});

test('valid signed session round-trips', () => {
  const token = signSession(valid(), SECRET);
  const parsed = readSession(token, SECRET);
  assert.equal(parsed.clinic_code, 'DEMO');
  assert.equal(parsed.role, 'doctor');
  assert.equal(parsed.sub, 'doctor-1');
});

test('forged signature is rejected', () => {
  const token = signSession(valid(), SECRET);
  const [, body] = token.split('.');
  assert.equal(readSession(body + '.forged', SECRET), null);
});

test('wrong secret is rejected', () => {
  const token = signSession(valid(), SECRET);
  assert.equal(readSession(token, 'another-secret'), null);
});

test('expired session is rejected', () => {
  const payload = valid();
  payload.exp = Date.now() - 1000;
  assert.equal(readSession(signSession(payload, SECRET), SECRET), null);
});

test('session missing required claims is rejected', () => {
  assert.equal(readSession(signSession({ exp: Date.now() + 10000 }, SECRET), SECRET), null);
});

test('tampered payload is rejected', () => {
  const token = signSession(valid(), SECRET);
  const [body, sig] = token.split('.');
  const tampered = Buffer.from(JSON.stringify({ ...valid(), role: 'system_admin' })).toString('base64url');
  assert.equal(readSession(tampered + '.' + sig, SECRET), null);
  assert.ok(body);
});
