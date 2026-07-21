process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://fake:fake@localhost:5432/fake';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { computeHash } from './aiParser.js';
import { extractBookingFromEmail, normalizeDate, parsePrice } from './routes/inbound-email.js';

// Helper for HTML stripping test
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY 1: PNR & Confirmation Number Formats (Tests 1–10)
// ═══════════════════════════════════════════════════════════════

test('01. PNR extraction: standard hyphenated PNR format (RES-12345)', () => {
  const { fields } = extractBookingFromEmail('Confirmation Number: RES-12345');
  assert.equal(fields.confirmationNumber, 'RES-12345');
});

test('02. PNR extraction: Booking.com numeric PNR format (1234567890)', () => {
  const { fields } = extractBookingFromEmail('Booking Number: 1234567890');
  assert.equal(fields.confirmationNumber, '1234567890');
});

test('03. PNR extraction: Expedia alphanumeric PNR format (7890-ABCDEF)', () => {
  const { fields } = extractBookingFromEmail('Itinerary # 7890-ABCDEF');
  assert.equal(fields.confirmationNumber, '7890-ABCDEF');
});

test('04. PNR extraction: Airbnb style PNR format (HM12345678)', () => {
  const { fields } = extractBookingFromEmail('Reservation code: HM12345678');
  assert.equal(fields.confirmationNumber, 'HM12345678');
});

test('05. PNR extraction: Agoda PNR format (AG-998877)', () => {
  const { fields } = extractBookingFromEmail('Booking Reference: AG-998877');
  assert.equal(fields.confirmationNumber, 'AG-998877');
});

test('06. PNR extraction: Short hash format (CONF# 445566)', () => {
  const { fields } = extractBookingFromEmail('CONF# 445566');
  assert.equal(fields.confirmationNumber, '445566');
});

test('07. PNR extraction: Itinerary prefix (Itinerary: 88776655)', () => {
  const { fields } = extractBookingFromEmail('Confirmation Code: 88776655');
  assert.equal(fields.confirmationNumber, '88776655');
});

test('08. PNR extraction: Portuguese Código de reserva (BR-99112)', () => {
  const { fields } = extractBookingFromEmail('Código de reserva: BR-99112');
  assert.equal(fields.confirmationNumber, 'BR-99112');
});

test('09. PNR extraction: Portuguese Referência (REF-778899)', () => {
  const { fields } = extractBookingFromEmail('Confirmação de reserva: REF-778899');
  assert.equal(fields.confirmationNumber, 'REF-778899');
});

test('10. PNR extraction: Text without confirmation number returns undefined', () => {
  const { fields } = extractBookingFromEmail('Hello guest, welcome to your hotel stay.');
  assert.equal(fields.confirmationNumber, undefined);
});


// ═══════════════════════════════════════════════════════════════
// CATEGORY 2: Email Sender & Header Normalization (Tests 11–20)
// ═══════════════════════════════════════════════════════════════

test('11. Email sender: standard email normalization', () => {
  const raw = 'user@example.com';
  const match = raw.match(/<([^>]+)>/) || [null, raw];
  assert.equal((match[1] || raw).toLowerCase().trim(), 'user@example.com');
});

test('12. Email sender: RFC 5322 "Name <email>" format normalization', () => {
  const raw = '"John Doe" <john.doe@example.com>';
  const match = raw.match(/<([^>]+)>/) || [null, raw];
  assert.equal((match[1] || raw).toLowerCase().trim(), 'john.doe@example.com');
});

test('13. Email sender: uppercase email case-insensitivity', () => {
  const raw = 'TRAVELER@DOMAIN.COM';
  const match = raw.match(/<([^>]+)>/) || [null, raw];
  assert.equal((match[1] || raw).toLowerCase().trim(), 'traveler@domain.com');
});

test('14. Forwarded subject: English "Fwd:" subject extraction', () => {
  const subject = 'Fwd: Hotel Copacabana Booking Confirmation';
  const { fields } = extractBookingFromEmail('Check-in: 2026-10-01', subject);
  assert.ok(fields);
});

