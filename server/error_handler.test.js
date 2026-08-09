import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { requestId, apiNotFound, errorHandler, ApiError } from './errorHandler.js';

/**
 * Builds an app wired exactly like index.js: requestId first, routes, the /api
 * JSON 404, then the terminal error handler last.
 */
const servers = [];
let base;
let originalEnv;
const logs = { error: [], warn: [] };

before(async () => {
  originalEnv = process.env.NODE_ENV;

  // Silence + capture the handler's own logging so test output stays readable
  // and we can assert the stack is logged server-side.
  console.error = (...args) => logs.error.push(args.join(' '));
  console.warn = (...args) => logs.warn.push(args.join(' '));

  const app = express();
  app.use(requestId);
  app.use(express.json());

  app.get('/api/throws-async', async () => {
    throw new Error('connect ECONNREFUSED 10.0.0.5:5432');
  });
  app.get('/api/throws-sync', () => {
    throw new Error('relation "users" does not exist at character 15');
  });
  app.get('/api/rejects', (req, res, next) => {
    Promise.reject(new Error('supabase: column bookings.password_hash')).catch(next);
  });
  app.get('/api/api-error', () => {
    throw new ApiError(422, 'checkinDate must be before checkoutDate', 'INVALID_DATES');
  });
  app.get('/api/client-fault', () => {
    const e = new Error('Missing hotelId');
    e.status = 400;
    throw e;
  });
  app.get('/api/ok', (req, res) => res.json({ ok: true }));
  app.get('/api/after-headers', (req, res) => {
    res.status(200).write('partial');
    throw new Error('failed mid-stream');
  });

  app.use('/api', apiNotFound);
  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.type('html').send('<!doctype html><title>spa</title>');
  });
  app.use(errorHandler);

  const server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  servers.push(server);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  process.env.NODE_ENV = originalEnv;
  for (const s of servers) s.close();
});

const HEX32 = /^[0-9a-f]{16}$/;

// ─── Thrown errors become JSON, never HTML, never a stack ───────────────────

for (const route of ['/api/throws-async', '/api/throws-sync', '/api/rejects']) {
  test(`${route}: returns JSON 500 with no stack and no driver detail`, async () => {
    const res = await fetch(`${base}${route}`);
    assert.equal(res.status, 500);
    assert.match(res.headers.get('content-type'), /application\/json/);

    const raw = await res.text();
    assert.doesNotMatch(raw, /at .*errorHandler|node:internal|\.js:\d+:\d+/, 'no stack frames');
    assert.doesNotMatch(raw, /ECONNREFUSED|relation "users"|password_hash|supabase/i,
      'no driver/DB internals');

    const body = JSON.parse(raw);
    assert.equal(body.error, 'Internal server error');
    assert.match(body.requestId, HEX32);
  });
}

test('the stack IS logged server-side, with the request id and route', async () => {
  logs.error.length = 0;
  const res = await fetch(`${base}/api/throws-async`);
  const { requestId: id } = await res.json();

  const line = logs.error.find(l => l.includes(id));
  assert.ok(line, 'the failure was logged under its request id');
  assert.ok(line.includes('GET /api/throws-async'), 'log names the route');
  assert.ok(line.includes('ECONNREFUSED'), 'the real cause is kept in the logs');
});

test('NODE_ENV=development still leaks nothing (the Express default would)', async () => {
  process.env.NODE_ENV = 'development';
  const res = await fetch(`${base}/api/throws-sync`);
  const raw = await res.text();
  assert.equal(res.status, 500);
  assert.doesNotMatch(raw, /relation "users"/);
  assert.equal(JSON.parse(raw).error, 'Internal server error');
  process.env.NODE_ENV = 'production';
});

test('NODE_ENV=production behaves identically', async () => {
  process.env.NODE_ENV = 'production';
  const res = await fetch(`${base}/api/throws-sync`);
  const body = await res.json();
  assert.equal(res.status, 500);
  assert.equal(body.error, 'Internal server error');
  assert.match(body.requestId, HEX32);
});

// ─── Deliberate errors keep their message ───────────────────────────────────

test('ApiError is shown to the caller, with its code', async () => {
  const res = await fetch(`${base}/api/api-error`);
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.error, 'checkinDate must be before checkoutDate');
  assert.equal(body.code, 'INVALID_DATES');
  assert.match(body.requestId, HEX32);
});

test('a 4xx client fault keeps its message (it describes the caller, not us)', async () => {
  const res = await fetch(`${base}/api/client-fault`);
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, 'Missing hotelId');
});

// ─── The hang: unknown /api paths ───────────────────────────────────────────

test('REGRESSION: an unknown /api path returns JSON 404 instead of hanging', async () => {
  // Previously the SPA fallback matched this, wrote no response and never
  // called next(), so the request stayed open until the client gave up.
  const res = await fetch(`${base}/api/does-not-exist`, {
    signal: AbortSignal.timeout(3000),
  });
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type'), /application\/json/);
  const body = await res.json();
  assert.equal(body.code, 'NOT_FOUND');
  assert.equal(body.path, '/api/does-not-exist');
});

test('an unknown /api path with a query string does not echo the query back', async () => {
  const res = await fetch(`${base}/api/nope?token=secret-value`);
  const body = await res.json();
  assert.equal(body.path, '/api/nope');
  assert.doesNotMatch(JSON.stringify(body), /secret-value/, 'query is stripped from the echo');
});

test('a non-API path still falls through to the SPA', async () => {
  const res = await fetch(`${base}/dashboard`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /<title>spa<\/title>/);
});

// ─── Misc ───────────────────────────────────────────────────────────────────

test('every response carries an X-Request-Id header', async () => {
  const res = await fetch(`${base}/api/ok`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('x-request-id'), HEX32);
});

test('request ids are unique per request', async () => {
  const ids = new Set();
  for (let i = 0; i < 5; i++) {
    const res = await fetch(`${base}/api/ok`);
    ids.add(res.headers.get('x-request-id'));
  }
  assert.equal(ids.size, 5);
});

test('a failure after headers are sent does not corrupt the response body', async () => {
  const res = await fetch(`${base}/api/after-headers`).catch(() => null);
  // Express closes the connection; what matters is that we did not append a
  // JSON error body onto an already-started response.
  if (res) {
    const raw = await res.text().catch(() => '');
    assert.doesNotMatch(raw, /"error"\s*:/, 'no JSON error appended to a started body');
  }
});

test('a successful route is untouched by the handler', async () => {
  const res = await fetch(`${base}/api/ok`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
});
