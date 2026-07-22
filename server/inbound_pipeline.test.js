import test from 'node:test';
import assert from 'node:assert/strict';
import { createImportResult, validateImportResult, ALLOWED_STATUSES } from './importResult.js';
import { isAiParserConfigured } from './aiParser.js';
import { extractBookingFromSource, stripQuotedForwardBlocks, normalizeDate, parsePrice, parseCurrency } from './extractors/index.js';
import { processInboundEmailPayload } from './routes/inbound-email.js';
import { checkAndConsumeProviderCap } from './db.js';

test('TASK 1 — Import Result Contract Validation', (t) => {
  // Test valid result construction
  const valid = createImportResult({
    success: true,
    source: 'inbound_email',
    booking: {
      hotelName: 'Hilton Rio de Janeiro',
      checkIn: '2026-10-10',
      checkOut: '2026-10-15',
      totalPrice: 1500,
      currency: 'BRL',
    },
    hotel: { name: 'Hilton Rio', star: 5 },
    missingFields: [],
    warnings: [],
    attachmentsProcessed: 1,
    status: 'ACTIVE_MONITORING',
  });

  assert.equal(valid.success, true);
  assert.equal(valid.status, 'ACTIVE_MONITORING');
  assert.equal(valid.booking.hotelName, 'Hilton Rio de Janeiro');
  assert.doesNotThrow(() => validateImportResult(valid));

  // Test invalid status throws error in validator
  const invalidStatusObj = {
    success: true,
    source: 'inbound_email',
    booking: {},
    hotel: null,
    missingFields: [],
    warnings: [],
    attachmentsProcessed: 0,
    status: 'INVALID_STATUS',
  };
  assert.throws(() => {
    validateImportResult(invalidStatusObj);
  }, /status.*is not a valid/);

  // Test shape drift throws error
  const invalidShape = { success: true, status: 'ACTIVE_MONITORING' };
  assert.throws(() => {
    validateImportResult(invalidShape);
  }, /source must be/);
});

test('TASK 2 — Zero AI / Token Policy on Import Path', (t) => {
  assert.equal(isAiParserConfigured(), false, 'isAiParserConfigured must return false for import pipeline');
});

test('TASK 3 — Deterministic Extraction & Normalization Pass', async (t) => {
  // Stripping quoted/forwarded headers
  const fwdText = `---------- Forwarded message ---------
From: Booking.com <noreply@booking.com>
Subject: Confirmation for Hotel Copacabana Palace
Hotel: Hotel Copacabana Palace
Check-in: 15/12/2026
Check-out: 20/12/2026
Total: R$ 4.500,00`;

  const cleaned = stripQuotedForwardBlocks(fwdText);
  assert.equal(cleaned.includes('---------- Forwarded message ---------'), false);

  // Date & Currency Normalization
  assert.equal(normalizeDate('15/12/2026'), '2026-12-15');
  assert.equal(parsePrice('R$ 4.500,00'), 4500);
  assert.equal(parseCurrency('R$ 4.500,00'), 'BRL');

  // Provider Template Extraction (Booking.com)
  const extraction = await extractBookingFromSource({
    text: `Your reservation at Hotel Transamerica Prime
Confirmation number: 987654321
Check-in: 2026-11-01
Check-out: 2026-11-05
Total price: USD 850.00`,
    subject: 'Booking.com confirmation - 987654321',
  });

  assert.equal(extraction.fields.hotelName, 'Hotel Transamerica Prime');
  assert.equal(extraction.fields.bookingReference, '987654321');
  assert.equal(extraction.fields.checkIn, '2026-11-01');
  assert.equal(extraction.fields.checkOut, '2026-11-05');
  assert.equal(extraction.fields.totalPrice, 850);
  assert.equal(extraction.fields.currency, 'USD');
});