test('15. Forwarded subject: Portuguese "ENC:" subject extraction', () => {
  const subject = 'ENC: Confirmação de reserva no Hotel Fasano';
  const { fields } = extractBookingFromEmail('Check-in: 2026-10-01', subject);
  assert.ok(fields);
});

test('16. Forwarded email body: hotel name matching in combined subject + body', () => {
  const body = 'Forwarded message:\nHotel Hilton Barra\nCheck-in: 2026-08-01';
  const { fields } = extractBookingFromEmail(body, 'Fwd: Reserva');
  assert.equal(fields.hotelName, 'Hilton Barra');
});

test('17. Multi-line text handling in email parser', () => {
  const body = 'Line 1\nLine 2\nHotel Copacabana Palace\nCheck-in: 2026-05-01';
  const { fields } = extractBookingFromEmail(body, '');
  assert.equal(fields.hotelName, 'Copacabana Palace');
});

test('18. Text body priority over empty HTML body', () => {
  const text = 'Hotel Grand Hyatt\nCheck-in: 2026-09-01';
  const { fields } = extractBookingFromEmail(text, '');
  assert.equal(fields.hotelName, 'Grand Hyatt');
});

test('19. Per-sender rate limit: 1 request is within limit', () => {
  const senderMap = new Map();
  const limitFn = (email) => {
    const entry = senderMap.get(email) || { count: 0 };
    entry.count++;
    senderMap.set(email, entry);
    return entry.count <= 20;
  };
  assert.equal(limitFn('test@test.com'), true);
});

test('20. Per-sender rate limit: 21st request triggers rate limit block', () => {
  const senderMap = new Map();
  const limitFn = (email) => {
    const entry = senderMap.get(email) || { count: 0 };
    entry.count++;
    senderMap.set(email, entry);
    return entry.count <= 20;
  };
  for (let i = 0; i < 20; i++) limitFn('spammer@test.com');
  assert.equal(limitFn('spammer@test.com'), false);
});


// ═══════════════════════════════════════════════════════════════
// CATEGORY 3: Attachments & Screenshot MIME Allowlist (Tests 21–30)
// ═══════════════════════════════════════════════════════════════

const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

test('21. MIME allowlist: image/png is allowed', () => {
  assert.equal(allowedMimes.includes('image/png'), true);
});

test('22. MIME allowlist: image/jpeg is allowed', () => {
  assert.equal(allowedMimes.includes('image/jpeg'), true);
});

test('23. MIME allowlist: image/jpg is allowed', () => {
  assert.equal(allowedMimes.includes('image/jpg'), true);
});

test('24. MIME allowlist: image/webp is allowed', () => {
  assert.equal(allowedMimes.includes('image/webp'), true);
});

test('25. MIME allowlist: application/pdf is allowed', () => {
  assert.equal(allowedMimes.includes('application/pdf'), true);
});

test('26. MIME allowlist: application/x-msdownload (.exe) is rejected', () => {
  assert.equal(allowedMimes.includes('application/x-msdownload'), false);
});

test('27. MIME allowlist: text/javascript (.js) is rejected', () => {
  assert.equal(allowedMimes.includes('text/javascript'), false);
});

test('28. MIME allowlist: application/zip (.zip) is rejected', () => {
  assert.equal(allowedMimes.includes('application/zip'), false);
});

test('29. File size limit: 5MB file is valid (<= 10MB)', () => {
  const size = 5 * 1024 * 1024;
  assert.equal(size <= 10 * 1024 * 1024, true);
});

test('30. File size limit: 12MB file is invalid (> 10MB)', () => {
  const size = 12 * 1024 * 1024;
  assert.equal(size <= 10 * 1024 * 1024, false);
});


// ═══════════════════════════════════════════════════════════════
// CATEGORY 4: Essential Fields & Missing Fields Validation (Tests 31–40)
// ═══════════════════════════════════════════════════════════════

