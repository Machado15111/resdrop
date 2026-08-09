/**
 * Fixed-window rate limiting.
 *
 * SCOPE / KNOWN LIMITATION
 * ------------------------
 * State lives in a per-process Map. That is correct for the current deployment
 * (a single Railway instance), but if the service is ever scaled horizontally
 * each instance keeps its own counters, so the effective limit becomes
 * `max * instanceCount` and a client can dodge a ban by landing on a different
 * instance.
 *
 * TODO(scale): when a second instance is added, move the counters to Postgres
 * (a small `rate_limits(key text primary key, count int, window_start
 * timestamptz)` table upserted with `ON CONFLICT`) or Redis. Postgres is the
 * cheaper option here since Supabase is already a dependency; the write volume
 * is one row per key per window, not per request, if the window start is used
 * as part of the key.
 *
 * IP KEYS DEPEND ON `trust proxy`
 * -------------------------------
 * Every `req.ip` key is only meaningful because index.js sets
 * `app.set('trust proxy', TRUST_PROXY_HOPS)`. Without it, Express reports the
 * proxy's address and all clients share one bucket. See rate_limit.test.js.
 */

const rateLimitMap = new Map();

export function rateLimit(windowMs, max, keyFn, label) {
  const middleware = (req, res, next) => {
    const key = keyFn ? keyFn(req) : req.ip;
    const now = Date.now();
    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, { count: 1, start: now });
      return next();
    }
    const entry = rateLimitMap.get(key);
    if (now - entry.start > windowMs) {
      rateLimitMap.set(key, { count: 1, start: now });
      return next();
    }
    entry.count++;
    if (entry.count > max) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    next();
  };
  // A function returned from a factory has no inferred name, so the limiters
  // were invisible to anything that inspects the middleware chain by name —
  // including scripts/route-table.js, which is what verifies the routes/ split
  // didn't change any chain. Name it explicitly so a swapped or dropped limiter
  // shows up in that diff.
  if (label) Object.defineProperty(middleware, 'name', { value: label, configurable: true });
  return middleware;
}

/** Test/ops helper: current bucket count for a key (undefined if none). */
export function bucketCount(key) {
  return rateLimitMap.get(key)?.count;
}

/** Test helper: drop all buckets. */
export function resetBuckets() {
  rateLimitMap.clear();
}

/** Number of distinct live buckets — useful to assert clients aren't sharing one. */
export function bucketKeys() {
  return [...rateLimitMap.keys()];
}

let sweeper = null;

/** Start the periodic sweep of expired buckets. Idempotent. */
export function startSweeper(intervalMs = 5 * 60 * 1000, maxAgeMs = 15 * 60 * 1000) {
  if (sweeper) return sweeper;
  sweeper = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap) {
      if (now - entry.start > maxAgeMs) rateLimitMap.delete(key);
    }
  }, intervalMs);
  // Don't hold the event loop open (matters for tests and clean shutdown).
  sweeper.unref?.();
  return sweeper;
}

export function stopSweeper() {
  if (sweeper) { clearInterval(sweeper); sweeper = null; }
}
