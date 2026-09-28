import test from 'node:test';
import assert from 'node:assert/strict';
import { matchTransactionsToBookings, bookingIdPrefix } from './awinApi.js';

const bookings = [
  { id: 'a1b2c3d4-1111-2222-3333-444455556666', email: 'a@x.com', hotelName: 'Hotel A' },
  { id: 'f0e0d0c0-1111-2222-3333-444455556666', email: 'b@x.com', hotelName: 'Hotel B' },
];

test('bookingIdPrefix: strips dashes and takes 12 hex chars (not the raw 8-char first UUID group)', () => {
  assert.equal(bookingIdPrefix('a1b2c3d4-1111-2222-3333-444455556666'), 'a1b2c3d41111');
  assert.equal(bookingIdPrefix('A1B2C3D4-1111-2222-3333-444455556666'), 'a1b2c3d41111');
});

test('matchTransactionsToBookings: matches nested clickRefs.clickRef (Awin v3 shape)', () => {
  const txns = [{ id: 1, clickRefs: { clickRef: 'resdrop_a1b2c3d41111' }, commissionAmount: { amount: 12.5 } }];
  const [out] = matchTransactionsToBookings(txns, bookings);
  assert.equal(out.matchedBookingId, bookings[0].id);
  assert.equal(out.matchedUserEmail, 'a@x.com');
  assert.equal(out.matchedHotelName, 'Hotel A');
});

test('matchTransactionsToBookings: matches flat clickRef field', () => {
  const txns = [{ id: 2, clickRef: 'resdrop_f0e0d0c01111' }];
  const [out] = matchTransactionsToBookings(txns, bookings);
  assert.equal(out.matchedBookingId, bookings[1].id);
});

test('matchTransactionsToBookings: is case-insensitive on the hex prefix', () => {
  const txns = [{ id: 3, clickRef: 'resdrop_A1B2C3D41111' }];
  const [out] = matchTransactionsToBookings(txns, bookings);
  assert.equal(out.matchedBookingId, bookings[0].id);
});

test('matchTransactionsToBookings: an old 8-char clickref (pre-widening) no longer matches', () => {
  // Regression guard for the widening itself: a stale/short clickref must not
  // silently match a booking via a truncated regex — better to leave it
  // unmatched than misattribute at the old, weaker collision resistance.
  const txns = [{ id: 99, clickRef: 'resdrop_a1b2c3d4' }];
  const [out] = matchTransactionsToBookings(txns, bookings);
  assert.equal(out.matchedBookingId, null);
});

test('matchTransactionsToBookings: no match leaves matched fields null, transaction unchanged otherwise', () => {
  const txns = [{ id: 4, clickRef: 'resdrop_deadbeef0000', saleAmount: { amount: 100 } }];
  const [out] = matchTransactionsToBookings(txns, bookings);
  assert.equal(out.matchedBookingId, null);
  assert.equal(out.matchedUserEmail, null);
  assert.equal(out.saleAmount.amount, 100);
});

test('matchTransactionsToBookings: transaction with no clickref at all does not throw', () => {
  const txns = [{ id: 5 }];
  const [out] = matchTransactionsToBookings(txns, bookings);
  assert.equal(out.matchedBookingId, null);
});

test('matchTransactionsToBookings: unrelated clickref prefix (not "resdrop_") is left unmatched', () => {
  const txns = [{ id: 6, clickRef: 'repricehq_1727654321' }];
  const [out] = matchTransactionsToBookings(txns, bookings);
  assert.equal(out.matchedBookingId, null);
});

test('matchTransactionsToBookings: empty inputs return empty array', () => {
  assert.deepEqual(matchTransactionsToBookings([], []), []);
  assert.deepEqual(matchTransactionsToBookings(null, null), []);
});

test('matchTransactionsToBookings: a truthy non-array (e.g. an API error object) degrades to empty instead of throwing', () => {
  // getTransactions() does `result || []` — only a falsy result becomes [];
  // an error object like {error:"..."} from Awin would reach here unchanged.
  assert.deepEqual(matchTransactionsToBookings({ error: 'rate limited' }, bookings), []);
});

test('matchTransactionsToBookings: booking without id is skipped when building the index', () => {
  const txns = [{ id: 7, clickRef: 'resdrop_a1b2c3d41111' }];
  const out = matchTransactionsToBookings(txns, [{ email: 'no-id@x.com' }, bookings[0]]);
  assert.equal(out[0].matchedBookingId, bookings[0].id);
});