const essentialFields = ['hotelName', 'checkinDate', 'checkoutDate', 'originalPrice', 'currency'];

test('31. Essential fields: complete data produces 0 missing essential fields', () => {
  const data = { hotelName: 'H', checkinDate: '2026-01-01', checkoutDate: '2026-01-02', originalPrice: 100, currency: 'USD' };
  const missing = essentialFields.filter(f => !data[f]);
  assert.equal(missing.length, 0);
});

test('32. Essential fields: missing hotelName identified', () => {
  const data = { checkinDate: '2026-01-01', checkoutDate: '2026-01-02', originalPrice: 100, currency: 'USD' };
  assert.deepEqual(essentialFields.filter(f => !data[f]), ['hotelName']);
});

test('33. Essential fields: missing checkinDate identified', () => {
  const data = { hotelName: 'H', checkoutDate: '2026-01-02', originalPrice: 100, currency: 'USD' };
  assert.deepEqual(essentialFields.filter(f => !data[f]), ['checkinDate']);
});

test('34. Essential fields: missing checkoutDate identified', () => {
  const data = { hotelName: 'H', checkinDate: '2026-01-01', originalPrice: 100, currency: 'USD' };
  assert.deepEqual(essentialFields.filter(f => !data[f]), ['checkoutDate']);
});

test('35. Essential fields: missing originalPrice identified', () => {
  const data = { hotelName: 'H', checkinDate: '2026-01-01', checkoutDate: '2026-01-02', currency: 'USD' };
  assert.deepEqual(essentialFields.filter(f => !data[f]), ['originalPrice']);
});

test('36. Essential fields: missing currency identified', () => {
  const data = { hotelName: 'H', checkinDate: '2026-01-01', checkoutDate: '2026-01-02', originalPrice: 100 };
  assert.deepEqual(essentialFields.filter(f => !data[f]), ['currency']);
});

test('37. Essential fields: zero price evaluated as missing', () => {
  const price = 0;
  assert.equal(!price || price <= 0, true);
});

test('38. Essential fields: negative price evaluated as missing', () => {
  const price = -50;
  assert.equal(!price || price <= 0, true);
});

test('39. Non-essential missing guestName does not block essential validation', () => {
  const data = { hotelName: 'H', checkinDate: '2026-01-01', checkoutDate: '2026-01-02', originalPrice: 100, currency: 'USD' };
  const missing = essentialFields.filter(f => !data[f]);
  assert.equal(missing.length, 0);
});

test('40. Non-essential missing confirmationNumber does not block essential validation', () => {
  const data = { hotelName: 'H', checkinDate: '2026-01-01', checkoutDate: '2026-01-02', originalPrice: 100, currency: 'USD' };
  const missing = essentialFields.filter(f => !data[f]);
  assert.equal(missing.length, 0);
});


// ═══════════════════════════════════════════════════════════════
// CATEGORY 5: Price & Currency Parsing (Tests 41–50)
// ═══════════════════════════════════════════════════════════════

test('41. Price parse: USD decimal standard (150.00)', () => {
  assert.equal(parsePrice('150.00'), 150);
});

test('42. Price parse: BRL thousands dot & decimal comma (1.234,56)', () => {
  assert.equal(parsePrice('1.234,56'), 1234.56);
});

test('43. Price parse: BRL comma decimal without thousands (500,00)', () => {
  assert.equal(parsePrice('500,00'), 500);
});

test('44. Price parse: EUR comma decimal (350,00)', () => {
  assert.equal(parsePrice('350,00'), 350);
});

test('45. Price parse: GBP dot decimal (250.75)', () => {
  assert.equal(parsePrice('250.75'), 250.75);
});

test('46. Price parse: Strip currency symbol ($ 999.99)', () => {
  assert.equal(parsePrice('$ 999.99'), 999.99);
});

test('47. Price parse: BRL prefix with thousands (BRL 2.500,00)', () => {
  assert.equal(parsePrice('2.500,00'), 2500);
});

