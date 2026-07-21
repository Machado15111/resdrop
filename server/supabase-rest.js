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

export const isConfigured = !!(SUPABASE_URL && SUPABASE_KEY);

if (!isConfigured) {
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
