import bcrypt from 'bcryptjs';

/**
 * Password hashing policy.
 *
 * COST FACTOR
 * -----------
 * Was 10. At 12 a single verification costs ~4x more, which is the point: it is
 * the multiplier an attacker pays for every candidate in an offline crack of a
 * leaked `users.password_hash` column. The user pays it once per login.
 *
 * Raising the constant alone would leave every EXISTING hash at cost 10
 * forever, since bcrypt encodes the cost in the hash. rehashIfWeak() upgrades a
 * hash transparently at the next successful login — the one moment the
 * plaintext is legitimately in hand.
 */
export const BCRYPT_COST = 12;

/** Minimum password length. Short passwords are the cheapest thing to crack. */
export const MIN_PASSWORD_LENGTH = 10;

export function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/** The cost factor baked into an existing bcrypt hash, or null if unreadable. */
export function costOf(hash) {
  // $2a$10$... — the segment between the second and third '$'.
  const m = /^\$2[aby]?\$(\d{2})\$/.exec(String(hash || ''));
  return m ? parseInt(m[1], 10) : null;
}

export function needsRehash(hash) {
  const cost = costOf(hash);
  return cost === null ? false : cost < BCRYPT_COST;
}

/**
 * If `hash` was made with a weaker cost, return a fresh hash at the current
 * cost. Returns null when no upgrade is needed. Call only after the password
 * has been verified.
 */
export async function rehashIfWeak(password, hash) {
  if (!needsRehash(hash)) return null;
  return hashPassword(password);
}

/**
 * A hash of a throwaway value, used to burn the same CPU time on a login for a
 * non-existent account as on a real one. Computed once at startup.
 *
 * Without it, "no such user" returns in ~0ms while a real account costs the
 * bcrypt work factor — a timing difference large enough to enumerate which
 * email addresses have accounts, which the generic error message was meant to
 * prevent.
 */
const DUMMY_HASH = bcrypt.hashSync('resdrop-timing-equalizer-not-a-real-password', BCRYPT_COST);

/** Burn one bcrypt verification's worth of time. Always resolves false. */
export async function burnCompare(password) {
  await bcrypt.compare(String(password ?? ''), DUMMY_HASH);
  return false;
}

/**
 * Validate a candidate password. Returns { ok } or { ok:false, error:{en,pt} }
 * so the caller can answer in the user's language — every user-facing string in
 * this app exists in both.
 */
export function validatePassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    return {
      ok: false,
      code: 'PASSWORD_REQUIRED',
      error: { en: 'Password is required', pt: 'Senha obrigatória' },
    };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      code: 'PASSWORD_TOO_SHORT',
      error: {
        en: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        pt: `Senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`,
      },
    };
  }
  // bcrypt silently truncates at 72 bytes; rejecting is clearer than pretending
  // the extra characters add strength.
  if (Buffer.byteLength(password, 'utf8') > 72) {
    return {
      ok: false,
      code: 'PASSWORD_TOO_LONG',
      error: {
        en: 'Password must be at most 72 bytes',
        pt: 'Senha deve ter no máximo 72 bytes',
      },
    };
  }
  return { ok: true };
}

/** Pick the message for a request's language (defaults to pt, as the app does). */
export function messageFor(result, lang) {
  if (!result || result.ok) return null;
  return lang === 'en' ? result.error.en : result.error.pt;
}