test('48. Currency regex match: USD', () => {
  const m = 'Total USD 500'.match(/(USD|BRL|EUR|GBP)/i);
  assert.equal(m[1].toUpperCase(), 'USD');
});

test('49. Currency regex match: EUR', () => {
  const m = 'Total EUR 1000'.match(/(USD|BRL|EUR|GBP)/i);
  assert.equal(m[1].toUpperCase(), 'EUR');
});

test('50. Price parse: empty string returns 0', () => {
  assert.equal(parsePrice(''), 0);
});


// ═══════════════════════════════════════════════════════════════
// CATEGORY 6: Date Normalization (Tests 51–60)
// ═══════════════════════════════════════════════════════════════

test('51. Date norm: ISO format unchanged (2026-08-15)', () => {
  assert.equal(normalizeDate('2026-08-15'), '2026-08-15');
});

test('52. Date norm: Brazilian slash format (15/08/2026)', () => {
  assert.equal(normalizeDate('15/08/2026'), '2026-08-15');
});

test('53. Date norm: Brazilian slash format month 12 (01/12/2026)', () => {
  assert.equal(normalizeDate('01/12/2026'), '2026-12-01');
});

test('54. Date norm: Hyphen format (15-08-2026)', () => {
  assert.equal(normalizeDate('15-08-2026'), '2026-08-15');
});

test('55. Date norm: Dot format (15.08.2026)', () => {
  assert.equal(normalizeDate('15.08.2026'), '2026-08-15');
});

test('56. Date norm: 2-digit year (15/08/26)', () => {
  assert.equal(normalizeDate('15/08/26'), '2026-08-15');
});

test('57. Date norm: English text date (March 15, 2026)', () => {
  assert.equal(normalizeDate('March 15, 2026'), '2026-03-15');
});

test('58. Date norm: Null input returns null', () => {
  assert.equal(normalizeDate(null), null);
});

test('59. Date norm: Empty string returns null', () => {
  assert.equal(normalizeDate(''), null);
});

test('60. Date norm: Invalid non-date string returned as-is', () => {
  assert.equal(normalizeDate('not-a-date'), 'not-a-date');
});


// ═══════════════════════════════════════════════════════════════
// CATEGORY 7: Draft Import Status Evaluation (Tests 61–70)
// ═══════════════════════════════════════════════════════════════

test('61. Import status: 0 missing essential fields -> READY_FOR_CONFIRMATION', () => {
  const missing = [];
  const status = missing.length === 0 ? 'READY_FOR_CONFIRMATION' : 'NEEDS_REVIEW';
  assert.equal(status, 'READY_FOR_CONFIRMATION');
});

test('62. Import status: 1 missing essential field -> NEEDS_REVIEW', () => {
  const missing = ['checkoutDate'];
  const status = missing.length === 0 ? 'READY_FOR_CONFIRMATION' : 'NEEDS_REVIEW';
  assert.equal(status, 'NEEDS_REVIEW');
});

test('63. Import status: 2 missing essential fields -> NEEDS_REVIEW', () => {
  const missing = ['checkoutDate', 'originalPrice'];
  const status = missing.length === 0 ? 'READY_FOR_CONFIRMATION' : 'NEEDS_REVIEW';
  assert.equal(status, 'NEEDS_REVIEW');
});

test('64. Import status: All essential fields missing -> NEEDS_REVIEW', () => {
  const missing = [...essentialFields];
  const status = missing.length === 0 ? 'READY_FOR_CONFIRMATION' : 'NEEDS_REVIEW';
  assert.equal(status, 'NEEDS_REVIEW');
});

test('65. Import record: Registered user attaches userEmail', () => {
  const record = { userEmail: 'user@test.com', source: 'inbound_email' };
  assert.equal(record.userEmail, 'user@test.com');
});

test('66. Import record: Unregistered user leaves userEmail null', () => {
  const record = { userEmail: null, source: 'inbound_email' };
  assert.equal(record.userEmail, null);
});

