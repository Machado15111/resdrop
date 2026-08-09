/**
 * Supabase REST API client for server-side operations.
 * Used as the primary persistence layer when DATABASE_URL is not configured.
 * This allows Vercel/serverless environments to use Supabase without a direct PG connection string.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

/**
 * SAFETY: the test suite must never reach the live project.
 *
 * server/.env holds the production SUPABASE_URL and SERVICE_KEY, and dotenv
 * loads it on import — so under `node --test` this client was fully configured
 * and pointed at production. Nothing was written only because the FK on
 * sessions.user_email rejected fixture rows; a test calling updateUser or
 * deleteUserSessions with a real address would have mutated live data and
 * signed that user out.
 *
 * Tests therefore run with REST disabled, which routes db.js down its in-memory
 * path — what the existing suite already assumes. Set ALLOW_TEST_DB_WRITES=true
 * to opt a run back in (for a disposable project, never production).
 */
const UNDER_TEST = process.env.NODE_ENV === 'test' || /\.test\.js$/.test(process.argv[1] || '');
const TEST_DB_OPT_IN = process.env.ALLOW_TEST_DB_WRITES === 'true';

export const isConfigured = !!(SUPABASE_URL && SUPABASE_KEY) && (!UNDER_TEST || TEST_DB_OPT_IN);

if (UNDER_TEST && SUPABASE_URL && !TEST_DB_OPT_IN) {
  console.warn('[Supabase REST] Disabled under test — using in-memory storage. Set ALLOW_TEST_DB_WRITES=true to override.');
} else if (!isConfigured) {
  console.warn('[Supabase REST] Not configured — SUPABASE_URL or SUPABASE_SERVICE_KEY missing');
}

function baseHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };
}

/**
 * GET rows from a table.
 * @param {string} table
 * @param {Object} filters - key-value pairs to filter on (equality). Supports 'eq', 'is', 'lt', 'gt'
 * @param {Object} options - { order, limit, select }
 */
export async function select(table, filters = {}, options = {}) {
  if (!isConfigured) return [];
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    for (const [k, v] of Object.entries(filters)) {
      if (v === null || v === undefined) {
        url.searchParams.set(k, 'is.null');
      } else if (typeof v === 'object' && v.op) {
        url.searchParams.set(k, `${v.op}.${v.value}`);
      } else {
        url.searchParams.set(k, `eq.${v}`);
      }
    }
    if (options.order) url.searchParams.set('order', options.order);
    if (options.limit) url.searchParams.set('limit', String(options.limit));
    if (options.select) url.searchParams.set('select', options.select);

    const res = await fetch(url.toString(), { headers: baseHeaders() });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[Supabase REST] SELECT ${table} failed:`, err.substring(0, 200));
      return [];
    }
    return await res.json();
  } catch (e) {
    console.error(`[Supabase REST] SELECT ${table} error:`, e.message);
    return [];
  }
}

/**
 * COUNT rows without transferring them.
 * Uses PostgREST's `Prefer: count=exact` + a HEAD request, so the server returns
 * the total in the Content-Range header and zero row data. Counting by selecting
 * every row (the previous approach) cost a full table transfer per call.
 */
export async function count(table, filters = {}) {
  if (!isConfigured) return 0;
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    for (const [k, v] of Object.entries(filters)) {
      if (v === null || v === undefined) url.searchParams.set(k, 'is.null');
      else url.searchParams.set(k, `eq.${v}`);
    }
    url.searchParams.set('select', 'id');
    const res = await fetch(url.toString(), {
      method: 'HEAD',
      headers: { ...baseHeaders(), Prefer: 'count=exact', Range: '0-0' },
    });
    if (!res.ok) return 0;
    // Content-Range looks like "0-0/1234" (or "*/1234" when empty).
    const total = (res.headers.get('content-range') || '').split('/')[1];
    return Number.parseInt(total, 10) || 0;
  } catch (e) {
    console.error(`[Supabase REST] COUNT ${table} error:`, e.message);
    return 0;
  }
}

/**
 * INSERT a row into a table.
 */
export async function insert(table, row) {
  if (!isConfigured) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...baseHeaders(), Prefer: 'return=representation' },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[Supabase REST] INSERT ${table} failed:`, err.substring(0, 300));
      return null;
    }
    const data = await res.json();
    return Array.isArray(data) ? data[0] : data;
  } catch (e) {
    console.error(`[Supabase REST] INSERT ${table} error:`, e.message);
    return null;
  }
}

/**
 * UPDATE rows matching filters.
 */
export async function update(table, filters = {}, updates = {}) {
  if (!isConfigured) return null;
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    for (const [k, v] of Object.entries(filters)) {
      if (v === null || v === undefined) {
        url.searchParams.set(k, 'is.null');
      } else {
        url.searchParams.set(k, `eq.${v}`);
      }
    }
    const res = await fetch(url.toString(), {
      method: 'PATCH',
      headers: { ...baseHeaders(), Prefer: 'return=representation' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[Supabase REST] UPDATE ${table} failed:`, err.substring(0, 300));
      return null;
    }
    const data = await res.json();
    return Array.isArray(data) ? data[0] : data;
  } catch (e) {
    console.error(`[Supabase REST] UPDATE ${table} error:`, e.message);
    return null;
  }
}

/**
 * DELETE rows matching filters.
 */
export async function remove(table, filters = {}) {
  if (!isConfigured) return false;
  try {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    for (const [k, v] of Object.entries(filters)) {
      url.searchParams.set(k, `eq.${v}`);
    }
    const res = await fetch(url.toString(), {
      method: 'DELETE',
      headers: baseHeaders(),
    });
    return res.ok;
  } catch (e) {
    console.error(`[Supabase REST] DELETE ${table} error:`, e.message);
    return false;
  }
}
