import { test, before, beforeEach, after, describe } from 'node:test';
import assert from 'node:assert/strict';

/**
 * The availability-watch API over real HTTP.
 *
 * availability.test.js pins the decisions; this pins the endpoints: the plan
 * ceiling that keeps a watch from costing a rate search every hour forever,
 * the duplicate guard, and the ownership checks. A watch holds someone's
 * travel dates, so every route is scoped to the caller.
 */

// Blank the paid-API keys before index.js loads (dotenv does not overwrite
// existing values), so a check in this file cannot reach SerpApi or Resend.
for (const key of [
  'SERPAPI_KEY', 'BOOKING_API_TOKEN', 'BOOKING_AFFILIATE_ID',
  'LITEAPI_KEY', 'NUITEE_API_KEY', 'RESEND_API_KEY',
]) {
  process.env[key] = '';
}

const { app } = await import('./index.js');
const db = await import('./db.js');
const { supabase: sql } = db;
const { generateToken } = await import('./tokens.js');
const { resetBuckets } = await import('./rateLimit.js');

// This file makes a dozen creates for the same user inside one minute, which
// is more than bookingRateLimit allows. Clearing the buckets keeps a 429 from
// masquerading as the failure the test is actually looking for.
beforeEach(() => resetBuckets());

const USER_A = 'watch-a@example.com';
const USER_B = 'watch-b@example.com';
let base;
let server;
let tokenA;
let tokenB;

const day = (n) => new Date(Date.now() + n * 8.64e7).toISOString().slice(0, 10);

before(async () => {
  await db.createUser(USER_A, 'Watcher A');
  await db.createUser(USER_B, 'Watcher B');
  tokenA = generateToken();
  tokenB = generateToken();
  await db.createSession(USER_A, tokenA);
  await db.createSession(USER_B, tokenB);

  server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server?.close();
  await sql.end({ timeout: 1 }).catch(() => {});
});

async function req(method, path, { token = tokenA, body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* not json */ }
  return { status: res.status, body: json };
}

const watchBody = (over = {}) => ({
  hotelName: 'Copacabana Palace',
  destination: 'Rio de Janeiro',
  checkinDate: day(30),
  checkoutDate: day(32),
  guests: 2,
  ...over,
});

// Free-plan fixtures allow one active watch, so each test clears the slate.
async function clearWatches(email, token) {
  const { body } = await req('GET', '/api/availability-watches', { token });
  for (const w of body?.watches || []) {
    await req('DELETE', `/api/availability-watches/${w.id}`, { token });
  }
}

describe('creating a watch', () => {
  test('a valid watch is created and comes back in the list', async () => {
    await clearWatches(USER_A, tokenA);
    const created = await req('POST', '/api/availability-watches', { body: watchBody() });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.status, 'watching');
    assert.equal(created.body.hotelName, 'Copacabana Palace');
    assert.ok(created.body.id);

    const list = await req('GET', '/api/availability-watches');
    assert.equal(list.status, 200);
    assert.ok(list.body.watches.some(w => w.id === created.body.id));
  });

  test('the required fields are enforced', async () => {
    await clearWatches(USER_A, tokenA);
    const res = await req('POST', '/api/availability-watches', { body: { destination: 'Rio' } });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'Validation failed');
    assert.equal(res.body.errors.length, 3);
  });

  test('a stay in the past is refused', async () => {
    await clearWatches(USER_A, tokenA);
    const res = await req('POST', '/api/availability-watches', {
      body: watchBody({ checkinDate: day(-5), checkoutDate: day(-3) }),
    });
    assert.equal(res.status, 400);
    assert.match(res.body.errors.join(), /past/);
  });

  test('the same hotel and dates cannot be watched twice', async () => {
    await clearWatches(USER_A, tokenA);
    const first = await req('POST', '/api/availability-watches', { body: watchBody() });
    assert.equal(first.status, 201);

    const second = await req('POST', '/api/availability-watches', { body: watchBody() });
    assert.equal(second.status, 409, 'a duplicate would double the API spend and send two identical emails');
    assert.equal(second.body.error, 'duplicate_watch');
    assert.equal(second.body.existingWatchId, first.body.id);
  });

  test('the free plan ceiling is enforced', async () => {
    await clearWatches(USER_A, tokenA);
    const first = await req('POST', '/api/availability-watches', { body: watchBody() });
    assert.equal(first.status, 201);

    const second = await req('POST', '/api/availability-watches', {
      body: watchBody({ hotelName: 'Hotel Fasano', checkinDate: day(40), checkoutDate: day(42) }),
    });
    assert.equal(second.status, 403, 'an active watch costs a rate search every 1-2h for as long as it lives');
    assert.equal(second.body.error, 'watch_limit');
    assert.equal(second.body.limit, 1);
  });

  test('cancelling frees the slot', async () => {
    await clearWatches(USER_A, tokenA);
    const first = await req('POST', '/api/availability-watches', { body: watchBody() });
    const cancelled = await req('DELETE', `/api/availability-watches/${first.body.id}`);
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.status, 'cancelled');

    const next = await req('POST', '/api/availability-watches', {
      body: watchBody({ hotelName: 'Hotel Fasano' }),
    });
    assert.equal(next.status, 201);
  });
});