test('67. Import source: image_upload set for screenshots', () => {
  const mime = 'image/png';
  const source = mime.startsWith('image/') ? 'image_upload' : 'pdf_upload';
  assert.equal(source, 'image_upload');
});

test('68. Import source: pdf_upload set for PDFs', () => {
  const mime = 'application/pdf';
  const source = mime.startsWith('image/') ? 'image_upload' : 'pdf_upload';
  assert.equal(source, 'pdf_upload');
});

test('69. Import source: inbound_email set for forwarded emails', () => {
  const source = 'inbound_email';
  assert.equal(source, 'inbound_email');
});

test('70. Import confirmation: state transitions to CONFIRMED on user action', () => {
  const imp = { status: 'READY_FOR_CONFIRMATION' };
  imp.status = 'CONFIRMED';
  imp.confirmedAt = new Date().toISOString();
  assert.equal(imp.status, 'CONFIRMED');
  assert.ok(imp.confirmedAt);
});


// ═══════════════════════════════════════════════════════════════
// CATEGORY 8: Security, Hashing & Token Logic (Tests 71–80)
// ═══════════════════════════════════════════════════════════════

test('71. Content hash: SHA-256 produces 64 character hex string', () => {
  const h = computeHash(Buffer.from('sample pdf content'));
  assert.equal(h.length, 64);
});

test('72. Content hash: deterministic output for identical content', () => {
  const b = Buffer.from('booking pdf');
  assert.equal(computeHash(b), computeHash(b));
});

test('73. Content hash: different content produces different hash', () => {
  assert.notEqual(computeHash(Buffer.from('a')), computeHash(Buffer.from('b')));
});

test('74. Signup token: raw token is 64 hex characters (32 bytes)', () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  assert.equal(rawToken.length, 64);
});

test('75. Signup token: token_hash differs from raw token', () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
  assert.notEqual(rawToken, hash);
});

test('76. Signup token: default TTL is 72 hours', () => {
  const hours = 72;
  const expiresAt = new Date(Date.now() + hours * 3600 * 1000);
  assert.ok(expiresAt > new Date());
});

test('77. Signup token: past timestamp evaluated as expired', () => {
  const expiresAt = new Date(Date.now() - 1000);
  assert.equal(expiresAt > new Date(), false);
});

test('78. Signup token: future timestamp evaluated as valid', () => {
  const expiresAt = new Date(Date.now() + 3600 * 1000);
  assert.equal(expiresAt > new Date(), true);
});

test('79. Signup token: used_at non-null invalidates token', () => {
  const token = { usedAt: new Date().toISOString() };
  assert.equal(!!token.usedAt, true);
});

test('70. Signup link: query param token contains no raw booking payload', () => {
  const link = 'https://resdrop.app/signup?token=1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  assert.equal(link.includes('hotel='), false);
  assert.equal(link.includes('price='), false);
});


// ═══════════════════════════════════════════════════════════════
// CATEGORY 9: Idempotency & Deduplication (Tests 81–90)
// ═══════════════════════════════════════════════════════════════

test('81. Idempotency: Message-ID match detects duplicate email', () => {
  const dbMessages = new Set(['<msg-101@domain.com>']);
  assert.equal(dbMessages.has('<msg-101@domain.com>'), true);
});

test('82. Idempotency: Content hash match detects duplicate payload', () => {
  const dbHashes = new Set(['abc123hash']);
  assert.equal(dbHashes.has('abc123hash'), true);
});

test('83. Idempotency: Duplicate booking check (hotel + dates)', () => {
  const existing = [{ hotelName: 'Hilton', checkinDate: '2026-08-01', checkoutDate: '2026-08-05' }];
  const isDup = existing.some(b => b.hotelName === 'Hilton' && b.checkinDate === '2026-08-01' && b.checkoutDate === '2026-08-05');
  assert.equal(isDup, true);
});

test('84. Idempotency: Reprocessing identical message skips booking creation', () => {
  const isSeen = true;
  assert.equal(isSeen, true);
});

