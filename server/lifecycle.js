/**
 * Lifecycle / retention triggers — pure selection logic (no DB, no HTTP).
 *
 * Implements the two trigger conditions from
 * agents/06-retention-growth-agent.md that are computable from data the app
 * already has, without any new instrumentation:
 *
 *   - dormant_with_active_bookings: user hasn't been seen in DORMANT_DAYS but
 *     still has a booking being actively monitored.
 *   - no_booking_added: user signed up NO_BOOKING_DAYS+ ago and never added
 *     a booking.
 *
 * The other six task modes in that playbook (repeated_alert_dismissals,
 * post_savings_no_new_booking, upgrade_prompt_natural, win_back,
 * annual_summary, referral_ask) need signals ResDrop doesn't capture yet
 * (dismissal counts tied to a user rather than a booking, cancellation
 * reasons, etc.) and are deliberately left out of this pass.
 */

export const DORMANT_DAYS = 14;
export const NO_BOOKING_DAYS = 7;
export const EMAIL_COOLDOWN_DAYS = 7; // "no outbound email in the last 7 days" rule
export const RENUDGE_COOLDOWN_DAYS = 30; // don't repeat the SAME nudge more often than this

const ACTIVE_STATUSES = ['monitoring', 'savings_found', 'lower_fare_found'];

export function daysSince(dateStr, now) {
  if (!dateStr) return Infinity;
  const t = new Date(dateStr).getTime();
  if (!Number.isFinite(t)) return Infinity;
  return (now - t) / 86400000;
}

/**
 * Is this user dormant (per touchLastActive) while still having a booking
 * under active monitoring? Picks the most relevant booking (soonest
 * check-in among active ones) for the email to reference.
 */
export function dormantActiveBooking(user, userBookings, now = Date.now()) {
  if (!user?.email) return null;
  // No lastActive yet means "we don't know", not "maximally dormant" — treating
  // it as the latter would flag the ENTIRE existing user base as dormant the
  // moment this field starts being tracked (see touchLastActive in db.js),
  // since nobody has a value for it yet. Wait for real signal to accumulate.
  if (!user.lastActive) return null;
  if (daysSince(user.lastActive, now) < DORMANT_DAYS) return null;
  const active = (userBookings || []).filter(b => ACTIVE_STATUSES.includes(b.status));
  if (active.length === 0) return null;
  return active
    .slice()
    .sort((a, b) => new Date(a.checkinDate || 0) - new Date(b.checkinDate || 0))[0];
}

/**
 * Signed up NO_BOOKING_DAYS+ ago, never added a booking.
 */
export function isNoBookingAdded(user, hasAnyBooking, now = Date.now()) {
  if (!user?.email || hasAnyBooking) return false;
  const joined = user.joinedAt || user.createdAt;
  return daysSince(joined, now) >= NO_BOOKING_DAYS;
}

/**
 * `rows` is an activity_log slice for one user (db.getActivityLog('user', email)).
 * True if ANY email went out within `days` — the playbook's global send guard.
 */
export function wasEmailedRecently(rows, days = EMAIL_COOLDOWN_DAYS, now = Date.now()) {
  return (rows || []).some(r => r.action === 'email_sent' && daysSince(r.createdAt, now) < days);
}

/**
 * `rows` is the same activity_log slice. True if THIS specific nudge kind was
 * already sent within RENUDGE_COOLDOWN_DAYS — separate from the 7-day global
 * guard, so a dormant user doesn't get the identical email every 2 weeks
 * forever once they cross the threshold.
 */
export function wasNudgeSentRecently(rows, nudgeKind, days = RENUDGE_COOLDOWN_DAYS, now = Date.now()) {
  return (rows || []).some(r =>
    r.action === 'email_sent' &&
    r.details?.nudgeKind === nudgeKind &&
    daysSince(r.createdAt, now) < days
  );
}
