/**
 * Nuitée (LiteAPI) client — centralized, hardened, server-side only.
 *
 * - Env separation: NUITEE_ENV picks the sandbox/production key.
 * - Timeout + controlled retry (exponential backoff) for 429 / transient 5xx.
 * - Mutating calls (book) are NEVER retried.
 * - Basic circuit breaker after repeated failures.
 * - Sanitized logging: the API key is never printed.
 *
 * The key is sent as the `X-API-Key` header and must stay on the server.
 * Docs: https://docs.liteapi.travel/  ·  flow: rates → prebook → book
 */

const DATA_BASE = 'https://api.liteapi.travel/v3.0';   // data + search + price index
const BOOK_BASE = 'https://book.liteapi.travel/v3.0';  // prebook + book

const TIMEOUT_MS = 15000;
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 400;

// ── Circuit breaker (per process) ──────────────────────────────
const breaker = { failures: 0, openUntil: 0 };
const BREAKER_THRESHOLD = 5;
const BREAKER_COOLDOWN_MS = 60_000;

function env(k, d = '') { return process.env[k] || d; }

/** Resolve the active key from the environment, sandbox vs production. */
function key() {
  const mode = env('NUITEE_ENV', 'sandbox').toLowerCase();
  const k = mode === 'production'
    ? env('NUITEE_API_KEY_PRODUCTION')
    : env('NUITEE_API_KEY_SANDBOX');
  const resolved = k || env('LITEAPI_KEY'); // legacy fallback
  if (!resolved) throw new Error('[Nuitée] Missing API key (NUITEE_API_KEY_* / LITEAPI_KEY)');
  return resolved;
}

export function nuiteeEnv() { return env('NUITEE_ENV', 'sandbox').toLowerCase(); }
export function nuiteeConfigured() {
  return Boolean(env('NUITEE_API_KEY_SANDBOX') || env('NUITEE_API_KEY_PRODUCTION') || env('LITEAPI_KEY'));
}
// Back-compat alias used by scripts/sync-hotels.js
export const liteApiConfigured = nuiteeConfigured;

function sanitize(msg) {
  return String(msg || '').replace(/(sand|prod)_[A-Za-z0-9]+/g, '$1_***');
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Core request with timeout, retry/backoff and circuit breaking.
 * @param {{retryable?:boolean}} opts  mutating calls pass retryable:false
 */
async function request(url, { method = 'GET', body, retryable = true } = {}) {
  if (Date.now() < breaker.openUntil) {
    throw new Error('[Nuitée] circuit open — provider temporarily unavailable');
  }

  const maxAttempts = retryable ? MAX_RETRIES : 1;
  let lastErr;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method,
        signal: ctrl.signal,
        headers: {
          'X-API-Key': key(),
          'Accept': 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      clearTimeout(timer);

      // Retry on 429 / transient 5xx (only when retryable)
      if ((res.status === 429 || (res.status >= 500 && res.status < 600)) && retryable && attempt < maxAttempts) {
        const retryAfter = Number(res.headers.get('retry-after')) * 1000;
        await sleep(retryAfter || BACKOFF_BASE_MS * 2 ** (attempt - 1));
        continue;
      }

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        breaker.failures++;
        if (breaker.failures >= BREAKER_THRESHOLD) breaker.openUntil = Date.now() + BREAKER_COOLDOWN_MS;
        const msg = json?.error?.message || json?.message || res.statusText;
        const err = new Error(`[Nuitée] ${res.status} ${method} ${sanitize(url)} — ${sanitize(msg)}`);
        err.status = res.status;
        throw err;
      }

      breaker.failures = 0; // success resets the breaker
      return json;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      const transient = e.name === 'AbortError' || e.code === 'ECONNRESET' || /circuit open/.test(e.message);
      if (retryable && transient && attempt < maxAttempts && !/circuit open/.test(e.message)) {
        await sleep(BACKOFF_BASE_MS * 2 ** (attempt - 1));
        continue;
      }
      if (e.name === 'AbortError') { e.message = `[Nuitée] request timeout after ${TIMEOUT_MS}ms`; }
      breaker.failures++;
      if (breaker.failures >= BREAKER_THRESHOLD) breaker.openUntil = Date.now() + BREAKER_COOLDOWN_MS;
      throw e;
    }
  }
  throw lastErr;
}

/* ── Static hotel data (free) ─────────────────────────────────── */
export async function getHotelDetails(hotelIdInput) {
  const resolvedId = typeof hotelIdInput === 'object' && hotelIdInput !== null
    ? (hotelIdInput.hotelId || hotelIdInput.id || hotelIdInput.liteapi_id)
    : hotelIdInput;
  if (!resolvedId) throw new Error('[Nuitée] hotelId parameter is required');
  const q = new URLSearchParams({ hotelId: String(resolvedId).trim() });
  const json = await request(`${DATA_BASE}/data/hotel?${q}`);
  return json?.data || json;
}

export async function getCities(countryCode) {
  const q = countryCode ? `?countryCode=${encodeURIComponent(countryCode)}` : '';
  const json = await request(`${DATA_BASE}/data/cities${q}`);
  return json?.data || json?.cities || [];
}

export async function getCountries() {
  const json = await request(`${DATA_BASE}/data/countries`);
  return json?.data || json?.countries || [];
}

export async function getHotels({ countryCode, cityName, limit = 200, offset = 0 } = {}) {
  const q = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (countryCode) q.set('countryCode', countryCode);
  if (cityName) q.set('cityName', cityName);
  const json = await request(`${DATA_BASE}/data/hotels?${q}`);
  const rows = json?.data || json?.hotels || [];
  return rows.map(h => ({
    id: h.id || h.hotelId,
    name: h.name,
    countryCode: (h.country || h.countryCode || countryCode || '').toUpperCase() || null,
    city: h.city || null,
    stars: h.stars || h.rating || null,
    lat: h.latitude ?? null,
    lng: h.longitude ?? null,
  })).filter(h => h.id);
}

/* ── Live rates (free — the monitoring source) ─────────────────── */
export async function searchRates({
  hotelIds, checkin, checkout,
  occupancies = [{ adults: 2 }], guestNationality = 'US',
  currency = 'USD', maxRatesPerHotel = 5,
}) {
  return request(`${DATA_BASE}/hotels/rates?rm=true`, {
    method: 'POST',
    body: { hotelIds, occupancies, guestNationality, currency, checkin, checkout, roomMapping: true, maxRatesPerHotel },
  });
}

/* ── Price Index (PAID — low level; quota logic lives in priceIndex.js) ── */
export async function getPriceIndex({ hotelIds, checkin, checkout, currency = 'USD' }) {
  return request(`${DATA_BASE}/prices/hotels`, {
    method: 'POST',
    body: { hotelIds: hotelIds.slice(0, 50), checkin, checkout, currency },
  });
}

/* ── Prebook (safe to retry — it only quotes/locks) ────────────── */
export async function prebook(offerId, usePaymentSdk = false) {
  return request(`${BOOK_BASE}/rates/prebook`, { method: 'POST', body: { usePaymentSdk, offerId } });
}

/* ── Book (MUTATING — never retried) ───────────────────────────── */
export async function book({ holder, guests, payment, prebookId }) {
  return request(`${BOOK_BASE}/rates/book`, {
    method: 'POST',
    retryable: false,
    body: { holder, guests, payment, prebookId },
  });
}

export function circuitState() {
  return { open: Date.now() < breaker.openUntil, failures: breaker.failures };
}
