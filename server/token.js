import crypto from 'node:crypto';

// Signed "unlock" token issued after someone contributes a salary. Stored in an httpOnly
// cookie; the server refuses to return individual salary data without a valid one.

// The fallback is public (this repo is open source), so production must set its own secret or
// anyone could mint unlock cookies.
if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('SESSION_SECRET is not set. Set it to a long random string (Render generates one from render.yaml).');
}
const SECRET = process.env.SESSION_SECRET || 'dev-only-secret-change-me';
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

export const COOKIE_NAME = 'dtfyi_unlock';
export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: MAX_AGE_MS,
  path: '/',
};

const b64 = (buf) => Buffer.from(buf).toString('base64url');
const hmac = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url');

// ep is the database epoch (see db.js): a token from a different database doesn't unlock.
export function signUnlock(salaryId, ep) {
  const payload = b64(JSON.stringify({ sid: salaryId, ep, iat: Date.now() }));
  return `${payload}.${hmac(payload)}`;
}

export function verifyUnlock(token, ep) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = hmac(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (Date.now() - data.iat > MAX_AGE_MS) return null;
    if (data.ep !== ep) return null;
    return data;
  } catch {
    return null;
  }
}

export function hashIp(ip) {
  return crypto.createHmac('sha256', SECRET).update(String(ip || '')).digest('hex').slice(0, 24);
}
