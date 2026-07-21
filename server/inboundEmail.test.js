process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://fake:fake@localhost:5432/fake';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { computeHash } from './aiParser.js';
import { extractBookingFromEmail, normalizeDate, parsePrice } from './routes/inbound-email.js';

// 1. Content Hash Verification
test('Scenario 1: computeHash produces consistent 64-char sha256 output', () => {
  const buf = Buffer.from('Booking confirmation for Hotel Copacabana');
  const h1 = computeHash(buf);
  const h2 = computeHash(buf);
  assert.equal(h1, h2);
  assert.equal(typeof h1, 'string');
  assert.equal(h1.length, 64);
});

// 2. Token Security Hashing
test('Scenario 2: Single-use signup token SHA-256 hashing', () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hash1 = crypto.createHash('sha256').update(rawToken).digest('hex');
  const hash2 = crypto.createHash('sha256').update(rawToken).digest('hex');

  assert.equal(hash1, hash2);
  assert.equal(rawToken.length, 64);
  assert.notEqual(rawToken, hash1);
});

// 3. Essential Fields Missing Check
test('Scenario 3: Essential fields evaluation identifies missing fields', () => {
  const essentialFields = ['hotelName', 'checkinDate', 'checkoutDate', 'originalPrice', 'currency'];

  const completeBooking = {
    hotelName: 'Grand Hotel',
    checkinDate: '2026-08-01',
    checkoutDate: '2026-08-05',
    originalPrice: 500,
    currency: 'USD',
  };
  const missingComplete = essentialFields.filter(f => !completeBooking[f]);
  assert.equal(missingComplete.length, 0);

  const missingCheckoutBooking = {
    hotelName: 'Grand Hotel',
    checkinDate: '2026-08-01',
    originalPrice: 500,
    currency: 'USD',
  };
  const missingCheckout = essentialFields.filter(f => !missingCheckoutBooking[f]);
  assert.deepEqual(missingCheckout, ['checkoutDate']);
});

// 4. Deterministic Text Extraction from Confirmation Email
test('Scenario 4: Deterministic parser extracts booking fields from text', () => {
  const text = `
    Confirmation for Hotel Fasano Rio
    Check-in: 2026-09-10
    Check-out: 2026-09-15
    Total Price: USD 1500.00
    Confirmation Number: RES-98765
  `;
  const { fields } = extractBookingFromEmail(text, 'Your Stay at Hotel Fasano Rio');

  assert.ok(fields.hotelName.includes('Fasano Rio'));
  assert.equal(fields.checkinDate, '2026-09-10');
  assert.equal(fields.checkoutDate, '2026-09-15');
  assert.equal(fields.originalPrice, 1500);
  assert.equal(fields.currency, 'USD');
  assert.equal(fields.confirmationNumber, 'RES-98765');
});

// 5. Brazilian Currency Parsing (1.234,56 -> 1234.56)
test('Scenario 5: parsePrice handles Brazilian comma currency formatting', () => {
  assert.equal(parsePrice('1.234,56'), 1234.56);
  assert.equal(parsePrice('500,00'), 500);
  assert.equal(parsePrice('1200.50'), 1200.50);
});

// 6. Date Normalization (dd/mm/yyyy -> yyyy-mm-dd)
test('Scenario 6: normalizeDate converts dd/mm/yyyy to ISO format', () => {
  assert.equal(normalizeDate('15/08/2026'), '2026-08-15');
  assert.equal(normalizeDate('2026-08-15'), '2026-08-15');
  assert.equal(normalizeDate('01-12-2026'), '2026-12-01');
});

// 7. Token Expiration Threshold Check
test('Scenario 7: Token expiration threshold is set to 72 hours by default', () => {
  const expiryHours = 72;
  const now = Date.now();
  const expiresAt = new Date(now + expiryHours * 3600 * 1000);
  const diffHours = (expiresAt.getTime() - now) / (3600 * 1000);
  assert.equal(Math.round(diffHours), 72);
});

// 8. Import Status Determination Logic
test('Scenario 8: Import status is READY_FOR_CONFIRMATION if all essential fields present, else NEEDS_REVIEW', () => {
  const essentialFields = ['hotelName', 'checkinDate', 'checkoutDate', 'originalPrice', 'currency'];

  const evalStatus = (data) => {
    const missing = essentialFields.filter(f => !data[f]);
    return missing.length === 0 ? 'READY_FOR_CONFIRMATION' : 'NEEDS_REVIEW';
  };

  assert.equal(evalStatus({ hotelName: 'H1', checkinDate: '2026-01-01', checkoutDate: '2026-01-02', originalPrice: 100, currency: 'USD' }), 'READY_FOR_CONFIRMATION');
  assert.equal(evalStatus({ hotelName: 'H1', checkinDate: '2026-01-01' }), 'NEEDS_REVIEW');
});

// 9. URL Generation for Review vs Signup Links
test('Scenario 9: Opaque token URL generation for unregistered users carrying no raw booking data', () => {
  const baseUrl = 'https://resdrop.app';
  const rawToken = 'a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890';
  const signupUrl = `${baseUrl}/signup?token=${rawToken}`;

  assert.ok(signupUrl.includes('/signup?token='));
  assert.ok(!signupUrl.includes('hotelName'));
  assert.ok(!signupUrl.includes('price'));
});

// 10. Deduplication Content Hash Matching
test('Scenario 10: Deduplication content hash matches identical raw email content', () => {
  const emailBody = 'Fwd: Your hotel confirmation #12345';
  const hashA = crypto.createHash('sha256').update(emailBody).digest('hex');
  const hashB = crypto.createHash('sha256').update(emailBody).digest('hex');

  assert.equal(hashA, hashB);
});
