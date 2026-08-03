// Shared date helpers.
//
// The app handles two kinds of value and they must never be parsed the same way:
//
//  • CALENDAR DATES — checkinDate / checkoutDate. "2026-08-06" means that day on
//    the wall calendar; it has no timezone. `new Date("2026-08-06")` parses it as
//    UTC midnight, so in any negative-offset zone (Brazil is UTC-3) it renders as
//    the PREVIOUS day — an Aug 6–24 stay displayed as Aug 5–23.
//
//  • INSTANTS — lastChecked, alert.date, priceHistory[].date. These are real
//    moments in time and DO carry a timezone, so they must keep normal parsing
//    and be shown in the viewer's local zone.
//
// Calendar parsing deliberately reads only the leading YYYY-MM-DD, so a stay date
// still survives if the backend ever returns it as a full timestamp
// ("2026-08-06T00:00:00Z") rather than a bare date.

const CALENDAR_PREFIX_RE = /^(\d{4})-(\d{2})-(\d{2})/;

export function parseCalendarDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const m = value.match(CALENDAR_PREFIX_RE);
    // Local midnight — no UTC round-trip, so the day can never shift.
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseInstant(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Whole nights in a stay. Computed from the local-parsed calendar dates so a DST
// boundary inside the stay can't round a night up or down.
export function nightsBetween(checkin, checkout) {
  const a = parseCalendarDate(checkin);
  const b = parseCalendarDate(checkout);
  if (!a || !b) return 0;
  const days = Math.round((b - a) / 86400000);
  return days > 0 ? days : 0;
}

const DEFAULT_STAY_FORMAT = {
  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
};

export function formatStayDate(value, locale, options) {
  const d = parseCalendarDate(value);
  if (!d) return '—';
  return d.toLocaleDateString(locale, options || DEFAULT_STAY_FORMAT);
}

export function formatInstantDate(value, locale, options) {
  const d = parseInstant(value);
  if (!d) return '—';
  return d.toLocaleDateString(locale, options || DEFAULT_STAY_FORMAT);
}

export function formatInstantTime(value, locale) {
  const d = parseInstant(value);
  if (!d) return '—';
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}
