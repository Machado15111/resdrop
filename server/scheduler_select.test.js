import test from 'node:test';
import assert from 'node:assert/strict';
import { isEligible, selectBookingsToCheck } from './scheduler.js';

const NOW = new Date('2026-08-01T12:00:00Z').getTime();
const future = (days) => new Date(NOW + days * 864e5).toISOString();
const hoursAgo = (h) => new Date(NOW - h * 36e5).toISOString();

test('isEligible: only actively-monitored statuses', () => {
  assert.equal(isEligible({ status: 'monitoring', checkoutDate: future(10) }, 24, NOW), true);
  assert.equal(isEligible({ status: 'lower_fare_found', checkoutDate: future(10) }, 24, NOW), true);
  assert.equal(isEligible({ status: 'confirmed_savings', checkoutDate: future(10) }, 24, NOW), false);
  assert.equal(isEligible({ status: 'needs_review', checkoutDate: future(10) }, 24, NOW), false);
  assert.equal(isEligible(null, 24, NOW), false);
});

test('isEligible: skips stays that already ended', () => {
  assert.equal(isEligible({ status: 'monitoring', checkoutDate: future(-1) }, 24, NOW), false);
});

test('isEligible: respects per-booking cadence (minHours)', () => {
  assert.equal(isEligible({ status: 'monitoring', checkoutDate: future(10), lastChecked: hoursAgo(2) }, 24, NOW), false);
  assert.equal(isEligible({ status: 'monitoring', checkoutDate: future(10), lastChecked: hoursAgo(30) }, 24, NOW), true);
  assert.equal(isEligible({ status: 'monitoring', checkoutDate: future(10) }, 24, NOW), true); // never checked
});

test('selectBookingsToCheck: soonest check-in first, capped by batch + budget', () => {
  const bookings = [
    { id: 'a', status: 'monitoring', checkinDate: future(30), checkoutDate: future(32) },
    { id: 'b', status: 'monitoring', checkinDate: future(3), checkoutDate: future(5) },
    { id: 'c', status: 'monitoring', checkinDate: future(10), checkoutDate: future(12) },
    { id: 'd', status: 'confirmed_savings', checkinDate: future(1), checkoutDate: future(2) }, // ineligible
  ];
  const pick = selectBookingsToCheck(bookings, { minHours: 24, batch: 10, budgetRemaining: 2, now: NOW });
  assert.deepEqual(pick.map(b => b.id), ['b', 'c'], 'soonest-checkin first, budget caps at 2, ineligible excluded');
});

test('selectBookingsToCheck: budget 0 => nothing checked', () => {
  const bookings = [{ id: 'a', status: 'monitoring', checkinDate: future(3), checkoutDate: future(5) }];
  assert.equal(selectBookingsToCheck(bookings, { budgetRemaining: 0, now: NOW }).length, 0);
});

test('selectBookingsToCheck: empty / non-array input', () => {
  assert.deepEqual(selectBookingsToCheck([], { now: NOW }), []);
  assert.deepEqual(selectBookingsToCheck(null, { now: NOW }), []);
});
