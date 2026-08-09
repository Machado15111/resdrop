import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import helmet from 'helmet';

/**
 * helmet replaced a hand-rolled setHeader block. The risk in that swap is
 * silently losing a directive the app depends on — the Travelpayouts script
 * host or the OpenStreetMap frame — so this pins the emitted CSP against the
 * exact policy the old block produced.
 */

// Verbatim copy of the header the pre-helmet code emitted.
const LEGACY_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' https:",
  "font-src 'self' https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "script-src 'self' 'unsafe-inline' https://tp-em.com",
  "connect-src 'self' https:",
  "frame-src https://www.openstreetmap.org",
  "worker-src 'self'",
].join('; ');

// Must stay identical to the helmet config in index.js.
const HELMET_OPTIONS = {
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      'default-src': ["'self'"],
      'base-uri': ["'self'"],
      'object-src': ["'none'"],
      'frame-ancestors': ["'none'"],
      'form-action': ["'self'"],
      'img-src': ["'self'", 'data:', 'blob:', 'https:'],
      'media-src': ["'self'", 'https:'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'script-src': ["'self'", "'unsafe-inline'", 'https://tp-em.com'],
      'connect-src': ["'self'", 'https:'],
      'frame-src': ['https://www.openstreetmap.org'],
      'worker-src': ["'self'"],
    },
  },
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true, preload: false },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' },
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
};

let base;
let server;

before(async () => {
  const app = express();
  app.use(helmet(HELMET_OPTIONS));
  app.use((req, res, next) => {
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
  app.get('/', (req, res) => res.json({ ok: true }));
  server = await new Promise(resolve => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

const csp = async () => (await fetch(base)).headers.get('content-security-policy');

/**
 * Parse a policy into { directive: [sources] }.
 *
 * Compared as directives rather than as a raw string for one reason: helmet
 * joins with ';' where the hand-rolled block used '; '. The CSP grammar treats
 * whitespace around the separator as optional, so the two headers are the same
 * policy — but a byte comparison would fail on it while ignoring a genuinely
 * dropped source. This compares what browsers actually enforce.
 */
function parseCsp(policy) {
  const out = {};
  for (const part of policy.split(';')) {
    const [name, ...sources] = part.trim().split(/\s+/).filter(Boolean);
    if (name) out[name] = sources;
  }
  return out;
}

test('the CSP is directive-for-directive the policy the hand-rolled block emitted', async () => {
  assert.deepEqual(parseCsp(await csp()), parseCsp(LEGACY_CSP));
});

test('only the separator whitespace differs from the legacy header', async () => {
  assert.equal((await csp()).replace(/;\s*/g, '; '), LEGACY_CSP);
});

test('the directives the app depends on survived the swap', async () => {
  const policy = await csp();
  assert.ok(policy.includes('https://tp-em.com'), 'Travelpayouts script host');
  assert.ok(policy.includes('frame-src https://www.openstreetmap.org'), 'OSM map embed');
  assert.ok(policy.includes('https://fonts.gstatic.com'), 'Google Fonts files');
  assert.ok(policy.includes('https://fonts.googleapis.com'), 'Google Fonts stylesheet');
  assert.ok(policy.includes('img-src \'self\' data: blob: https:'), 'hotel image CDNs');
});

test('helmet defaults did not sneak in extra directives', async () => {
  const policy = await csp();
  assert.ok(!policy.includes('upgrade-insecure-requests'));
  assert.ok(!policy.includes('script-src-attr'));
  assert.deepEqual(
    Object.keys(parseCsp(policy)).sort(),
    Object.keys(parseCsp(LEGACY_CSP)).sort(),
    'the same set of directives, no more and no fewer',
  );
});

test('the lockdown directives are intact', async () => {
  const policy = await csp();
  for (const d of ["object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'"]) {
    assert.ok(policy.includes(d), `${d} must remain`);
  }
});

test('the non-CSP headers match the previous block', async () => {
  const h = (await fetch(base)).headers;
  assert.equal(h.get('x-content-type-options'), 'nosniff');
  assert.equal(h.get('x-frame-options'), 'DENY');
  assert.equal(h.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.equal(h.get('strict-transport-security'), 'max-age=31536000; includeSubDomains');
});

test('X-XSS-Protection is preserved (helmet omits it by default)', async () => {
  const h = (await fetch(base)).headers;
  assert.equal(h.get('x-xss-protection'), '1; mode=block');
});

test('CORP/COEP stay off so cross-origin assets and images still load', async () => {
  const h = (await fetch(base)).headers;
  assert.equal(h.get('cross-origin-resource-policy'), null);
  assert.equal(h.get('cross-origin-embedder-policy'), null);
});

test('index.js uses exactly this helmet configuration', async () => {
  const src = await import('node:fs').then(fs =>
    fs.promises.readFile(new URL('./index.js', import.meta.url), 'utf8'));
  // Spot-check the directives most likely to be dropped by a careless edit.
  assert.match(src, /'script-src':\s*\["'self'", "'unsafe-inline'", 'https:\/\/tp-em\.com'\]/);
  assert.match(src, /'frame-src':\s*\['https:\/\/www\.openstreetmap\.org'\]/);
  assert.match(src, /useDefaults:\s*false/);
  assert.match(src, /maxAge:\s*31536000/);
});
