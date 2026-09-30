// Guards the two rules that decide whether a vendor rate may claim a SAVING
// against the guest's reservation: same room, same cancellation terms.
//
// Both had defects that let a rate claim a saving it hadn't earned:
//
//  1. isRoomTypeCompatible documented a STRICT contract ("if one side is known
//     and the other unknown, we do NOT assume match") but returned true in
//     exactly that case. Google frequently omits room_type, so a Deluxe booking
//     was routinely priced against an unspecified — usually cheaper, lesser —
//     room.
//  2. detectFreeCancellation returned `false` for "Google said nothing", making
//     an unlabelled rate indistinguishable from one explicitly sold as
//     non-refundable.
//
// The product rule these encode: a rate we cannot verify as like-for-like is
// still SHOWN to the guest, it simply may not claim a saving or fire an alert.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isRoomTypeCompatible,
  roomTypeNotComparableReason,
  isRefundabilityCompatible,
  cancellationNotComparableReason,
  bookingIsRefundable,
  parseGoogleHotelsResults,
} from './serpApi.js';

// ── Room type ───────────────────────────────────────────────────────
test('room: same known category is comparable', () => {
  assert.equal(isRoomTypeCompatible('Deluxe Room, Balcony', 'Deluxe King'), true);
});

test('room: different known categories are NOT comparable', () => {
  assert.equal(isRoomTypeCompatible('Deluxe Room', 'Junior Suite'), false);
  assert.equal(isRoomTypeCompatible('Suite', 'Standard Room'), false);
});

test('room: known vs UNKNOWN is NOT comparable (the regression)', () => {
  // A Deluxe reservation must not be priced against a rate carrying no room
  // information at all — that was the false-savings bug.
  assert.equal(isRoomTypeCompatible('Deluxe Room, Balcony (or Terrace)', ''), false);
  assert.equal(isRoomTypeCompatible('', 'Deluxe Room'), false);
});

test('room: both unknown is comparable (nothing distinguishes them)', () => {
  assert.equal(isRoomTypeCompatible('', ''), true);
});

// roomTypeNotComparableReason must not claim a CONFIRMED mismatch ("different
// room type") when the real reason is that one side's room type was never
// reported — that's the common case (most OTA search results carry no
// per-room breakdown), and telling the guest "different room type" implies a
// verified fact we don't actually have.
test('reason: both categories known and differing is a genuine "different room"', () => {
  assert.equal(roomTypeNotComparableReason('Deluxe Room', 'Junior Suite'), 'different_room');
  assert.equal(roomTypeNotComparableReason('Suite', 'Standard Room'), 'different_room');
});

test('reason: either side unknown is "room type unknown", not a confirmed mismatch', () => {
  assert.equal(roomTypeNotComparableReason('Deluxe Room, Balcony (or Terrace)', ''), 'room_type_unknown');
  assert.equal(roomTypeNotComparableReason('', 'Deluxe Room'), 'room_type_unknown');
  assert.equal(roomTypeNotComparableReason('', ''), 'room_type_unknown');
});

// ── Refundability ───────────────────────────────────────────────────
test('refundability: booking policy maps to true/false/null', () => {
  assert.equal(bookingIsRefundable({ cancellationPolicy: 'free_cancellation' }), true);
  assert.equal(bookingIsRefundable({ cancellationPolicy: 'non_refundable' }), false);
  assert.equal(bookingIsRefundable({}), null);
});

test('refundability: refundable booking needs a refundable rate', () => {
  assert.equal(isRefundabilityCompatible(true, true), true);
  assert.equal(isRefundabilityCompatible(true, false), false);
  // Unknown is NOT treated as a match — we cannot verify it.
  assert.equal(isRefundabilityCompatible(true, null), false);
});

test('refundability: a CONFIRMED refundable rate is always comparable', () => {
  // The most flexible product there is — moving to it can never be a downgrade,
  // so it stands even when the reservation's own policy was never recorded.
  assert.equal(isRefundabilityCompatible(null, true), true);
  assert.equal(isRefundabilityCompatible(false, true), true);
});

