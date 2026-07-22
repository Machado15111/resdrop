import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createImportResult,
  buildImportResult,
  validateImportResult,
  normalizeBookingFields,
  IMPORT_STATUS,
} from './importResult.js';
import {
  extractGenericFields,
  extractBookingFromSource,
  normalizeDate,
  parsePrice,
  parseCurrency,
} from './extractors/index.js';

/**
 * Regression tests for the contract-boundary + extractor bugs found reviewing
 * Antigravity's implementation. Each test names the concrete defect it locks down.
 */

// ─── Contract: booking.id must survive (was stripped → navigate to /bookings/undefined) ──
test('contract preserves booking identity fields (id/status/email)', () => {
  const r = createImportResult({
    source: 'pdf_upload',
    status: IMPORT_STATUS.ACTIVE_MONITORING,
    booking: {
      id: 'bk_123',
      hotelName: 'Grand Plaza',
      checkinDate: '2026-12-25',
      checkoutDate: '2026-12-28',
      originalPrice: 1200,
      currency: 'BRL',
      status: 'monitoring',
      email: 'guest@example.com',
    },
  });
  assert.equal(r.booking.id, 'bk_123', 'booking.id must be preserved for frontend navigation');
  assert.equal(r.booking.status, 'monitoring');
  assert.equal(r.booking.email, 'guest@example.com');
  assert.equal(r.booking.hotelName, 'Grand Plaza');
});

// ─── Contract: documentId/importId passed via `extra` must surface at top level ──
test('contract surfaces documentId/importId passed through `extra`', () => {
  const r = createImportResult({
    source: 'pdf_upload',
    status: IMPORT_STATUS.NEEDS_INFORMATION,
    booking: { hotelName: 'X' },
    extra: { documentId: 'doc_9', importId: 'imp_9' },
  });
  assert.equal(r.documentId, 'doc_9', 'documentId from extra must be exposed (DocumentUpload reads data.documentId)');
  assert.equal(r.importId, 'imp_9');
});

// ─── Contract: `extractedData` legacy mirror present (review pre-fill) ──
test('contract emits extractedData mirror for legacy consumers', () => {
  const r = createImportResult({
    source: 'pdf_upload',
    status: IMPORT_STATUS.NEEDS_INFORMATION,
    booking: { hotelName: 'Hotel Vitória', checkinDate: '2026-01-10' },
  });
  assert.equal(r.extractedData.hotelName, 'Hotel Vitória');
  assert.equal(r.extractedData.checkinDate, '2026-01-10');
});

// ─── Contract: numeric attachmentsProcessed keeps its count, array shape intact ──
test('contract keeps attachment count when a number is passed', () => {
  const r = createImportResult({
    source: 'inbound_email',
    status: IMPORT_STATUS.NEEDS_INFORMATION,
    booking: {},
    attachmentsProcessed: 3,
  });
  assert.ok(Array.isArray(r.attachmentsProcessed), 'contract shape stays an array');
  assert.equal(r.attachmentsProcessedCount, 3, 'the count must not be silently lost');
});

// ─── Contract: validator passes valid results and throws on drift ──
test('validateImportResult accepts a well-formed result', () => {
  const r = buildImportResult({ source: 'email', booking: {}, status: IMPORT_STATUS.FAILED, success: false });
  assert.doesNotThrow(() => validateImportResult(r));
});

test('validateImportResult throws on an invalid status', () => {
  const bad = {
    success: true, source: 'email', booking: {}, hotel: null,
    missingFields: [], warnings: [], attachmentsProcessed: [], status: 'NONSENSE',
  };
  assert.throws(() => validateImportResult(bad), /contract violation/i);
});

// ─── normalizeBookingFields: strips arbitrary regex noise but keeps identity ──
test('normalizeBookingFields drops unknown keys, keeps canonical + identity', () => {
  const out = normalizeBookingFields({
    hotelName: 'H', junkField: 'DROP ME', id: 'bk_1', totalPrice: 500,
  });
  assert.equal(out.hotelName, 'H');
  assert.equal(out.id, 'bk_1');
  assert.equal(out.originalPrice, 500, 'totalPrice alias maps to originalPrice');
  assert.ok(!('junkField' in out), 'arbitrary keys must be dropped');
});

