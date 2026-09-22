import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Do the extracted routers actually RUN?
 *
 * routes_authz.test.js proves the middleware chain on each route, and
 * route_order.test.js proves the registration order. Neither one executes a
 * handler body, which is how the route extraction shipped three dangling
 * references inside routes/bookings.js:
 *
 *   - `API_MODE` stayed behind in index.js module scope, so POST /api/bookings,
 *     the bulk import, POST /api/bookings/from-email and GET /api/stats all
 *     threw `ReferenceError: API_MODE is not defined` on every request.
 *   - two `await import('./extractors/index.js')` / `('./importResult.js')`
 *     calls kept their pre-split paths, so POST /api/parse-email threw
 *     ERR_MODULE_NOT_FOUND before doing anything.
 *
 * Both classes are cheap to guard: resolve every relative import in the tree,
 * and speak HTTP to the handlers that had no coverage at all.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));

// dotenv (in db.js) does not overwrite keys that already exist, so blanking the
// price-engine and email keys here is what keeps this file off the live SerpApi
// quota and out of Resend when a developer runs it with a real server/.env.
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

// ─── 1. Every relative import in server/ resolves ────────────

const STATIC_IMPORT = /^\s*(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]/gm;
const BARE_IMPORT = /^\s*import\s+['"]([^'"]+)['"]/gm;
const DYNAMIC_IMPORT = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

function jsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...jsFiles(full));
    else if (/\.(js|mjs)$/.test(entry)) out.push(full);
  }
  return out;
}

test('every relative import under server/ points at a file that exists', () => {
  const broken = [];
  for (const file of jsFiles(__dirname)) {
    const source = readFileSync(file, 'utf8');
    for (const pattern of [STATIC_IMPORT, BARE_IMPORT, DYNAMIC_IMPORT]) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(source)) !== null) {
        const spec = match[1];
        if (!spec.startsWith('.')) continue; // package, not a path
        const target = normalize(join(dirname(file), spec));
        if (!existsSync(target)) {
          const line = source.slice(0, match.index).split('\n').length;
          broken.push(`${file.replace(__dirname, 'server')}:${line} → '${spec}'`);
        }
      }
    }
  }
  assert.deepEqual(broken, [], `unresolvable relative imports:\n  ${broken.join('\n  ')}`);
});

// ─── 2. The handlers that had no HTTP coverage ───────────────

const EMAIL = 'runtime-routes@example.com';
let base;
let server;
let token;

before(async () => {
  await db.createUser(EMAIL, 'Runtime Routes');
  token = generateToken();
  await db.createSession(EMAIL, token);

  server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server?.close();
  await sql.end({ timeout: 1 }).catch(() => {});
});

async function req(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* not json */ }
  return { status: res.status, body: json };
}

const RAW_EMAIL = [
  'Sua reserva no Copacabana Palace esta confirmada',
  'Hotel Name: Copacabana Palace',
  'Destino: Rio de Janeiro, Brazil',
  'Check-in: 10/01/2027',
  'Check-out: 12/01/2027',
  'Total: R$ 2.400,00',
  'Hospede: Antonio Machado',
  'Confirmacao: ABC123',
  'Quarto: Deluxe Double Room',
].join('\n');

test('POST /api/bookings creates a booking instead of 500ing', async () => {
  const res = await req('POST', '/api/bookings', {
    hotelName: 'Hotel Fasano',
    destination: 'Sao Paulo',
    checkinDate: '2027-03-10',
    checkoutDate: '2027-03-12',
    originalPrice: 3200,
    confirmationNumber: 'XYZ9',
    roomType: 'Deluxe',
    guestName: 'Antonio Machado',
  });
  assert.equal(res.status, 201, `expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.ok(res.body?.id, 'the created booking must come back with an id');
});

test('POST /api/parse-email runs the extractor instead of 500ing', async () => {
  const res = await req('POST', '/api/parse-email', { emailContent: RAW_EMAIL });
  assert.equal(res.status, 200, `expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
});

test('POST /api/bookings/from-email imports the booking instead of 500ing', async () => {
  const res = await req('POST', '/api/bookings/from-email', { rawEmail: RAW_EMAIL });
  assert.equal(res.status, 201, `expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
});

test('GET /api/stats answers instead of 500ing', async () => {
  const res = await req('GET', '/api/stats');
  assert.equal(res.status, 200, `expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
});
