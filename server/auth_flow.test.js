import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * Regression coverage for a real incident: signup used to insert new users
 * via a raw connection to DATABASE_URL when that env var was set — a
 * DIFFERENT database (Neon) from the Supabase REST store that login,
 * sessions, and onboarding all read through in this deployment. Every fresh
 * signup landed a row nothing else could see. Locally DATABASE_URL is unset,
 * so the buggy branch never fired here — which is exactly how it shipped
 * unnoticed. Two guards: a static check that the anti-pattern can't quietly
 * come back, and a real signup -> login round trip over HTTP.
 */

test('routes/auth.js never special-cases DATABASE_URL for the primary user insert', () => {
  const src = readFileSync(new URL('./routes/auth.js', import.meta.url), 'utf8');
  assert.ok(!src.includes('db.supabase'), 'signup must insert only through db.createUser/db.updateUser (Supabase REST)');
  assert.ok(!/process\.env\.DATABASE_URL/.test(src), 'auth routes must not branch on DATABASE_URL');
});

for (const key of ['SERPAPI_KEY', 'BOOKING_API_TOKEN', 'BOOKING_AFFILIATE_ID', 'LITEAPI_KEY', 'NUITEE_API_KEY', 'RESEND_API_KEY']) {
  process.env[key] = '';
}

const { app } = await import('./index.js');
const db = await import('./db.js');
const { supabase: sql } = db;

let base;
let server;

before(async () => {
  server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server?.close();
  await sql.end({ timeout: 1 }).catch(() => {});
});

async function post(path, body) {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* not json */ }
  return { status: res.status, body: json };
}

test('signup -> the new account is immediately visible to db.getUser (the read path login/onboarding use)', async () => {
  const email = `signup-flow-${Date.now()}@example.com`;
  const { status, body } = await post('/api/auth/signup', {
    email, name: 'Flow Test', password: 'a-real-password-123',
  });
  assert.equal(status, 200);
  assert.ok(body.token);
  assert.equal(body.user?.email, email);

  const found = await db.getUser(email);
  assert.ok(found, 'user must be readable immediately after signup');
  assert.equal(found.email, email);
});

test('signup then login with the same credentials succeeds (was "Credenciais invalidas" on a correct password)', async () => {
  const email = `signup-login-flow-${Date.now()}@example.com`;
  const password = 'another-real-password-456';
  const signupRes = await post('/api/auth/signup', { email, name: 'Round Trip', password });
  assert.equal(signupRes.status, 200);

  const loginRes = await post('/api/auth/login', { email, password });
  assert.equal(loginRes.status, 200);
  assert.ok(loginRes.body.token);
  assert.equal(loginRes.body.user?.email, email);
});

test('forgot-password on a freshly-signed-up account finds the user (was a silent no-op)', async () => {
  const email = `signup-forgot-flow-${Date.now()}@example.com`;
  await post('/api/auth/signup', { email, name: 'Forgot Test', password: 'yet-another-pw-789' });

  const found = await db.getUser(email);
  assert.ok(found, 'forgot-password looks the user up the same way — this must find them');
});

test('signup rejects a duplicate email with a specific, actionable message (not a generic 500)', async () => {
  const email = `signup-dup-flow-${Date.now()}@example.com`;
  await post('/api/auth/signup', { email, name: 'First', password: 'first-password-123' });
  const { status, body } = await post('/api/auth/signup', { email, name: 'Second', password: 'second-password-456' });
  assert.equal(status, 409);
  assert.ok(body.error && body.error.length > 10);
  assert.equal(body.code, 'ACCOUNT_EXISTS');
});