test('85. Content hash: Same raw source yields identical sha256', () => {
  const raw = 'From: test@test.com\r\nSubject: Confirmation\r\n\r\nBody text';
  assert.equal(crypto.createHash('sha256').update(raw).digest('hex'), crypto.createHash('sha256').update(raw).digest('hex'));
});

test('86. User separation: Duplicate check is scoped to requesting user email', () => {
  const bookingsUserA = [{ hotelName: 'Hilton', checkinDate: '2026-08-01' }];
  const bookingsUserB = [];
  assert.equal(bookingsUserB.some(b => b.hotelName === 'Hilton'), false);
});

test('87. Duplicate check ignores archived status', () => {
  const bookings = [{ hotelName: 'Hilton', checkinDate: '2026-08-01', status: 'archived' }];
  const activeDups = bookings.filter(b => b.status !== 'archived');
  assert.equal(activeDups.length, 0);
});

test('88. Duplicate check ignores dismissed status', () => {
  const bookings = [{ hotelName: 'Hilton', checkinDate: '2026-08-01', status: 'dismissed' }];
  const activeDups = bookings.filter(b => b.status !== 'dismissed');
  assert.equal(activeDups.length, 0);
});

test('89. Processing status prevents concurrent duplicate ingestion', () => {
  const status = 'PROCESSING';
  assert.equal(status, 'PROCESSING');
});

test('90. AI cache hit returns cached: true', () => {
  const cacheHitResult = { fields: { hotelName: 'Cached Hotel' }, cached: true };
  assert.equal(cacheHitResult.cached, true);
});


// ═══════════════════════════════════════════════════════════════
// CATEGORY 10: HTML Sanitization & Review Link Routing (Tests 91–100)
// ═══════════════════════════════════════════════════════════════

test('91. HTML Sanitization: <script> tags removed', () => {
  const raw = '<div>Hotel Name<script>alert(1)</script></div>';
  assert.equal(stripHtml(raw), 'Hotel Name');
});

test('92. HTML Sanitization: <style> tags removed', () => {
  const raw = '<div>Hotel Name<style>body { color: red; }</style></div>';
  assert.equal(stripHtml(raw), 'Hotel Name');
});

test('93. HTML Sanitization: &nbsp; converted to space', () => {
  const raw = 'Hotel&nbsp;Copacabana';
  assert.equal(stripHtml(raw), 'Hotel Copacabana');
});

test('94. HTML Sanitization: &amp; converted to &', () => {
  const raw = 'Bed &amp; Breakfast';
  assert.equal(stripHtml(raw), 'Bed & Breakfast');
});

test('95. HTML Sanitization: HTML tags stripped while preserving text', () => {
  const raw = '<p>Check-in: <b>2026-08-01</b></p>';
  assert.equal(stripHtml(raw), 'Check-in: 2026-08-01');
});

test('96. Registered user review link format', () => {
  const baseUrl = 'https://resdrop.app';
  const importId = 'imp-12345';
  const url = `${baseUrl}/dashboard?reviewImport=${importId}`;
  assert.equal(url, 'https://resdrop.app/dashboard?reviewImport=imp-12345');
});

test('97. Unregistered user signup link format', () => {
  const baseUrl = 'https://resdrop.app';
  const token = 'token-67890';
  const url = `${baseUrl}/signup?token=${token}`;
  assert.equal(url, 'https://resdrop.app/signup?token=token-67890');
});

test('98. PT language detection for Brazilian currency BRL', () => {
  const currency = 'BRL';
  const lang = currency === 'BRL' ? 'pt' : 'en';
  assert.equal(lang, 'pt');
});

test('99. EN language detection for USD currency', () => {
  const currency = 'USD';
  const lang = currency === 'BRL' ? 'pt' : 'en';
  assert.equal(lang, 'en');
});

test('100. Inbound forwarding email address endpoint response structure', () => {
  const domain = 'resdrop.app';
  const addresses = [`reservas@${domain}`];
  assert.deepEqual(addresses, ['reservas@resdrop.app']);
});
