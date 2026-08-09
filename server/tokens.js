import crypto from 'crypto';

/**
 * Hashing for bearer-style secrets stored in the database.
 *
 * WHY SHA-256 AND NOT BCRYPT
 * --------------------------
 * These tokens are 256 bits of `crypto.randomBytes` output, not user-chosen
 * passwords. There is no dictionary to attack and no meaningful search space to
 * slow down, so a work factor buys nothing — while costing ~100ms on the auth
 * hot path, which runs on EVERY authenticated request. A fast hash is the right
 * primitive here; bcrypt stays for passwords, where the input is low-entropy.
 *
 * WHAT THIS BUYS
 * --------------
 * `sessions.token` and `password_resets.token` held the raw token. Anyone with
 * read access to a database snapshot, a leaked backup, or an over-broad
 * analytics query could lift a live session token and impersonate that user
 * directly — no password needed. Storing only the digest makes a stolen dump
 * useless for authentication.
 *
 * (`pending_import_tokens` already did this, via routes/inbound-email.js's
 * hashToken. This brings sessions and password resets in line with it — and
 * uses the identical construction so the two can't diverge.)
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/** A fresh 256-bit token, hex encoded. */
export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Timing-safe comparison for two hex digests of equal length. Used where a
 * digest is compared in application code rather than by the database.
 */
export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a ?? ''), 'utf8');
  const bufB = Buffer.from(String(b ?? ''), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
