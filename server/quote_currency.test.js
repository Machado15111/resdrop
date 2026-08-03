// Regression guard for the "BRL amount labelled as USD" money bug.
//
// A user whose profile currency was BRL held a USD reservation. The rate search
// was issued with the PROFILE currency, so Google Hotels returned Brazilian
// amounts — but the quotes carried no currency of their own, so the UI fell back
// to the booking's label and rendered R$30,390 as "$30,390". Two independent
// defects: the wrong currency was requested, and the answer wasn't labelled.
//
// The contract now: quotes are requested in, and stamped with, the currency of
// the BOOKING itself. USD -> USD, BRL -> BRL, EUR -> EUR.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGoogleHotelsResults } from './serpApi.js';
import { parseNuiteeRates } from './nuiteeRates.js';

const usdBooking = {
  hotelName: 'Hôtel Juliana Cannes',
  checkinDate: '2026-08-06',
  checkoutDate: '2026-08-24',
  roomType: 'Deluxe Room',
  originalPrice: 7618.88,
  currency: 'USD',
};

// Google Hotels property-detail-page shape: a single hotel carrying per-vendor
// prices (what the token lookup returns for an exact match).
const serpResponse = {
  type: 'hotel',
  name: 'Hôtel Juliana Cannes',
  overall_rating: 4.1,
  reviews: 609,
  featured_prices: [{
    source: 'Booking.com',
    link: 'https://www.booking.com/hotel/fr/juliana.html',
    official: false,
    rate_per_night: { extracted_lowest: 389 },
    total_rate: { extracted_lowest: 7002 },
  }],
};

test('SerpApi quotes are stamped with the requested currency, not left blank', () => {
  const results = parseGoogleHotelsResults(serpResponse, 7618.88, usdBooking, 'USD');
  assert.ok(results.length > 0, 'expected at least one parsed quote');
  for (const r of results) {
    assert.equal(r.currency, 'USD');
  }
});

test('SerpApi quote currency follows the booking, never a hardcoded BRL', () => {
  const eurBooking = { ...usdBooking, currency: 'EUR' };
  const results = parseGoogleHotelsResults(serpResponse, 7618.88, eurBooking, 'EUR');
  assert.ok(results.length > 0);
  assert.equal(results[0].currency, 'EUR');
});

test('SerpApi falls back to the booking currency when none is passed', () => {
  // Guards the path where a caller forgets to thread the currency through:
  // it must degrade to the booking's own currency, not to BRL.
  const results = parseGoogleHotelsResults(serpResponse, 7618.88, usdBooking);
  assert.ok(results.length > 0);
  assert.equal(results[0].currency, 'USD');
});

test('Nuitée quotes are stamped with the booking currency', () => {
  const liteApiResponse = {
    data: [{
      hotelId: 'lp999',
      roomTypes: [{
        rates: [{
          name: 'Deluxe Room',
          retailRate: { total: [{ amount: 7002, currency: 'USD' }] },
          cancellationPolicies: { refundableTag: 'RFN' },
        }],
      }],
    }],
  };
  const [r] = parseNuiteeRates(liteApiResponse, usdBooking, 'USD');
  assert.equal(r.currency, 'USD');

  // And without an explicit currency it must still follow the booking.
  const [fallback] = parseNuiteeRates(liteApiResponse, usdBooking);
  assert.equal(fallback.currency, 'USD');
});
