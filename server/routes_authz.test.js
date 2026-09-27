import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { app } from './index.js';
import * as db from './db.js';
import { supabase as sql } from './db.js';
import { generateToken } from './tokens.js';
import { clearAuthCache } from './authCache.js';
import { resetBuckets } from './rateLimit.js';

/**
 * Authorization at the HTTP layer.
 *
 * Everything else in this suite is unit-level: it tests a decision function, or
 * a helper, in isolation. None of it proves that a REQUEST to a route actually
 * runs the middleware the route table claims. That gap is how the plan-upgrade
 * hole survived — planChangeDecision could have been perfect and the route
 * still wide open if the middleware were mis-wired.
 *
 * These tests mount the real app on an ephemeral port and speak HTTP to it.
 *
 * Storage: supabase-rest.js disables itself under test, so db.js uses its
 * in-memory path. Fixtures are created through the same db functions the app
 * uses, which means sessions resolve exactly as they do in production.
 */

let base;
let server;

// Fixtures
const USER_A = 'authz-user-a@example.com';
const USER_B = 'authz-user-b@example.com';
let tokenA;
let tokenB;

before(async () => {
  await db.createUser(USER_A, 'User A');
  await db.createUser(USER_B, 'User B');

  tokenA = generateToken();
  tokenB = generateToken();
  await db.createSession(USER_A, tokenA);
  await db.createSession(USER_B, tokenB);

  server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}`;

  // Sanity: the fixtures must actually authenticate, or every 401 assertion
  // below would pass for the wrong reason.
  const me = await req('GET', '/api/auth/me', { token: tokenA });
  assert.equal(me.status, 200, 'fixture session must authenticate');
});

after(async () => {
  server?.close();
  await sql.end({ timeout: 1 }).catch(() => {});
});

async function req(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* not json */ }
  return { status: res.status, body: json };
}

// Every route that must never answer an anonymous caller.
const PROTECTED = [
  ['GET', '/api/bookings'],
  ['POST', '/api/bookings'],
  ['GET', '/api/bookings/export'],
  ['GET', '/api/bookings/upcoming-deadlines'],
  ['GET', '/api/bookings/some-id'],
  ['PUT', '/api/bookings/some-id'],
  ['DELETE', '/api/bookings/some-id'],
  ['POST', '/api/bookings/some-id/check'],
  ['GET', '/api/stats'],
  ['GET', '/api/auth/me'],
  ['POST', '/api/auth/logout'],
  ['PUT', '/api/profile'],
  ['POST', '/api/auth/onboarding'],
  ['GET', `/api/users/${USER_A}`],
  ['PUT', `/api/users/${USER_A}/plan`],
  ['POST', '/api/billing/checkout'],
  ['POST', '/api/billing/portal'],
  ['POST', '/api/push/subscribe'],
  ['GET', '/api/inbound/address'],
  ['GET', '/api/availability-watches'],
  ['POST', '/api/availability-watches'],
  ['DELETE', '/api/availability-watches/some-id'],
  ['POST', '/api/availability-watches/some-id/check'],
];

const ADMIN_ONLY = [
  ['GET', '/api/admin/dashboard'],
  ['GET', '/api/admin/users'],
  ['GET', '/api/admin/bookings'],
  ['GET', '/api/admin/activity'],
  ['GET', '/api/admin/scheduler'],
  ['GET', '/api/admin/check-history'],
  ['POST', '/api/admin/trigger-check'],
  ['POST', '/api/admin/send-email'],
  ['GET', `/api/admin/users/${USER_B}`],
  ['PUT', `/api/admin/users/${USER_B}`],
  ['GET', '/api/admin/bookings/some-id'],
  ['PUT', '/api/admin/bookings/some-id'],
  ['DELETE', '/api/admin/bookings/some-id'],
  ['GET', '/api/awin/status'],
  ['GET', '/api/awin/transactions'],
  ['GET', '/api/special-fares'],
  ['POST', '/api/special-fares'],
  ['GET', '/api/special-fares-analytics'],
  ['GET', '/api/nuitee/status'],
  ['GET', '/api/nuitee/hotels'],
  ['GET', '/api/admin/nuitee'],
];

describe('unauthenticated access', () => {
  for (const [method, path] of PROTECTED) {
    test(`${method} ${path} → 401 without a token`, async () => {
      const { status } = await req(method, path);
      assert.equal(status, 401);
    });
  }

  test('every admin route also rejects an anonymous caller', async () => {
    for (const [method, path] of ADMIN_ONLY) {
      const { status } = await req(method, path);
      assert.equal(status, 401, `${method} ${path} must be 401`);
    }
  });
});

describe('invalid credentials', () => {
  test('a garbage token is rejected', async () => {
    const { status } = await req('GET', '/api/bookings', { token: 'not-a-real-token' });
    assert.equal(status, 401);
  });

  test('a well-formed but unissued token is rejected', async () => {
    const { status } = await req('GET', '/api/bookings', { token: generateToken() });
    assert.equal(status, 401);
  });

  test('the SHA-256 digest of a valid token is not itself a credential', async () => {
    const { hashToken } = await import('./tokens.js');
    const { status } = await req('GET', '/api/bookings', { token: hashToken(tokenA) });
    assert.equal(status, 401, 'a leaked digest must not be replayable');
  });

  test('a malformed Authorization header is rejected', async () => {
    for (const header of ['', 'Bearer', 'Basic abc', tokenA, `bearer ${tokenA}`]) {
      const res = await fetch(`${base}/api/bookings`, { headers: { Authorization: header } });
      assert.equal(res.status, 401, `header ${JSON.stringify(header)} must not authenticate`);
    }
  });

  test('a revoked (logged-out) session stops working immediately', async () => {
    const token = generateToken();
    await db.createSession(USER_A, token);
    clearAuthCache();
    assert.equal((await req('GET', '/api/auth/me', { token })).status, 200);

    await req('POST', '/api/auth/logout', { token });
    assert.equal((await req('GET', '/api/auth/me', { token })).status, 401,
      'the token must be dead the moment logout returns');
  });

  test('an expired session is rejected', async () => {
    const token = generateToken();
    const sess = await db.createSession(USER_A, token);
    sess.expires_at = new Date(Date.now() - 60_000).toISOString();
    clearAuthCache();
    assert.equal((await req('GET', '/api/auth/me', { token })).status, 401);
  });
});

describe('admin routes reject a valid non-admin session', () => {
  for (const [method, path] of ADMIN_ONLY) {
    test(`${method} ${path} → 403 for a normal user`, async () => {
      const { status } = await req(method, path, { token: tokenA });
      assert.equal(status, 403, `${method} ${path} leaked to a non-admin`);
    });
  }
});

describe('cross-user isolation', () => {
  test('user A cannot read user B\'s account', async () => {
    const { status } = await req('GET', `/api/users/${USER_B}`, { token: tokenA });
    assert.equal(status, 403);
  });

  test('user A cannot change user B\'s plan', async () => {
    const { status } = await req('PUT', `/api/users/${USER_B}/plan`, {
      token: tokenA,
      body: { plan: 'free' },
    });
    assert.equal(status, 403);
  });

  test('email casing does not bypass the ownership check', async () => {
    const { status } = await req('GET', `/api/users/${USER_B.toUpperCase()}`, { token: tokenA });
    assert.equal(status, 403);
  });

  test('a booking that does not belong to the caller is not readable', async () => {
    // No booking exists with this id, so 404 is the correct answer; what must
    // never happen is a 200.
    const { status } = await req('GET', '/api/bookings/not-user-as-booking', { token: tokenA });
    assert.ok([403, 404].includes(status), `expected 403/404, got ${status}`);
  });
});

describe('THE P0: plan upgrades cannot be self-granted', () => {
  test('a free user cannot PUT themselves to premium', async () => {
    const { status, body } = await req('PUT', `/api/users/${USER_A}/plan`, {
      token: tokenA,
      body: { plan: 'premium', lang: 'en', currency: 'USD' },
    });
    assert.equal(status, 402, 'the upgrade must be refused');
    assert.equal(body.code, 'UPGRADE_REQUIRES_CHECKOUT');

    const after = await req('GET', `/api/users/${USER_A}`, { token: tokenA });
    assert.notEqual(after.body.plan, 'premium', 'the plan must not have changed');
  });

  test('a free user cannot PUT themselves to viajante either', async () => {
    const { status } = await req('PUT', `/api/users/${USER_A}/plan`, {
      token: tokenA,
      body: { plan: 'viajante', lang: 'en', currency: 'USD' },
    });
    assert.equal(status, 402);
  });

  test('an unknown plan is a 400, not a silent write', async () => {
    const { status, body } = await req('PUT', `/api/users/${USER_A}/plan`, {
      token: tokenA,
      body: { plan: 'unlimited', lang: 'en' },
    });
    assert.equal(status, 400);
    assert.equal(body.code, 'INVALID_PLAN');
  });

  test('downgrading to free is still allowed', async () => {
    const { status } = await req('PUT', `/api/users/${USER_A}/plan`, {
      token: tokenA,
      body: { plan: 'free', lang: 'en', currency: 'USD' },
    });
    assert.equal(status, 200);
  });

  test('the refusal points the caller at Stripe Checkout', async () => {
    const { body } = await req('PUT', `/api/users/${USER_A}/plan`, {
      token: tokenA,
      body: { plan: 'premium', lang: 'en' },
    });
    assert.equal(body.checkoutUrl, '/api/billing/checkout');
  });
});

describe('error shape and unknown paths', () => {
  test('an unknown /api path returns JSON 404, not the SPA and not a hang', async () => {
    const res = await fetch(`${base}/api/no-such-endpoint`, { signal: AbortSignal.timeout(3000) });
    assert.equal(res.status, 404);
    assert.match(res.headers.get('content-type'), /application\/json/);
    assert.equal((await res.json()).code, 'NOT_FOUND');
  });

  test('401 responses are JSON with an error field', async () => {
    const { body } = await req('GET', '/api/bookings');
    assert.equal(typeof body.error, 'string');
  });

  test('responses carry a request id for support correlation', async () => {
    const res = await fetch(`${base}/api/bookings`);
    assert.match(res.headers.get('x-request-id') || '', /^[0-9a-f]{16}$/);
  });
});

describe('public routes stay public', () => {
  test('config, currencies and hotel search need no token', async () => {
    resetBuckets();
    for (const path of ['/api/config', '/api/currencies', '/api/hotels/search?q=lisbon']) {
      const { status } = await req('GET', path);
      assert.equal(status, 200, `${path} must remain public`);
    }
  });

  test('/api/config exposes only booleans and non-secret values', async () => {
    const { body } = await req('GET', '/api/config');
    const serialized = JSON.stringify(body);
    assert.doesNotMatch(serialized, /sk_live|sk_test|SG\.|service_role|eyJ[A-Za-z0-9_-]{20,}/,
      'no API keys or JWTs in the public config');
    assert.equal(body.affiliateId, undefined);
  });
});