test('TASK 5 & 6 — Auto-creation, User Matching & Deduplication', async (t) => {
  const mockUser = { email: 'traveler@resdrop.app', name: 'Verified Traveler' };

  const mockDb = {
    getAllBookings: async () => [
      {
        id: 'existing-bkg-1',
        email: 'traveler@resdrop.app',
        hotelName: 'Grand Hyatt São Paulo',
        checkinDate: '2026-11-10',
        checkoutDate: '2026-11-15',
        confirmationNumber: 'GH-12345',
      },
    ],
    getInboundEmailByMessageId: async () => null,
    getInboundEmailByHash: async () => null,
    createInboundEmail: async (data) => ({ id: 'inb-100', ...data }),
    getUserByEmail: async (email) => email === 'traveler@resdrop.app' ? mockUser : null,
    createBooking: async (b) => ({ id: `bkg-${Date.now()}`, ...b }),
    createBookingImport: async (bi) => ({ id: `imp-${Date.now()}`, ...bi }),
    createPendingImportToken: async () => ({ id: 'tok-1' }),
  };

  // Test 1: Complete payload creates ACTIVE_MONITORING booking
  const res1 = await processInboundEmailPayload({
    senderEmail: 'traveler@resdrop.app',
    subject: 'Confirmation for Grand Hyatt',
    textContent: `Hotel: Grand Hyatt Rio
Check-in: 2026-12-01
Check-out: 2026-12-05
Total: R$ 3.000,00
Confirmation: GH-99999`,
    messageId: 'msg-unique-1',
    contentHash: 'hash-unique-1',
    dbClient: mockDb,
  });

  assert.equal(res1.status, 'ACTIVE_MONITORING');
  assert.equal(res1.booking.hotelName, 'Grand Hyatt Rio');

  // Test 2: Duplicate confirmation number returns DUPLICATE status
  const resDup = await processInboundEmailPayload({
    senderEmail: 'traveler@resdrop.app',
    subject: 'Confirmation duplicate',
    textContent: `Hotel: Grand Hyatt São Paulo
Check-in: 2026-11-10
Check-out: 2026-11-15
Total: R$ 2.000,00
Confirmation: GH-12345`,
    messageId: 'msg-unique-2',
    contentHash: 'hash-unique-2',
    dbClient: mockDb,
  });

  assert.equal(resDup.status, 'DUPLICATE');

  // Test 3: Unregistered sender returns token signup flow
  const resUnknown = await processInboundEmailPayload({
    senderEmail: 'newtraveler@example.com',
    subject: 'Hotel Confirmation',
    textContent: `Hotel: Hotel Emiliano
Check-in: 2026-12-10
Check-out: 2026-12-12
Total: R$ 1.800,00`,
    messageId: 'msg-unique-3',
    contentHash: 'hash-unique-3',
    dbClient: mockDb,
  });

  assert.equal(resUnknown.success, true);
  assert.equal(Object.keys(resUnknown.booking).length, 0); // Empty booking object until signup
});

test('TASK 8 — Controlled Google Places Fallback Daily Caps', async (t) => {
  const provider = 'google_places_test';
  const op = 'find_place';
  const cap = 3;

  // First 3 calls under cap
  const call1 = await checkAndConsumeProviderCap(provider, op, cap, 100);
  const call2 = await checkAndConsumeProviderCap(provider, op, cap, 100);
  const call3 = await checkAndConsumeProviderCap(provider, op, cap, 100);
  assert.equal(call1, true);
  assert.equal(call2, true);
  assert.equal(call3, true);

  // 4th call exceeds daily cap
  const call4 = await checkAndConsumeProviderCap(provider, op, cap, 100);
  assert.equal(call4, false, 'Should block external call when cap is reached');
});

test('TASK 15 — Cloudflare Email Bridge (POST /api/inbound/cloudflare-email)', async (t) => {
  const { default: inboundEmailRoutes } = await import('./routes/inbound-email.js');
  const express = (await import('express')).default;

  const mockUser = { email: 'traveler@resdrop.app', name: 'Verified Traveler' };
  const mockDb = {
    getAllBookings: async () => [],
    getInboundEmailByMessageId: async () => null,
    getInboundEmailByHash: async () => null,
    createInboundEmail: async (data) => ({ id: 'inb-cf-1', ...data }),
    getUserByEmail: async (email) => email === 'traveler@resdrop.app' ? mockUser : null,
    createBooking: async (b) => ({ id: `bkg-cf-1`, ...b }),
    createBookingImport: async (bi) => ({ id: `imp-cf-1`, ...bi }),
  };

  const app = express();
  const dummyAuth = (req, res, next) => next();
  app.use('/api', inboundEmailRoutes(dummyAuth, mockDb));

  // Start temporary server
  const server = app.listen(0);
  const port = server.address().port;
  const url = `http://localhost:${port}/api/inbound/cloudflare-email`;

  process.env.INBOUND_WEBHOOK_SECRET = 'test-secret-123';

  try {
    // 1. Unauthorized request (wrong or missing secret)
    const resUnauth = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'message/rfc822', 'X-Inbound-Secret': 'wrong-secret' },
      body: 'From: traveler@resdrop.app\r\nSubject: Test\r\n\r\nHello',
    });
    assert.equal(resUnauth.status, 401);

    // 2. Valid request with raw MIME
    const sampleMime = `From: traveler@resdrop.app
To: reservas@resdrop.app
Subject: Confirmation for Hotel Fasano Rio
Message-ID: <cf-test-msg-999@resdrop.app>

Hotel: Hotel Fasano Rio
Check-in: 2026-11-20
Check-out: 2026-11-25
Total: USD 2500.00
Confirmation: FAS-12345`;

    const resValid = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'message/rfc822',
        'X-Inbound-Secret': 'test-secret-123',
      },
      body: sampleMime,
    });

    assert.equal(resValid.status, 200);
    const body = await resValid.json();
    assert.equal(body.success, true);
    assert.equal(body.status, 'ACTIVE_MONITORING');
    assert.equal(body.booking.hotelName, 'Hotel Fasano Rio');
  } finally {
    server.close();
    delete process.env.INBOUND_WEBHOOK_SECRET;
  }
});

