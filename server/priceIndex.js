/**
 * Price Index (paid "Price Trends" / "Tendência de preços") quota manager.
 *
 * Guarantees, enforced server-side:
 *   - When NUITEE_PRICE_INDEX_ENABLED != 'true', NO paid call is ever made.
 *   - Free users can never trigger the endpoint.
 *   - A per-user monthly view cap (default 50).
 *   - A GLOBAL monthly hard cap on real external calls, reserved via an
 *     atomic DB op BEFORE the call — cannot be exceeded, even concurrently.
 *   - Cache hits serve without a paid call and never consume the global cap.
 *
 * Dependencies are injected so the invariants are unit-testable without a
 * live database or provider. See createPriceIndexService() and the default
 * export (wired to db.js + the Nuitée client).
 */

export const PER_USER_MONTHLY_CAP = 50;

export function monthKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function readConfig(env = process.env) {
  const envCap = parseInt(env.NUITEE_PRICE_INDEX_GLOBAL_MONTHLY_CAP ?? '50', 10);
  return {
    enabled: env.NUITEE_PRICE_INDEX_ENABLED === 'true',
    envCap: Number.isFinite(envCap) ? envCap : 50,
    costUsd: parseFloat(env.NUITEE_PRICE_INDEX_COST_USD ?? '0.05') || 0.05,
    cacheHours: parseInt(env.NUITEE_PRICE_INDEX_CACHE_HOURS ?? '24', 10) || 24,
  };
}

/** The admin may LOWER the cap but never raise it above the env limit. */
export function effectiveCap(envCap, adminCap) {
  if (adminCap == null || !Number.isFinite(adminCap)) return envCap;
  return Math.min(envCap, Math.max(0, adminCap));
}

function isPaid(user) {
  return Boolean(user && user.plan && user.plan !== 'free');
}

function cacheKeyFor({ hotelIds, checkin, checkout, currency }) {
  const ids = [...new Set(hotelIds)].map(String).sort().join(',');
  return `pi:${ids}:${checkin}:${checkout}:${(currency || 'USD').toUpperCase()}`;
}

/**
 * @param {object} deps
 * @param {object} deps.store   { getFreshCache, putCache, tryConsumeGlobal, refundGlobal, getUserViews, bumpUserViews }
 * @param {(args)=>Promise} deps.callPriceIndex  real provider call
 * @param {()=>object} [deps.config]   config provider (defaults to env)
 * @param {()=>(number|null)} [deps.adminCap]  optional admin override
 */
export function createPriceIndexService({ store, callPriceIndex, config = readConfig, adminCap = () => null }) {
  return {
    async getPriceTrends({ user, hotelIds, checkin, checkout, currency = 'USD' }) {
      const cfg = config();

      // 1) Hard feature gate — no paid call possible when disabled.
      if (!cfg.enabled) return { status: 'disabled' };

      // 2) Entitlement — free users never reach the provider.
      if (!isPaid(user)) return { status: 'locked' };

      const month = monthKey();
      const email = user.email;

      // 3) Per-user monthly allowance (covers cached + live views).
      const views = await store.getUserViews(month, email);
      if (views >= PER_USER_MONTHLY_CAP) {
        return { status: 'user_quota', used: views, cap: PER_USER_MONTHLY_CAP };
      }

      const key = cacheKeyFor({ hotelIds, checkin, checkout, currency });

      // 4) Fresh cache — serve without any paid call or global consumption.
      const cached = await store.getFreshCache(key);
      if (cached) {
        const used = await store.bumpUserViews(month, email);
        return { status: 'cached', data: cached, userViews: used };
      }

      // 5) Reserve one global slot atomically BEFORE calling (cap-safe).
      const cap = effectiveCap(cfg.envCap, adminCap());
      const globalCount = await store.tryConsumeGlobal(month, cap, cfg.costUsd);
      if (globalCount == null) {
        return { status: 'global_quota', cap };
      }

      // 6) Real external paid call.
      try {
        const data = await callPriceIndex({ hotelIds, checkin, checkout, currency });
        const expires = new Date(Date.now() + cfg.cacheHours * 3600_000).toISOString();
        await store.putCache(key, hotelIds, data, expires);
        const used = await store.bumpUserViews(month, email);
        return { status: 'ok', data, userViews: used, globalCount, cap };
      } catch (e) {
        // Give the reserved slot back on failure (best-effort, never over-caps).
        await store.refundGlobal(month, cfg.costUsd).catch(() => {});
        throw e;
      }
    },
  };
}

/* ── Default production wiring (db.js postgres + Nuitée client) ──────── */
export async function defaultService() {
  const { supabase: sql } = await import('./db.js');
  const { getPriceIndex } = await import('./liteApi.js');

  // Admin settings tighten (never loosen) the env config.
  async function settings() {
    try { const rows = await sql`SELECT * FROM nuitee_settings WHERE id = 1`; return rows[0] || {}; }
    catch { return {}; }
  }

  const store = {
    async getFreshCache(key) {
      const rows = await sql`SELECT response FROM nuitee_price_index_cache WHERE cache_key = ${key} AND expires_at > now()`;
      return rows[0]?.response ?? null;
    },
    async putCache(key, hotelIds, response, expiresAt) {
      await sql`
        INSERT INTO nuitee_price_index_cache (cache_key, hotel_ids, response, expires_at)
        VALUES (${key}, ${hotelIds}, ${sql.json(response)}, ${expiresAt})
        ON CONFLICT (cache_key) DO UPDATE SET response = EXCLUDED.response, expires_at = EXCLUDED.expires_at, created_at = now()
      `;
    },
    async tryConsumeGlobal(month, cap, cost) {
      const rows = await sql`SELECT nuitee_pi_try_consume(${month}, ${cap}, ${cost}) AS c`;
      return rows[0]?.c ?? null;
    },
    async refundGlobal(month, cost) {
      await sql`UPDATE nuitee_price_index_usage SET external_calls = GREATEST(0, external_calls - 1), estimated_cost_usd = GREATEST(0, estimated_cost_usd - ${cost}) WHERE calendar_month = ${month}`;
    },
    async getUserViews(month, email) {
      const rows = await sql`SELECT views FROM nuitee_price_index_user_usage WHERE calendar_month = ${month} AND user_email = ${email}`;
      return rows[0]?.views ?? 0;
    },
    async bumpUserViews(month, email) {
      const rows = await sql`SELECT nuitee_pi_user_bump(${month}, ${email}) AS v`;
      return rows[0]?.v ?? 0;
    },
  };

  // Per-request wrapper: fold admin settings into config + cap, then delegate.
  return {
    async getPriceTrends(args) {
      const s = await settings();
      const config = () => {
        const base = readConfig();
        // Admin may only DISABLE on top of the env gate, never enable beyond it.
        return { ...base, enabled: base.enabled && s.price_index_enabled !== false };
      };
      const adminCap = () => (s.price_index_cap == null ? null : Number(s.price_index_cap));
      const svc = createPriceIndexService({ store, callPriceIndex: getPriceIndex, config, adminCap });
      return svc.getPriceTrends(args);
    },
    _store: store,
    settings,
  };
}
