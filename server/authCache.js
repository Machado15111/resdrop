/**
 * Short-lived in-process cache for resolved sessions.
 *
 * Why: authMiddleware previously made TWO serial Supabase round-trips
 * (getSessionByToken + getUser) on EVERY authenticated request — ~460ms of pure
 * latency before any real work started. A dashboard load paid that twice.
 *
 * Safety: this caches only the RESULT of a successful lookup for a token that
 * was already validated. It never authenticates a token that was not valid, and
 * it is explicitly purged on logout and on user changes, so revoked sessions and
 * plan/permission updates take effect immediately rather than after the TTL.
 * The TTL is deliberately short so anything missed by an explicit purge (e.g. a
 * row changed directly in the database) self-corrects within a minute.
 *
 * Per-instance only — correctness never depends on it being shared or warm.
 */

const TTL_MS = 60_000;
const MAX_ENTRIES = 5_000; // bound memory on a busy instance

const byToken = new Map(); // token -> { email, user, expiresAt }

export function getCachedAuth(token) {
  const hit = byToken.get(token);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    byToken.delete(token);
    return null;
  }
  return hit;
}

export function setCachedAuth(token, email, user) {
  if (byToken.size >= MAX_ENTRIES) {
    // Cheap eviction: drop the oldest inserted entry (Map preserves order).
    const oldest = byToken.keys().next().value;
    if (oldest !== undefined) byToken.delete(oldest);
  }
  byToken.set(token, { email, user, expiresAt: Date.now() + TTL_MS });
}

/** Purge a single session (logout). */
export function invalidateToken(token) {
  byToken.delete(token);
}

/** Purge every session for a user (logout-all, plan/permission change). */
export function invalidateEmail(email) {
  const key = (email || '').toLowerCase();
  if (!key) return;
  for (const [token, entry] of byToken) {
    if (entry.email === key) byToken.delete(token);
  }
}

export function clearAuthCache() {
  byToken.clear();
}
