import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNuiteeRates } from './nuiteeRates.js';

const booking = {
  hotelName: 'Hotel Fasano Rio de Janeiro',
  checkinDate: '2026-07-26',
  checkoutDate: '2026-07-29', // 3 nights
  roomType: 'Superior Room',
  originalPrice: 4178,
  currency: 'BRL',
};

// Minimal LiteAPI /hotels/rates response shape.
const liteApiResponse = {
  data: [{
    hotelId: 'lp123',
    roomTypes: [{
      rates: [
        { name: 'Superior Room', retailRate: { total: [{ amount: 3600, currency: 'BRL' }] },
          cancellationPolicies: { refundableTag: 'RFN' } },
        { name: 'Superior Room', retailRate: { total: [{ amount: 3900, currency: 'BRL' }] },
          cancellationPolicies: { refundableTag: 'NRFN' } },
      ],
    }],
  }],
};

test('parseNuiteeRates picks the lowest rate and computes per-night + savings', () => {
  const [r] = parseNuiteeRates(liteApiResponse, booking, 'BRL');
  assert.ok(r, 'should return a result');
  assert.equal(r.source, 'Nuitée');
  assert.equal(r.totalPrice, 3600);          // lowest of the two
  assert.equal(r.pricePerNight, 1200);       // 3600 / 3 nights
  assert.equal(r.isExactMatch, true);        // resolved by hotel id
  assert.equal(r.isTrustedSource, true);
  assert.equal(r.roomTypeMatch, true);       // Superior vs Superior
  assert.equal(r.savings, 578);              // 4178 - 3600
  assert.equal(r.hasDrop, true);
  assert.equal(r.freeCancellation, true);    // RFN on the lowest rate
});

test('parseNuiteeRates returns [] for an empty / malformed response', () => {
  assert.deepEqual(parseNuiteeRates({ data: [] }, booking, 'BRL'), []);
  assert.deepEqual(parseNuiteeRates({}, booking, 'BRL'), []);
  assert.deepEqual(parseNuiteeRates(null, booking, 'BRL'), []);
});

test('parseNuiteeRates does not claim savings when room type differs', () => {
  const suiteResp = {
    data: [{ roomTypes: [{ rates: [
      { name: 'Presidential Suite', retailRate: { total: [{ amount: 2000, currency: 'BRL' }] } },
    ] }] }],
  };
  const [r] = parseNuiteeRates(suiteResp, booking, 'BRL');
  assert.equal(r.totalPrice, 2000);
  assert.equal(r.roomTypeMatch, false);      // Suite vs Superior
  assert.equal(r.savings, 0);                // no savings claim on a different product
  assert.equal(r.hasDrop, false);
});
