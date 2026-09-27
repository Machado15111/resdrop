import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  watchConfig, cadenceHoursFor, isWatchEligible, selectWatchesToCheck,
  evaluateAvailability, applyWatchResult, findExpiredWatches, validateWatch,
  watchToSearchInput,
} from './availability.js';

/**
 * Availability watches decide when to spend an API call and when to interrupt
 * someone's day with an email. Both are easy to get wrong in the direction of
 * "too often", so every rule here is pinned.
 */

const CFG = watchConfig({});           // defaults: 2h / 1h urgent / 24h cooldown
const NOW = Date.parse('2027-03-01T12:00:00Z');
const day = (n) => new Date(NOW + n * 8.64e7).toISOString().slice(0, 10);
const hoursAgo = (h) => new Date(NOW - h * 3.6e6).toISOString();

function watch(over = {}) {
  return {
    id: 'w1', email: 'a@example.com', hotelName: 'Copacabana Palace',
    checkinDate: day(30), checkoutDate: day(32), status: 'watching',
    lastChecked: null, checkCount: 0, consecutiveEmpty: 0, notifiedAt: null,
    ...over,
  };
}

function offer(over = {}) {
  return { totalPrice: 1000, currency: 'BRL', source: 'Booking.com', isExactMatch: true, freeCancellation: true, ...over };
}

// ─── Cadence ────────────────────────────────────────────────

describe('cadence', () => {
  test('a distant stay runs at the normal interval', () => {
    assert.equal(cadenceHoursFor(watch({ checkinDate: day(30) }), CFG, NOW), 2);
  });

  test('a stay inside the urgent window runs twice as often', () => {
    assert.equal(cadenceHoursFor(watch({ checkinDate: day(3) }), CFG, NOW), 1);
  });

  test('the urgent window is inclusive at its edge', () => {
    assert.equal(cadenceHoursFor(watch({ checkinDate: day(7) }), CFG, NOW), 1);
    assert.equal(cadenceHoursFor(watch({ checkinDate: day(8) }), CFG, NOW), 2);
  });

  test('a missing check-in date falls back to the normal interval', () => {
    assert.equal(cadenceHoursFor({ checkinDate: null }, CFG, NOW), 2);
  });
});

// ─── Eligibility ────────────────────────────────────────────

describe('eligibility', () => {
  test('a never-checked active watch is due', () => {
    assert.equal(isWatchEligible(watch(), CFG, NOW), true);
  });

  test('cancelled and expired watches are never checked again', () => {
    assert.equal(isWatchEligible(watch({ status: 'cancelled' }), CFG, NOW), false);
    assert.equal(isWatchEligible(watch({ status: 'expired' }), CFG, NOW), false);
  });

  test('an available watch keeps being checked, so a re-sell-out is noticed', () => {
    assert.equal(isWatchEligible(watch({ status: 'available' }), CFG, NOW), true);
  });

  test('a stay that has already started is not checked', () => {
    assert.equal(isWatchEligible(watch({ checkinDate: day(-1) }), CFG, NOW), false);
  });

  test('the cadence is respected', () => {
    assert.equal(isWatchEligible(watch({ lastChecked: hoursAgo(1) }), CFG, NOW), false, '1h ago, normal cadence is 2h');
    assert.equal(isWatchEligible(watch({ lastChecked: hoursAgo(3) }), CFG, NOW), true);
  });

  test('the urgent cadence lets a soon watch through where a distant one waits', () => {
    const soon = watch({ checkinDate: day(2), lastChecked: hoursAgo(1.5) });
    const far = watch({ checkinDate: day(60), lastChecked: hoursAgo(1.5) });
    assert.equal(isWatchEligible(soon, CFG, NOW), true);
    assert.equal(isWatchEligible(far, CFG, NOW), false);
  });
});

// ─── Selection ──────────────────────────────────────────────