test('refundability: a non-refundable rate needs a non-refundable booking', () => {
  assert.equal(isRefundabilityCompatible(false, false), true);
  assert.equal(isRefundabilityCompatible(true, false), false);
  // An unrecorded original is not evidence that the downgrade is safe.
  assert.equal(isRefundabilityCompatible(null, false), false);
});

// cancellationNotComparableReason must not claim a CONFIRMED downgrade
// ("different cancellation policy") when the real reason is that the vendor
// never reported its cancellation terms at all — same honesty rule as
// roomTypeNotComparableReason above.
test('reason: vendor policy unknown is "cancellation unknown", not a confirmed mismatch', () => {
  assert.equal(cancellationNotComparableReason(null), 'cancellation_unknown');
});

test('reason: vendor confirmed non-refundable is a genuine "different cancellation"', () => {
  assert.equal(cancellationNotComparableReason(false), 'different_cancellation');
});

// ── End to end through the parser ───────────────────────────────────
const deluxeBooking = {
  hotelName: 'Hôtel Juliana Cannes',
  checkinDate: '2026-08-06',
  checkoutDate: '2026-08-24',
  roomType: 'Deluxe Room, Balcony (or Terrace)',
  originalPrice: 7618.88,
  currency: 'USD',
  cancellationPolicy: 'free_cancellation',
};

const detailPage = (priceEntry) => ({
  type: 'hotel',
  name: 'Hôtel Juliana Cannes',
  overall_rating: 4.1,
  reviews: 609,
  featured_prices: [{
    source: 'Booking.com',
    link: 'https://www.booking.com/hotel/fr/juliana.html',
    rate_per_night: { extracted_lowest: 300 },
    total_rate: { extracted_lowest: 5400 }, // well below the 7618.88 booking
    ...priceEntry,
  }],
});

test('a cheaper rate with NO room info is shown but claims no saving', () => {
  const [r] = parseGoogleHotelsResults(
    detailPage({ amenities: ['Free cancellation'] }), 7618.88, deluxeBooking, 'USD');
  assert.ok(r, 'the rate must still be returned for display');
  assert.equal(r.roomTypeMatch, false);
  assert.equal(r.hasDrop, false, 'must not claim a drop on an unverified room');
  assert.equal(r.savings, 0);
  assert.equal(r.notComparableReason, 'room_type_unknown', 'no room data at all, not a confirmed mismatch');
});

test('a cheaper rate on the SAME room with free cancellation does claim a saving', () => {
  const [r] = parseGoogleHotelsResults(
    detailPage({ room_type: 'Deluxe Room', amenities: ['Free cancellation'] }),
    7618.88, deluxeBooking, 'USD');
  assert.ok(r);
  assert.equal(r.roomTypeMatch, true);
  assert.equal(r.freeCancellation, true);
  assert.equal(r.hasDrop, true);
  assert.ok(r.savings > 0);
});

test('same room but UNSTATED cancellation policy claims no saving', () => {
  const [r] = parseGoogleHotelsResults(
    detailPage({ room_type: 'Deluxe Room' }), 7618.88, deluxeBooking, 'USD');
  assert.ok(r, 'still shown');
  assert.equal(r.freeCancellation, null, 'unknown, not a confirmed "no"');
  assert.equal(r.hasDrop, false);
  assert.equal(r.notComparableReason, 'cancellation_unknown', 'never reported, not a confirmed downgrade');
});

test('same room but explicitly NON-refundable claims no saving', () => {
  const [r] = parseGoogleHotelsResults(
    detailPage({ room_type: 'Deluxe Room', deal_description: 'Non-refundable rate' }),
    7618.88, deluxeBooking, 'USD');
  assert.ok(r);
  assert.equal(r.freeCancellation, false);
  assert.equal(r.hasDrop, false);
  assert.equal(r.notComparableReason, 'different_cancellation', 'confirmed non-refundable vs. the refundable booking');
});
