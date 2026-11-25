// TAS16: signed session cookie helpers (HMAC-SHA256), dependency-free.
// Exported separately so they can be unit-tested with node:test.
import { createHmac, timingSafeEqual } from 'node:crypto';

export const COOKIE_NAME = 'sovereign_session';
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function signSession(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return body + '.' + sig;
}

export function readSession(raw, secret) {
  if (!raw) return null;
  const [body, sig] = String(raw).split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload || typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
    if (!payload.clinic_code || !payload.role || !payload.sub) return null;
    return payload;
  } catch {
    return null;
  }
}
