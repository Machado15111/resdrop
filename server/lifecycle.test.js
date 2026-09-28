import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dormantActiveBooking,
  isNoBookingAdded,
  wasEmailedRecently,
  wasNudgeSentRecently,
  DORMANT_DAYS,
  NO_BOOKING_DAYS,
  EMAIL_COOLDOWN_DAYS,
} from './lifecycle.js';

const NOW = new Date('2026-09-28T00:00:00Z').getTime();
const daysAgo = (n) => new Date(NOW - n * 86400000).toISOString();

// ── dormantActiveBooking ────────────────────────────────────────

test('dormantActiveBooking: null when user was active recently', () => {
  const user = { email: 'a@x.com', lastActive: daysAgo(DORMANT_DAYS - 1) };
  const bookings = [{ status: 'monitoring', checkinDate: daysAgo(-10) }];
  assert.equal(dormantActiveBooking(user, bookings, NOW), null);
});

test('dormantActiveBooking: null when dormant but no active bookings', () => {
  const user = { email: 'a@x.com', lastActive: daysAgo(DORMANT_DAYS + 5) };
  const bookings = [{ status: 'dismissed' }, { status: 'expired' }];
  assert.equal(dormantActiveBooking(user, bookings, NOW), null);
});

test('dormantActiveBooking: null when lastActive has never been recorded (unknown, not dormant)', () => {
  // Otherwise the entire existing user base reads as "infinitely dormant" the
  // moment last_active tracking ships, since nobody has a value yet.
  const user = { email: 'a@x.com', lastActive: null };
  const bookings = [{ status: 'monitoring', checkinDate: daysAgo(-5) }];
  assert.equal(dormantActiveBooking(user, bookings, NOW), null);
});

test('dormantActiveBooking: picks the soonest check-in among active bookings', () => {
  const user = { email: 'a@x.com', lastActive: daysAgo(DORMANT_DAYS + 1) };
  const soon = { status: 'monitoring', checkinDate: daysAgo(-5), hotelName: 'Soon Hotel' };
  const later = { status: 'savings_found', checkinDate: daysAgo(-40), hotelName: 'Later Hotel' };
  const picked = dormantActiveBooking(user, [later, soon], NOW);
  assert.equal(picked.hotelName, 'Soon Hotel');
});

test('dormantActiveBooking: exactly at the threshold counts as dormant', () => {
  const user = { email: 'a@x.com', lastActive: daysAgo(DORMANT_DAYS) };
  const bookings = [{ status: 'lower_fare_found', checkinDate: daysAgo(-1) }];
  assert.ok(dormantActiveBooking(user, bookings, NOW));
});

test('dormantActiveBooking: user with no email returns null', () => {
  assert.equal(dormantActiveBooking({ lastActive: daysAgo(30) }, [{ status: 'monitoring' }], NOW), null);
});

// ── isNoBookingAdded ─────────────────────────────────────────────

test('isNoBookingAdded: true after the threshold with zero bookings', () => {
  const user = { email: 'a@x.com', joinedAt: daysAgo(NO_BOOKING_DAYS + 1) };
  assert.equal(isNoBookingAdded(user, false, NOW), true);
});

test('isNoBookingAdded: false before the threshold', () => {
  const user = { email: 'a@x.com', joinedAt: daysAgo(NO_BOOKING_DAYS - 1) };
  assert.equal(isNoBookingAdded(user, false, NOW), false);
});

test('isNoBookingAdded: false when the user has a booking, no matter how old the account is', () => {
  const user = { email: 'a@x.com', joinedAt: daysAgo(365) };
  assert.equal(isNoBookingAdded(user, true, NOW), false);
});

test('isNoBookingAdded: falls back to createdAt when joinedAt is absent', () => {
  const user = { email: 'a@x.com', createdAt: daysAgo(NO_BOOKING_DAYS + 3) };
  assert.equal(isNoBookingAdded(user, false, NOW), true);
});

// ── wasEmailedRecently / wasNudgeSentRecently ───────────────────

test('wasEmailedRecently: true within the cooldown window', () => {
  const rows = [{ action: 'email_sent', createdAt: daysAgo(EMAIL_COOLDOWN_DAYS - 1) }];
  assert.equal(wasEmailedRecently(rows, EMAIL_COOLDOWN_DAYS, NOW), true);
});

test('wasEmailedRecently: false outside the cooldown window', () => {
  const rows = [{ action: 'email_sent', createdAt: daysAgo(EMAIL_COOLDOWN_DAYS + 1) }];
  assert.equal(wasEmailedRecently(rows, EMAIL_COOLDOWN_DAYS, NOW), false);
});

test('wasEmailedRecently: ignores non-email activity', () => {
  const rows = [{ action: 'savings_confirmed', createdAt: daysAgo(1) }];
  assert.equal(wasEmailedRecently(rows, EMAIL_COOLDOWN_DAYS, NOW), false);
});

test('wasEmailedRecently: empty/missing rows is false', () => {
  assert.equal(wasEmailedRecently([], EMAIL_COOLDOWN_DAYS, NOW), false);
  assert.equal(wasEmailedRecently(null, EMAIL_COOLDOWN_DAYS, NOW), false);
});

test('wasNudgeSentRecently: matches only the same nudgeKind', () => {
  const rows = [{ action: 'email_sent', details: { nudgeKind: 'no_booking_added' }, createdAt: daysAgo(2) }];
  assert.equal(wasNudgeSentRecently(rows, 'no_booking_added', 30, NOW), true);
  assert.equal(wasNudgeSentRecently(rows, 'dormant_active_bookings', 30, NOW), false);
});

test('wasNudgeSentRecently: respects its own cooldown window independent of the global one', () => {
  const rows = [{ action: 'email_sent', details: { nudgeKind: 'no_booking_added' }, createdAt: daysAgo(20) }];
  assert.equal(wasNudgeSentRecently(rows, 'no_booking_added', 30, NOW), true);
  assert.equal(wasNudgeSentRecently(rows, 'no_booking_added', 10, NOW), false);
});
