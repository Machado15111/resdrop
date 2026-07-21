/**
 * LiteAPI (Nuitée) client — hotel rate data + prebook/book
 *
 * Powers the monitoring engine: pulls live rates so ResDrop can detect a
 * genuine drop, and can rebook (with commission) through prebook/book.
 *
 * Auth: every request sends the API key in the `X-API-Key` header.
 * Keys: sandbox keys start with `sand_`, production keys with `prod_`.
 * Set LITEAPI_KEY in the environment (Railway var + local server/.env).
 *
 * Docs: https://docs.liteapi.travel/  ·  flow: search → prebook → book
 */

const DATA_BASE = 'https://api.liteapi.travel/v3.0';   // search + static data
const BOOK_BASE = 'https://book.liteapi.travel/v3.0';  // prebook + book

function key() {
  const k = process.env.LITEAPI_KEY;
  if (!k) throw new Error('[LiteAPI] Missing LITEAPI_KEY environment variable');
  return k;
}

async function call(url, { method = 'GET', body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      'X-API-Key': key(),
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || json?.message || res.statusText;
    throw new Error(`[LiteAPI] ${res.status} ${method} ${url} — ${msg}`);
  }
  return json;
}

export function liteApiConfigured() {
  return Boolean(process.env.LITEAPI_KEY);
}

/**
 * Static hotel catalog by country. Returns real LiteAPI hotel ids used by
 * searchRates. Page through with limit/offset.
 * @returns {Promise<Array<{id,name,countryCode,city,stars,lat,lng}>>}
 */
export async function getHotels({ countryCode, cityName, limit = 200, offset = 0 } = {}) {
  const q = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (countryCode) q.set('countryCode', countryCode);
  if (cityName) q.set('cityName', cityName);
  const json = await call(`${DATA_BASE}/data/hotels?${q}`);
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

/**
 * Live rates for one or more hotels — the monitoring read.
 * Mirrors the sandbox: POST /hotels/rates?rm=true
 */
export async function searchRates({
  hotelIds,
  checkin,
  checkout,
  occupancies = [{ adults: 2 }],
  guestNationality = 'US',
  currency = 'USD',
  maxRatesPerHotel = 5,
}) {
  return call(`${DATA_BASE}/hotels/rates?rm=true`, {
    method: 'POST',
    body: { hotelIds, occupancies, guestNationality, currency, checkin, checkout, roomMapping: true, maxRatesPerHotel },
  });
}

/** Lock a rate before booking. Returns a prebookId. */
export async function prebook(offerId, usePaymentSdk = false) {
  return call(`${BOOK_BASE}/rates/prebook`, { method: 'POST', body: { usePaymentSdk, offerId } });
}

/** Confirm the booking (rebooking flow). */
export async function book({ holder, guests, payment, prebookId }) {
  return call(`${BOOK_BASE}/rates/book`, { method: 'POST', body: { holder, guests, payment, prebookId } });
}
