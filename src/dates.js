// Shared date helpers.
//
// Stay dates (checkinDate/checkoutDate) are stored as DATE-ONLY strings
// ("2026-08-06"). `new Date("2026-08-06")` parses that as UTC midnight, so in
// any negative-offset timezone (Brazil is UTC-3) it renders as the PREVIOUS
// day — an Aug 6–24 reservation displayed as Aug 5–23. A calendar date has no
// timezone, so it must be built in LOCAL time to survive formatting intact.
//
// Real timestamps (lastChecked, alert.date) are full ISO instants and DO carry
// a timezone — those must keep their normal parsing. `parseDateOnly` only
// special-cases the bare YYYY-MM-DD shape and leaves everything else alone.

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDateOnly(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const m = value.match(DATE_ONLY_RE);
    // Local midnight — no UTC round-trip, so the day can never shift.
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Whole days between two stay dates. Computed from the local-parsed calendar
// dates so a DST boundary inside the stay can't round a night up or down.
export function nightsBetween(checkin, checkout) {
  const a = parseDateOnly(checkin);
  const b = parseDateOnly(checkout);
  if (!a || !b) return 0;
  const days = Math.round((b - a) / 86400000);
  return days > 0 ? days : 0;
}

export function formatStayDate(value, locale, options) {
  const d = parseDateOnly(value);
  if (!d) return '—';
  return d.toLocaleDateString(locale, options || {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}
