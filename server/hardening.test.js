import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeDate, parsePrice, parseCurrency, normalizeText, stripQuotedForwardBlocks,
  htmlToText, parseXlsxBuffer, parsePdfBuffer, parseDocxBuffer, runLocalOcr,
  parseIcsOrJson, extractGenericFields, extractBookingFromSource,
} from './extractors/index.js';
import { buildImportResult, normalizeBookingFields, validateImportResult } from './importResult.js';
import { calculateMatchScore } from './enrichment.js';

/**
 * Defensive-hardening suite: each assertion pins a specific error cause that
 * previously could throw, hang, return garbage, or produce an invalid booking.
 */

test('normalizeDate rejects impossible calendar dates', () => {
  assert.equal(normalizeDate('31/02/2026'), null); // Feb 30/31
  assert.equal(normalizeDate('2026-13-01'), null); // month 13
  assert.equal(normalizeDate('2026-00-10'), null); // month 0
  assert.equal(normalizeDate('45/45/2026'), null); // nonsense
  assert.equal(normalizeDate('01/01/1750'), null); // year out of range
});

test('normalizeDate disambiguates US vs BR numeric formats', () => {
  assert.equal(normalizeDate('07/22/2026'), '2026-07-22'); // US MM/DD (22 can't be a month)
  assert.equal(normalizeDate('22/07/2026'), '2026-07-22'); // BR DD/MM (22 can't be a month)
  assert.equal(normalizeDate('05/06/2026'), '2026-06-05'); // ambiguous → BR default
});

test('normalizeDate is safe on non-string / junk / oversized input', () => {
  assert.equal(normalizeDate(null), null);
  assert.equal(normalizeDate(12345), null);
  assert.equal(normalizeDate({}), null);
  assert.equal(normalizeDate('x'.repeat(500)), null);
});

test('parsePrice rejects negative, zero, NaN, and absurd values', () => {
  assert.equal(parsePrice('-50'), null);
  assert.equal(parsePrice('0'), null);
  assert.equal(parsePrice('abc'), null);
  assert.equal(parsePrice(''), null);
  assert.equal(parsePrice('999999999'), null); // above sane ceiling
  assert.equal(parsePrice(null), null);
  assert.equal(parsePrice('R$ 1.200,00'), 1200);
});

test('text helpers never throw on non-string / oversized input', () => {
  assert.equal(normalizeText(null), '');
  assert.equal(normalizeText(42), '');
  assert.equal(stripQuotedForwardBlocks(undefined), '');
  assert.equal(stripQuotedForwardBlocks({}), '');
  assert.equal(htmlToText(null), '');
  assert.doesNotThrow(() => normalizeText('a'.repeat(3_000_000)));
  assert.doesNotThrow(() => htmlToText('<div>' + 'x'.repeat(3_000_000) + '</div>'));
});

test('htmlToText falls back gracefully on broken markup', () => {
  const out = htmlToText('<div><span>Hotel<br>Name</div');
  assert.match(out, /Hotel/);
});

test('parseCurrency defaults safely and detects symbols', () => {
  assert.equal(parseCurrency(null), 'USD');
  assert.equal(parseCurrency('€ 500'), 'EUR');
  assert.equal(parseCurrency('£99'), 'GBP');
});

test('buffer parsers return "" (never throw) on empty/invalid buffers', async () => {
  assert.equal(await parsePdfBuffer(null), '');
  assert.equal(await parsePdfBuffer(Buffer.alloc(0)), '');
  assert.equal(await parseDocxBuffer('not a buffer'), '');
  assert.equal(parseXlsxBuffer(null), '');
  assert.doesNotThrow(() => parseXlsxBuffer(Buffer.from('garbage not a spreadsheet'))); // lenient parse, must not throw
  assert.equal(await runLocalOcr(null), '');
  assert.equal(await runLocalOcr(Buffer.alloc(0)), '');
});

test('parseIcsOrJson is safe on non-string and malformed JSON', () => {
  assert.equal(parseIcsOrJson(null), '');
  assert.equal(parseIcsOrJson(12), '');
  assert.equal(parseIcsOrJson('{ broken json'), '{ broken json'); // returns input, no throw
});

test('occupancy counts are bounded (no 99999-adult poisoning)', () => {
  const { fields } = extractGenericFields('Booking for 99999 adults and 5 children in 2 rooms');
  assert.equal(fields.adults, undefined); // out of range → dropped
  assert.equal(fields.children, 5);
  assert.equal(fields.rooms, 2);
});

test('reversed stay lowers check-out confidence', () => {
  const { fields, confidence } = extractGenericFields('Check-in: 20/01/2026\nCheck-out: 10/01/2026');
  assert.equal(fields.checkinDate, '2026-01-20');
  assert.equal(fields.checkoutDate, '2026-01-10');
  assert.ok(confidence.checkoutDate <= 0.3, 'reversed dates must be flagged low-confidence');
});

test('extractBookingFromSource enforces the attachment cap', async () => {
  const many = Array.from({ length: 25 }, (_, i) => ({
    filename: `f${i}.txt`, contentType: 'text/plain', content: Buffer.from('x'),
  }));
  const res = await extractBookingFromSource({ text: 'Hotel: X', attachments: many });
  assert.ok(res.attachmentsProcessed <= 10, `cap must hold, processed=${res.attachmentsProcessed}`);
  assert.ok(res.warnings.some(w => /limit reached/i.test(w)));
});

test('extractBookingFromSource skips unsafe + oversized attachments', async () => {
  const res = await extractBookingFromSource({
    text: 'Hotel: X',
    attachments: [
      { filename: 'invoice.pdf.exe', contentType: 'application/octet-stream', content: Buffer.from('x') },
      { filename: 'malware.js', contentType: 'text/javascript', content: Buffer.from('x') },
      null,
      { filename: 'huge.pdf', contentType: 'application/pdf', content: Buffer.alloc(20 * 1024 * 1024) },
    ],
  });
  assert.ok(res.warnings.some(w => /unsafe/i.test(w)));
  assert.ok(res.warnings.some(w => /oversized/i.test(w)));
});

test('normalizeBookingFields is safe on non-object input', () => {
  assert.deepEqual(normalizeBookingFields('a string'), {});
  assert.deepEqual(normalizeBookingFields(['a', 'b']), {});
  assert.deepEqual(normalizeBookingFields(null), {});
  assert.deepEqual(normalizeBookingFields(42), {});
});

test('buildImportResult always yields a contract-valid object', () => {
  for (const booking of [null, 'x', 42, [], { hotelName: 'H' }]) {
    const r = buildImportResult({ source: 'test', booking });
    assert.doesNotThrow(() => validateImportResult(r));
  }
});

test('calculateMatchScore never throws on null / missing fields', () => {
  assert.equal(calculateMatchScore(null, {}), 0);
  assert.equal(calculateMatchScore({ hotelName: 'X' }, null), 0);
  assert.equal(calculateMatchScore({}, {}), 0);
  assert.equal(calculateMatchScore({ hotelName: 'Ibis' }, { name: 'Ibis' }), 0.7);
});