describe('selection', () => {
  test('soonest check-in first, then least recently checked', () => {
    const list = [
      watch({ id: 'far', checkinDate: day(40) }),
      watch({ id: 'soon', checkinDate: day(10) }),
      watch({ id: 'mid-fresh', checkinDate: day(20), lastChecked: hoursAgo(3) }),
      watch({ id: 'mid-stale', checkinDate: day(20), lastChecked: hoursAgo(9) }),
    ];
    const picked = selectWatchesToCheck(list, { cfg: CFG, now: NOW }).map(w => w.id);
    assert.deepEqual(picked, ['soon', 'mid-stale', 'mid-fresh', 'far']);
  });

  test('the daily budget caps the cycle, not just the batch size', () => {
    const list = Array.from({ length: 10 }, (_, i) => watch({ id: `w${i}`, checkinDate: day(i + 1) }));
    assert.equal(selectWatchesToCheck(list, { cfg: CFG, budgetRemaining: 3, now: NOW }).length, 3);
    assert.equal(selectWatchesToCheck(list, { cfg: { ...CFG, batch: 2 }, now: NOW }).length, 2);
  });

  test('an exhausted budget checks nothing', () => {
    assert.deepEqual(selectWatchesToCheck([watch()], { cfg: CFG, budgetRemaining: 0, now: NOW }), []);
  });

  test('junk input does not throw', () => {
    assert.deepEqual(selectWatchesToCheck(null, { cfg: CFG, now: NOW }), []);
    assert.deepEqual(selectWatchesToCheck([null, undefined], { cfg: CFG, now: NOW }), []);
  });
});

// ─── Reading the search result ──────────────────────────────

describe('evaluateAvailability', () => {
  test('no quotes means sold out', () => {
    assert.equal(evaluateAvailability([]).available, false);
    assert.equal(evaluateAvailability(null).available, false);
  });

  test('a quote for a different property proves nothing about this hotel', () => {
    const result = evaluateAvailability([offer({ isExactMatch: false })]);
    assert.equal(result.available, false, 'a non-exact match must not read as availability');
    assert.equal(result.offerCount, 0);
  });

  test('any exact-hotel quote counts as available', () => {
    const result = evaluateAvailability([offer()]);
    assert.equal(result.available, true);
    assert.equal(result.offerCount, 1);
  });

  test('the cheapest exact quote is the one reported', () => {
    const result = evaluateAvailability([
      offer({ totalPrice: 2000, source: 'Expedia' }),
      offer({ totalPrice: 1200, source: 'Booking.com' }),
    ]);
    assert.equal(result.best.price, 1200);
    assert.equal(result.best.source, 'Booking.com');
  });

  test('at the same price, the refundable room wins', () => {
    const result = evaluateAvailability([
      offer({ totalPrice: 1000, source: 'NoRefund', freeCancellation: false }),
      offer({ totalPrice: 1000, source: 'Refundable', freeCancellation: true }),
    ]);
    assert.equal(result.best.source, 'Refundable');
  });
});

// ─── Folding a check into the watch ─────────────────────────