describe('ownership', () => {
  test("user B cannot see user A's watches", async () => {
    await clearWatches(USER_A, tokenA);
    await clearWatches(USER_B, tokenB);
    const mine = await req('POST', '/api/availability-watches', { body: watchBody() });
    assert.equal(mine.status, 201);

    const theirList = await req('GET', '/api/availability-watches', { token: tokenB });
    assert.equal(theirList.status, 200);
    assert.deepEqual(theirList.body.watches, [], "another user's watches must not leak");
  });

  test("user B cannot cancel user A's watch", async () => {
    await clearWatches(USER_A, tokenA);
    const mine = await req('POST', '/api/availability-watches', { body: watchBody() });
    const attempt = await req('DELETE', `/api/availability-watches/${mine.body.id}`, { token: tokenB });
    assert.equal(attempt.status, 403);

    const stillThere = await req('GET', '/api/availability-watches');
    assert.equal(stillThere.body.watches.find(w => w.id === mine.body.id)?.status, 'watching');
  });

  test("user B cannot spend an API call on user A's watch", async () => {
    await clearWatches(USER_A, tokenA);
    const mine = await req('POST', '/api/availability-watches', { body: watchBody() });
    const attempt = await req('POST', `/api/availability-watches/${mine.body.id}/check`, { token: tokenB });
    assert.equal(attempt.status, 403);
  });

  test('an unknown id is a 404, not a 500', async () => {
    const res = await req('DELETE', '/api/availability-watches/does-not-exist');
    assert.equal(res.status, 404);
  });
});

describe('checking now', () => {
  test('with no rate source configured, the watch stays in watching', async () => {
    await clearWatches(USER_A, tokenA);
    const created = await req('POST', '/api/availability-watches', { body: watchBody() });
    const checked = await req('POST', `/api/availability-watches/${created.body.id}/check`);

    assert.equal(checked.status, 200, JSON.stringify(checked.body));
    assert.equal(checked.body.status, 'watching', 'no quotes came back, so nothing opened');
    assert.equal(checked.body.transition, 'still_unavailable');
    assert.equal(checked.body.checkCount, 1, 'the check is recorded even when it finds nothing');
  });

  test('a cancelled watch cannot be checked', async () => {
    await clearWatches(USER_A, tokenA);
    const created = await req('POST', '/api/availability-watches', { body: watchBody() });
    await req('DELETE', `/api/availability-watches/${created.body.id}`);

    const checked = await req('POST', `/api/availability-watches/${created.body.id}/check`);
    assert.equal(checked.status, 409, 'a cancelled watch must not be able to spend money');
    assert.equal(checked.body.error, 'watch_inactive');
  });
});
