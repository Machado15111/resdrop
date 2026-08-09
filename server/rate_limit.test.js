import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { rateLimit, resetBuckets, bucketKeys, bucketCount, startSweeper, stopSweeper } from './rateLimit.js';

/**
 * These tests run a REAL Express app, because the thing under test is how
 * Express resolves `req.ip` from X-Forwarded-For under a given `trust proxy`
 * setting. Asserting on a hand-made fake req would prove nothing about the
 * production behaviour — which is exactly how the original bug survived.
 */

const servers = [];

async function startApp({ trustProxy, max = 2 }) {
  const app = express();
  if (trustProxy !== undefined) app.set('trust proxy', trustProxy);
  app.get('/limited', rateLimit(60_000, max, req => `test:${req.ip}`), (req, res) => {
    res.json({ ok: true, ip: req.ip });
  });
  const server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}`;
}

/** One request, optionally claiming a forwarded client chain. */
function hit(base, forwardedFor) {
  return fetch(`${base}/limited`, {
    headers: forwardedFor ? { 'X-Forwarded-For': forwardedFor } : {},
  });
}

beforeEach(() => resetBuckets());

after(() => {
  stopSweeper();
  for (const s of servers) s.close();
});

// ─── The regression: without trust proxy every client shares one bucket ──────

test('REGRESSION: with trust proxy unset, distinct clients collapse into ONE bucket', async () => {
  const base = await startApp({ trustProxy: undefined, max: 2 });

  // Three different "clients" behind the proxy.
  const r1 = await hit(base, '203.0.113.10');
  const r2 = await hit(base, '203.0.113.11');
  const r3 = await hit(base, '203.0.113.12');

  assert.equal(r1.status, 200);
  assert.equal(r2.status, 200);
  // This is the bug: the third *different* client is throttled because all
  // three were counted against the proxy's own address.
  assert.equal(r3.status, 429, 'unset trust proxy shares one bucket across clients');
  assert.equal(bucketKeys().length, 1, 'exactly one shared bucket existed');
});

// ─── The fix ────────────────────────────────────────────────────────────────

test('with trust proxy=1, each forwarded client gets its own bucket', async () => {
  const base = await startApp({ trustProxy: 1, max: 2 });

  for (const ip of ['203.0.113.10', '203.0.113.11', '203.0.113.12']) {
    const res = await hit(base, ip);
    assert.equal(res.status, 200, `${ip} must not be throttled by another client`);
    const body = await res.json();
    assert.equal(body.ip, ip, 'req.ip must be the real client, not the proxy');
  }
  assert.equal(bucketKeys().length, 3, 'one bucket per client');
});

test('with trust proxy=1, a single client is still throttled at its own limit', async () => {
  const base = await startApp({ trustProxy: 1, max: 2 });
  const ip = '198.51.100.7';

  assert.equal((await hit(base, ip)).status, 200);
  assert.equal((await hit(base, ip)).status, 200);
  assert.equal((await hit(base, ip)).status, 429, 'third request exceeds max=2');
  assert.equal(bucketCount(`test:${ip}`), 3);
});

// ─── Spoofing: extra hops must not mint fresh buckets ───────────────────────

test('a spoofed extra hop cannot escape the bucket', async () => {
  const base = await startApp({ trustProxy: 1, max: 2 });
  const real = '198.51.100.20';

  // The attacker prepends fabricated addresses. With trust proxy=1 only the
  // LAST entry (the one our own proxy appended) is trusted, so every one of
  // these still lands in the same bucket.
  await hit(base, real);
  await hit(base, `10.0.0.1, ${real}`);
  const third = await hit(base, `192.0.2.9, 172.16.0.1, ${real}`);

  assert.equal(third.status, 429, 'prepended hops must not reset the counter');
  assert.equal(bucketKeys().length, 1, 'all three requests shared one bucket');
  assert.equal(bucketKeys()[0], `test:${real}`);
});

test('DANGER CASE: trust proxy=true would let a spoofed chain mint unlimited buckets', async () => {
  // Documents WHY index.js uses a hop count instead of `true`. With `true`,
  // Express walks to the left-most X-Forwarded-For entry, which the client
  // fully controls.
  const base = await startApp({ trustProxy: true, max: 2 });
  const real = '198.51.100.30';

  const a = await hit(base, `1.2.3.4, ${real}`);
  const b = await hit(base, `5.6.7.8, ${real}`);
  const c = await hit(base, `9.10.11.12, ${real}`);

  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(c.status, 200, 'each spoofed head yields a fresh bucket — why we do NOT use `true`');
  assert.ok(bucketKeys().length >= 3, 'spoofing created separate buckets');
});

// ─── Window and key behaviour ───────────────────────────────────────────────

test('keys are namespaced, so separate limiters do not share a counter', async () => {
  const app = express();
  app.set('trust proxy', 1);
  app.get('/a', rateLimit(60_000, 1, req => `a:${req.ip}`), (req, res) => res.json({ ok: 'a' }));
  app.get('/b', rateLimit(60_000, 1, req => `b:${req.ip}`), (req, res) => res.json({ ok: 'b' }));
  const server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  servers.push(server);
  const base = `http://127.0.0.1:${server.address().port}`;
  const ip = '198.51.100.40';

  assert.equal((await fetch(`${base}/a`, { headers: { 'X-Forwarded-For': ip } })).status, 200);
  assert.equal((await fetch(`${base}/b`, { headers: { 'X-Forwarded-For': ip } })).status, 200,
    'the /a request must not consume /b\'s allowance');
  assert.equal((await fetch(`${base}/a`, { headers: { 'X-Forwarded-For': ip } })).status, 429);
});

test('the window resets: a request after windowMs starts a fresh count', async () => {
  const app = express();
  app.set('trust proxy', 1);
  app.get('/w', rateLimit(30, 1, req => `w:${req.ip}`), (req, res) => res.json({ ok: true }));
  const server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  servers.push(server);
  const base = `http://127.0.0.1:${server.address().port}`;
  const h = { 'X-Forwarded-For': '198.51.100.50' };

  assert.equal((await fetch(`${base}/w`, { headers: h })).status, 200);
  assert.equal((await fetch(`${base}/w`, { headers: h })).status, 429);
  await new Promise(r => setTimeout(r, 45));
  assert.equal((await fetch(`${base}/w`, { headers: h })).status, 200, 'window expired');
});

test('startSweeper is idempotent and unrefs so it cannot hold the process open', () => {
  const a = startSweeper();
  const b = startSweeper();
  assert.equal(a, b, 'repeated calls reuse one interval');
  stopSweeper();
});
