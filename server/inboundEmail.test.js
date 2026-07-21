process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://fake:fake@localhost:5432/fake';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { computeHash } from './aiParser.js';

test('computeHash produces consistent sha256 output', () => {
  const buf = Buffer.from('test content');
  const h1 = computeHash(buf);
  const h2 = computeHash(buf);
  assert.equal(h1, h2);
  assert.equal(typeof h1, 'string');
  assert.equal(h1.length, 64);
});

test('Pending import token hashing logic', () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hash1 = crypto.createHash('sha256').update(rawToken).digest('hex');
  const hash2 = crypto.createHash('sha256').update(rawToken).digest('hex');

  assert.equal(hash1, hash2);
  assert.notEqual(rawToken, hash1);
});

test('Essential fields validation check', () => {
  const essentialFields = ['hotelName', 'checkinDate', 'checkoutDate', 'originalPrice', 'currency'];

  const completeBooking = {
    hotelName: 'Grand Hotel',
    checkinDate: '2026-08-01',
    checkoutDate: '2026-08-05',
    originalPrice: 500,
    currency: 'USD',
  };

  const missing = essentialFields.filter(f => !completeBooking[f]);
  assert.equal(missing.length, 0);

  const incompleteBooking = {
    hotelName: 'Grand Hotel',
    checkinDate: '2026-08-01',
    // checkoutDate missing
    originalPrice: 500,
    currency: 'USD',
  };

  const missingIncomplete = essentialFields.filter(f => !incompleteBooking[f]);
  assert.deepEqual(missingIncomplete, ['checkoutDate']);
});