describe('applyWatchResult', () => {
  test('sold out: counts the check, no alert', () => {
    const { updates, alert } = applyWatchResult(watch(), [], { cfg: CFG, now: NOW });
    assert.equal(alert, false);
    assert.equal(updates.checkCount, 1);
    assert.equal(updates.consecutiveEmpty, 1);
    assert.equal(updates.status, undefined, 'a sold-out check must not change the status');
  });

  test('the first room found alerts and records the offer', () => {
    const { updates, alert, transition } = applyWatchResult(watch(), [offer()], { cfg: CFG, now: NOW });
    assert.equal(alert, true);
    assert.equal(transition, 'became_available');
    assert.equal(updates.status, 'available');
    assert.equal(updates.foundPrice, 1000);
    assert.equal(updates.foundSource, 'Booking.com');
    assert.equal(updates.notifiedAt, new Date(NOW).toISOString());
  });

  test('an already-available watch does not alert again', () => {
    const w = watch({ status: 'available', notifiedAt: hoursAgo(1) });
    const { alert, transition } = applyWatchResult(w, [offer()], { cfg: CFG, now: NOW });
    assert.equal(alert, false);
    assert.equal(transition, 'still_available');
  });

  test('selling out again returns the watch to watching, silently', () => {
    const w = watch({ status: 'available', notifiedAt: hoursAgo(2) });
    const { updates, alert, transition } = applyWatchResult(w, [], { cfg: CFG, now: NOW });
    assert.equal(alert, false);
    assert.equal(updates.status, 'watching');
    assert.equal(transition, 'became_unavailable');
  });

  test('flapping inventory cannot alert twice inside the cooldown', () => {
    // Alerted 3h ago, sold out since, open again now.
    const w = watch({ status: 'watching', notifiedAt: hoursAgo(3) });
    const { updates, alert, transition } = applyWatchResult(w, [offer()], { cfg: CFG, now: NOW });
    assert.equal(alert, false, 'inside the 24h cooldown');
    assert.equal(transition, 'became_available_muted');
    assert.equal(updates.status, 'available', 'the state still reflects reality');
    assert.equal(updates.notifiedAt, undefined, 'a muted alert must not extend the cooldown');
  });

  test('past the cooldown, a genuine reopening alerts again', () => {
    const w = watch({ status: 'watching', notifiedAt: hoursAgo(30) });
    const { alert } = applyWatchResult(w, [offer()], { cfg: CFG, now: NOW });
    assert.equal(alert, true);
  });

  test('enough empty checks in a row flags the watch for review', () => {
    const w = watch({ consecutiveEmpty: CFG.emptyChecksBeforeReview - 1 });
    const { updates } = applyWatchResult(w, [], { cfg: CFG, now: NOW });
    assert.equal(updates.needsReview, true, 'sold out and "hotel not found" look identical — say so');
  });

  test('a single quote clears the review flag and the empty streak', () => {
    const w = watch({ consecutiveEmpty: 20, needsReview: true });
    const { updates } = applyWatchResult(w, [offer()], { cfg: CFG, now: NOW });
    assert.equal(updates.consecutiveEmpty, 0);
    assert.equal(updates.needsReview, false);
  });
});

// ─── Retirement and validation ──────────────────────────────

describe('expiry and validation', () => {
  test('watches whose stay has started are retired', () => {
    const list = [watch({ id: 'past', checkinDate: day(-1) }), watch({ id: 'future' })];
    assert.deepEqual(findExpiredWatches(list, NOW).map(w => w.id), ['past']);
  });

  test('already-cancelled watches are not retired twice', () => {
    const list = [watch({ id: 'x', checkinDate: day(-5), status: 'cancelled' })];
    assert.deepEqual(findExpiredWatches(list, NOW), []);
  });

  test('a well-formed watch validates', () => {
    const v = validateWatch({ hotelName: 'Fasano', checkinDate: day(10), checkoutDate: day(12) }, NOW);
    assert.equal(v.valid, true);
    assert.equal(v.guests, 2, 'guests defaults to two');
  });

  test('the required fields are required', () => {
    const v = validateWatch({}, NOW);
    assert.equal(v.valid, false);
    assert.equal(v.errors.length, 3);
  });

  test('check-out must be after check-in, and the stay must be in the future', () => {
    assert.match(
      validateWatch({ hotelName: 'X', checkinDate: day(10), checkoutDate: day(10) }, NOW).errors.join(),
      /checkoutDate must be after/,
    );
    assert.match(
      validateWatch({ hotelName: 'X', checkinDate: day(-2), checkoutDate: day(2) }, NOW).errors.join(),
      /past/,
    );
  });

  test('a stay starting today is still accepted', () => {
    const v = validateWatch({ hotelName: 'X', checkinDate: day(0), checkoutDate: day(2) }, NOW);
    assert.equal(v.valid, true, 'someone looking for a room tonight is the whole point');
  });

  test('guests is bounded', () => {
    assert.equal(validateWatch({ hotelName: 'X', checkinDate: day(1), checkoutDate: day(2), guests: 0 }, NOW).valid, false);
    assert.equal(validateWatch({ hotelName: 'X', checkinDate: day(1), checkoutDate: day(2), guests: 99 }, NOW).valid, false);
  });
});

test('the search input carries no room type', () => {
  const input = watchToSearchInput(watch({ id: 'abc' }));
  assert.equal(input.roomType, null,
    'a room type would make the rate parser filter for a compatible room, when the question is whether ANY room exists');
  assert.equal(input.hotelName, 'Copacabana Palace');
  assert.equal(input.id, 'watch-abc');
});