// ─── Extractor: nested .eml fields must MERGE (were stringified then re-regexed) ──
test('extractBookingFromSource merges nested .eml structured fields', async () => {
  const eml = [
    'From: hotel@example.com',
    'To: guest@example.com',
    'Subject: Booking Confirmation',
    'Content-Type: text/plain; charset=utf-8',
    '',
    'Hotel: Grand Plaza',
    'Check-in: 25/12/2026',
    'Check-out: 28/12/2026',
    'Total: R$ 1.200,00',
    'Confirmation: ABC12345',
  ].join('\r\n');

  const res = await extractBookingFromSource({
    text: '',
    attachments: [{ filename: 'original.eml', contentType: 'message/rfc822', content: Buffer.from(eml) }],
  });

  assert.equal(res.fields.checkinDate, '2026-12-25', 'nested eml check-in must be merged, not mangled');
  assert.equal(res.fields.checkoutDate, '2026-12-28');
  assert.equal(res.fields.currency, 'BRL', 'currency BRL came from the nested email → proves real merge');
  assert.match(res.fields.hotelName, /Grand Plaza/);
  assert.equal(res.attachmentsProcessed, 1);
});

// ─── Extractor: destination/city now extracted (feeds Nuitée matching) ──
test('extractGenericFields extracts destination and city', () => {
  const { fields } = extractGenericFields('Destino: Rio de Janeiro\nHotel: Copacabana Palace\nCheck-in: 01/02/2026');
  assert.equal(fields.destination, 'Rio de Janeiro');
  assert.equal(fields.city, 'Rio de Janeiro');
});

// ─── Extractor: deterministic date/price/currency normalization sanity ──
test('deterministic normalizers handle BR + ISO formats', () => {
  assert.equal(normalizeDate('25/12/2026'), '2026-12-25');
  assert.equal(normalizeDate('2026-12-25'), '2026-12-25');
  assert.equal(parsePrice('R$ 1.200,00'), 1200);
  assert.equal(parsePrice('1,234.56'), 1234.56);
  assert.equal(parseCurrency('R$ 500'), 'BRL');
  assert.equal(parseCurrency('$500'), 'USD');
});

// ─── Real-world regression: the Ibis Sofia / Fly High agency PDF that extracted nothing ──
test('extracts the Ibis Sofia agency confirmation (month-name dates, brand hotel, ALL-CAPS guest)', () => {
  // Text as pdf-parse yields it from the real "FLY HIGH" agency voucher.
  const pdfText = [
    'Prepared for Check in Check out',
    'PERVAIZ KHAN Jul 22, 2026 Jul 23, 2026',
    'FLY HIGH',
    'IBIS SOFIA AIRPORT',
    '132 Mimi Balkanska Str, Sofia - BG',
    'Room Details EPS',
    '1 Double Bed views Of The Mountains And City - Free Wifi',
    'Cancellation Policy',
    'Fully refundable before Tue, Jul 21',
    'Reservation Details',
    'IBIS SOFIA AIRPORT - 1 nights',
    'Guest: PERVAIZ KHAN',
    'Check in: Jul 22, 2026',
    'Check out: Jul 23, 2026',
    'Confirmation number: 2514223596',
    'Reservation code: 9102414843077',
    'Important Information:',
    'Check-in: 3:00 PM - anytime.',
  ].join('\n');

  const { fields } = extractGenericFields(pdfText);

  assert.match(fields.hotelName, /IBIS SOFIA AIRPORT/i, `hotel name must be extracted, got: ${fields.hotelName}`);
  assert.equal(fields.checkinDate, '2026-07-22', `check-in must parse "Jul 22, 2026", got: ${fields.checkinDate}`);
  assert.equal(fields.checkoutDate, '2026-07-23', `check-out must parse "Jul 23, 2026", got: ${fields.checkoutDate}`);
  assert.equal(fields.guestName, 'PERVAIZ KHAN', `ALL-CAPS guest must be extracted, got: ${fields.guestName}`);
  assert.equal(fields.confirmationNumber, '2514223596');
});

// ─── Extractor: conflicting values across sources produce a warning ──
test('extractBookingFromSource flags conflicting values from a nested .eml', async () => {
  const conflictingEml = [
    'Subject: Voucher',
    'Content-Type: text/plain; charset=utf-8',
    '',
    'Hotel: Beach Resort',
    'Check-in: 15/01/2026', // disagrees with the body below
  ].join('\r\n');

  const res = await extractBookingFromSource({
    text: 'Hotel: Beach Resort\nCheck-in: 10/01/2026\nCheck-out: 12/01/2026\nTotal: USD 400',
    attachments: [{ filename: 'voucher.eml', contentType: 'message/rfc822', content: Buffer.from(conflictingEml) }],
  });

  // Body value is kept; the conflicting attachment is surfaced as a warning, not silently dropped.
  assert.equal(res.fields.checkinDate, '2026-01-10');
  assert.ok(
    res.warnings.some(w => /conflicting value for field "checkinDate"/i.test(w)),
    `expected a checkinDate conflict warning, got: ${JSON.stringify(res.warnings)}`,
  );
});
