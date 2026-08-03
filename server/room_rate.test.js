// Guards that a quote is priced on the room the guest actually booked.
//
// Google reports a vendor's headline rate as the CHEAPEST room it sells at the
// property, with the real breakdown in `rooms[]`. The parser used to read the
// headline and look for a room name in `room_type`/`room_name` — fields Google
// never sends on a vendor entry. For a real Juliana Cannes stay that surfaced
// $5,962 (Standard Double Room) as the price of the guest's "Deluxe Room,
// Balcony (or Terrace)", whose true Booking.com rate was $8,771. It invented a
// $1,655 saving on a room they never booked.
//
// Second defect locked out here: Google repeats a vendor in BOTH `prices` and
// `featured_prices`, and only one copy carries rooms[]. Deduping by "first one
// wins" discarded the copy with the breakdown every time.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickRoomRate, parseGoogleHotelsResults } from './serpApi.js';

const rate = (perNight, total, beforeNight, beforeTotal) => ({
  rate_per_night: { extracted_lowest: perNight, extracted_before_taxes_fees: beforeNight },
  total_rate: { extracted_lowest: total, extracted_before_taxes_fees: beforeTotal },
});

const STANDARD = { name: 'Standard Double Room', ...rate(331, 5962, 292, 5252) };
const DELUXE = {
  name: 'Deluxe Double Room with Balcony or Terrace',
  link: 'https://booking.example/deluxe',
  ...rate(487, 8771, 430, 7732),
};

const booking = {
  hotelName: 'Hôtel Juliana Cannes',
  destination: 'Cannes, France',
  checkinDate: '2026-08-06',
  checkoutDate: '2026-08-24',
  roomType: 'Deluxe Room, Balcony (or Terrace)',
  originalPrice: 7618.88,
  currency: 'USD',
  cancellationPolicy: 'free_cancellation',
};

test('picks the guest room, not the property cheapest', () => {
  const hit = pickRoomRate({ rooms: [STANDARD, DELUXE] }, booking.roomType);
  assert.equal(hit?.name, DELUXE.name);
});

test('falls back to null when the guest room is absent', () => {
  assert.equal(pickRoomRate({ rooms: [STANDARD] }, 'Penthouse Suite'), null);
  assert.equal(pickRoomRate({ rooms: [] }, booking.roomType), null);
});

test('among same-category rooms takes the cheapest (never overstates)', () => {
  const pricier = { name: 'Deluxe Double Room, Sea View', ...rate(600, 10800) };
  const hit = pickRoomRate({ rooms: [pricier, DELUXE] }, booking.roomType);
  assert.equal(hit?.name, DELUXE.name);
});

test('end to end: quotes the Deluxe rate and marks the room comparable', () => {
  const detail = {
    type: 'hotel',
    name: 'JULIANA Hôtel Cannes',
    // Google's duplicate listing: the roomless copy comes FIRST on purpose.
    prices: [{ source: 'Booking.com', link: 'https://booking.example', ...rate(331, 5962) }],
    featured_prices: [{
      source: 'Booking.com',
      link: 'https://booking.example',
      rooms: [STANDARD, DELUXE],
      ...rate(331, 5962),
    }],
  };
  const [r] = parseGoogleHotelsResults(detail, booking.originalPrice, booking, 'USD');
  assert.ok(r, 'expected a parsed quote');
  assert.equal(r.roomType, DELUXE.name);
  assert.equal(r.roomTypeMatch, true);
  assert.equal(r.totalPrice, 8771, 'must quote the Deluxe, not the $5,962 Standard');
  assert.equal(r.pricePerNight, 487);
  assert.equal(r.link, DELUXE.link, 'deep-link should point at the matched room');
  // $8,771 is ABOVE the $7,618.88 booking — there is no saving to claim.
  assert.equal(r.hasDrop, false);
  assert.equal(r.savings, 0);
});
