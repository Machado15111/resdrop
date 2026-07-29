// Security regression tests: the inbound-email webhooks must FAIL CLOSED.
// Without a configured secret they must refuse (503), and a wrong secret must be
// rejected (401) — otherwise anyone could inject bookings into any account by
// spoofing the From address.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import inboundEmailRoutes from './routes/inbound-email.js';

function makeServer() {
  const app = express();
  app.use(express.json());
  const noopAuth = (req, res, next) => next();
  app.use('/api', inboundEmailRoutes(noopAuth, {}));
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => resolve({ server, base: `http://127.0.0.1:${server.address().port}/api` }));
  });
}

async function withSecret(value, fn) {
  const prev = process.env.INBOUND_WEBHOOK_SECRET;
  if (value === undefined) delete process.env.INBOUND_WEBHOOK_SECRET;
  else process.env.INBOUND_WEBHOOK_SECRET = value;
  try { await fn(); }
  finally {
    if (prev === undefined) delete process.env.INBOUND_WEBHOOK_SECRET;
    else process.env.INBOUND_WEBHOOK_SECRET = prev;
  }
}

test('POST /inbound/webhook fails closed when no secret is configured (503)', async () => {
  await withSecret(undefined, async () => {
    const { server, base } = await makeServer();
    try {
      const res = await fetch(`${base}/inbound/webhook`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ from: 'attacker@evil.com', subject: 'x', text: 'y' }),
      });
      assert.equal(res.status, 503);
    } finally { server.close(); }
  });
});

test('POST /inbound/webhook rejects a wrong secret (401)', async () => {
  await withSecret('correct-secret', async () => {
    const { server, base } = await makeServer();
    try {
      const res = await fetch(`${base}/inbound/webhook`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-inbound-secret': 'wrong-secret' },
        body: JSON.stringify({ from: 'attacker@evil.com' }),
      });
      assert.equal(res.status, 401);
    } finally { server.close(); }
  });
});

test('POST /inbound/cloudflare-email fails closed when no secret is configured (503)', async () => {
  await withSecret(undefined, async () => {
    const { server, base } = await makeServer();
    try {
      const res = await fetch(`${base}/inbound/cloudflare-email`, {
        method: 'POST',
        headers: { 'content-type': 'application/octet-stream' },
        body: 'From: attacker@evil.com\nSubject: x\n\nhi',
      });
      assert.equal(res.status, 503);
    } finally { server.close(); }
  });
});
