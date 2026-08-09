/**
 * Who is an admin.
 *
 * The list used to be a hardcoded array of two personal Gmail addresses,
 * duplicated in index.js AND db.js. That meant:
 *   - the addresses were committed to git and shipped in every clone
 *   - admin access could not be granted or revoked without a code change and a
 *     redeploy
 *   - two copies of the same list could drift apart, so an account could be
 *     admin for adminMiddleware but not for the plan defaulting in db.js
 *
 * It is now env-only and defined once.
 *
 * Configure with either variable (both accept a comma-separated list):
 *   ADMIN_EMAILS=a@example.com,b@example.com
 *   ADMIN_EMAIL=a@example.com          # legacy single-value name, still read
 */

function parseList(raw) {
  return String(raw || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Resolve the admin list from an environment object. */
export function adminEmails(env = process.env) {
  const merged = [...parseList(env.ADMIN_EMAILS), ...parseList(env.ADMIN_EMAIL)];
  return [...new Set(merged)];
}

const ADMIN_EMAILS = adminEmails();

if (ADMIN_EMAILS.length === 0) {
  // Loud, but do NOT fail open or closed silently: with no admins configured,
  // isAdminEmail simply answers false for everyone and /api/admin/* is
  // unreachable. That is the safe direction, but it is almost never intended.
  console.warn(
    '[Auth] No admin emails configured — every /api/admin/* route will return 403. ' +
    'Set ADMIN_EMAILS (comma-separated) in the environment.'
  );
}

/**
 * Signature unchanged from the previous in-file definitions: (email) => boolean,
 * case-insensitive, falsy-safe.
 */
export function isAdminEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

/** The resolved list, for diagnostics. */
export function configuredAdmins() {
  return [...ADMIN_EMAILS];
}
