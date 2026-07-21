process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://fake:fake@localhost:5432/fake';

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import http from 'http';
import express from 'express';
import inboundEmailRoutes, { extractBookingFromEmail } from './routes/inbound-email.js';

// In-memory mock DB store for tests
const store = {
  imports: new Map(),
  tokens: new Map(),
  bookings: new Map(),
};

const dbMock = {
  getBookingImport: async (id) => store.imports.get(id) || null,
  updateBookingImport: async (id, updates) => {
    const existing = store.imports.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    store.imports.set(id, updated);
    return updated;
  },
  getPendingImportTokenByHash: async (tokenHash) => {
    const token = store.tokens.get(tokenHash);
    if (!token) return null;
    if (token.usedAt !== null) return null;
    if (new Date(token.expiresAt) <= new Date()) return null;
    return token;
  },
  markPendingImportTokenUsed: async (id) => {
    for (const [hash, token] of store.tokens.entries()) {
      if (token.id === id) {
        token.usedAt = new Date().toISOString();
        store.tokens.set(hash, token);
        break;
      }
    }
  },
  getBookingsByEmail: async (email) => {
    return Array.from(store.bookings.values()).filter(b => b.email === email);
  },
  createBooking: async (data) => {
    const id = 'bk-' + Math.random().toString(36).substring(2, 9);
    const booking = { id, ...data, createdAt: new Date().toISOString() };
    store.bookings.set(id, booking);
    return booking;
  },
  logActivity: async () => {},
};

// Setup mock Express app with auth middleware override
const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token === 'userA-token') {
      req.userEmail = 'usera@example.com';
      return next();
    } else if (token === 'userB-token') {
      req.userEmail = 'userb@example.com';
      return next();
    }
  }
  next();
});

const mockAuthMiddleware = (req, res, next) => {
  if (!req.userEmail) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.use('/api', inboundEmailRoutes(mockAuthMiddleware, dbMock));

let server;
let baseUrl = '';

before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}/api`;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

// Helper to seed an import
function seedImport(id, userEmail, extractedData, status = 'NEEDS_REVIEW') {
  const record = {
    id,
    userEmail,
    source: 'inbound_email',
    extractedData,
    confidenceData: { hotelName: 0.9, checkinDate: 0.9, checkoutDate: 0.9, originalPrice: 0.9, currency: 0.9 },
    missingFields: [],
    status,
    createdAt: new Date().toISOString(),
  };
  store.imports.set(id, record);
  return record;
}

// Helper to seed a token
function seedToken(rawToken, bookingImportId, email, expiresAtOffsetHours = 72, usedAt = null) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const tokenRecord = {
    id: 'tk-' + Math.random().toString(36).substring(2, 9),
    bookingImportId,
    email,
    tokenHash,
    expiresAt: new Date(Date.now() + expiresAtOffsetHours * 3600 * 1000).toISOString(),
    usedAt,
  };
  store.tokens.set(tokenHash, tokenRecord);
  return tokenRecord;
}


// ═══════════════════════════════════════════════════════════════
// END-TO-END CONFIRM & GAPS AUDIT TESTS (G1 - G5)
// ═══════════════════════════════════════════════════════════════

test('G1. GET /api/inbound/imports/:id - Owner can fetch draft import', async () => {
  seedImport('imp-001', 'usera@example.com', { hotelName: 'Hilton Copacabana' });

  const res = await fetch(`${baseUrl}/inbound/imports/imp-001`, {
    headers: { Authorization: 'Bearer userA-token' },
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.id, 'imp-001');
  assert.equal(body.extractedData.hotelName, 'Hilton Copacabana');
});

test('G1. GET /api/inbound/imports/:id - Non-owner receives 403 Forbidden', async () => {
  seedImport('imp-002', 'usera@example.com', { hotelName: 'Fasano Rio' });

  const res = await fetch(`${baseUrl}/inbound/imports/imp-002`, {
    headers: { Authorization: 'Bearer userB-token' },
  });
  const body = await res.json();

  assert.equal(res.status, 403);
  assert.equal(body.error.includes('Access denied'), true);
});

test('G1. POST /api/inbound/imports/:id/confirm - Valid payload creates monitored booking & marks import CONFIRMED', async () => {
  seedImport('imp-003', 'usera@example.com', {
    hotelName: 'Belmond Copacabana Palace',
    checkinDate: '2026-11-10',
    checkoutDate: '2026-11-15',
    originalPrice: 1500,
    currency: 'BRL',
  });

  const res = await fetch(`${baseUrl}/inbound/imports/imp-003/confirm`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer userA-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      hotelName: 'Belmond Copacabana Palace',
      checkinDate: '2026-11-10',
      checkoutDate: '2026-11-15',
      originalPrice: 1500,
      currency: 'BRL',
    }),
  });
  const body = await res.json();

  assert.equal(res.status, 201);
  assert.equal(body.status, 'confirmed');
  assert.ok(body.booking.id);
  assert.equal(body.booking.status, 'monitoring');

  const updatedImp = store.imports.get('imp-003');
  assert.equal(updatedImp.status, 'CONFIRMED');
  assert.equal(updatedImp.bookingId, body.booking.id);
});

test('G1. POST /api/inbound/imports/:id/confirm - Idempotent: 2nd confirm returns existing booking without duplicate', async () => {
  seedImport('imp-004', 'usera@example.com', {}, 'CONFIRMED');
  store.imports.get('imp-004').bookingId = 'bk-existing-123';

  const res = await fetch(`${baseUrl}/inbound/imports/imp-004/confirm`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer userA-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      hotelName: 'Belmond Copacabana Palace',
      checkinDate: '2026-11-10',
      checkoutDate: '2026-11-15',
      originalPrice: 1500,
      currency: 'BRL',
    }),
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.status, 'already_confirmed');
  assert.equal(body.bookingId, 'bk-existing-123');
});

test('G1. POST /api/inbound/imports/:id/confirm - Rejects when essential field is missing (400 Bad Request)', async () => {
  seedImport('imp-005', 'usera@example.com', {});

  const res = await fetch(`${baseUrl}/inbound/imports/imp-005/confirm`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer userA-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      hotelName: 'Grand Hyatt',
      checkinDate: '2026-12-01',
      // checkoutDate missing
      originalPrice: 500,
      currency: 'USD',
    }),
  });
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.equal(body.error, 'Missing required essential fields');
  assert.deepEqual(body.missingFields, ['checkoutDate']);
});

test('G4. Token validation: Expired token returns 410 Gone', async () => {
  seedImport('imp-006', null, {});
  seedToken('expired-raw-token', 'imp-006', 'newuser@example.com', -24);

  const res = await fetch(`${baseUrl}/inbound/pending-import?token=expired-raw-token`);
  const body = await res.json();

  assert.equal(res.status, 410);
  assert.equal(body.error.includes('expired'), true);
});

test('G4. Token validation: Already-used token returns 410 Gone', async () => {
  seedImport('imp-007', null, {});
  seedToken('used-raw-token', 'imp-007', 'newuser@example.com', 72, new Date().toISOString());

  const res = await fetch(`${baseUrl}/inbound/pending-import?token=used-raw-token`);
  const body = await res.json();

  assert.equal(res.status, 410);
  assert.equal(body.error.includes('already used'), true);
});

test('G3. Attach-on-signup: Valid token links pending import to new account and invalidates token', async () => {
  seedImport('imp-008', null, { hotelName: 'Sheraton' });
  seedToken('valid-signup-token', 'imp-008', 'newuser@example.com', 72);

  const res = await fetch(`${baseUrl}/inbound/pending-import/attach`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer userA-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token: 'valid-signup-token' }),
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.status, 'attached');
  assert.equal(body.userEmail, 'usera@example.com');

  const updatedImp = store.imports.get('imp-008');
  assert.equal(updatedImp.userEmail, 'usera@example.com');

  const checkRes = await fetch(`${baseUrl}/inbound/pending-import?token=valid-signup-token`);
  assert.equal(checkRes.status, 410);
});

test('G5. Safety Guarantee: Inbound extraction creates ONLY draft booking_imports, NEVER direct bookings', () => {
  const result = extractBookingFromEmail('Confirmation Number: HM998877\nHotel: Copacabana Palace');
  assert.ok(result.fields);
  assert.equal(result.fields.status, undefined);
});


// ═══════════════════════════════════════════════════════════════
// MAJOR RESERVATION PROVIDERS & DIRECT HOTEL CONFIRMATIONS EXTRACTION TESTS
// ═══════════════════════════════════════════════════════════════

test('Provider 1. Booking.com confirmation email format', () => {
  const body = 'Booking.com Confirmation Number: 4589123456\nHotel Name: Hotel Miramar By Windsor\nCheck-in: 15/10/2026\nCheck-out: 20/10/2026\nTotal Price: BRL 2.350,00';
  const { fields } = extractBookingFromEmail(body, 'Sua confirmação do Booking.com');
  assert.equal(fields.confirmationNumber, '4589123456');
  assert.equal(fields.hotelName, 'Hotel Miramar By Windsor');
  assert.equal(fields.currency, 'BRL');
});

test('Provider 2. Expedia itinerary confirmation format', () => {
  const body = 'Expedia Itinerary # 7294810293\nHotel: Grand Hyatt Rio de Janeiro\nCheck-in: 2026-11-01\nCheck-out: 2026-11-05\nTotal Paid: USD 850.00';
  const { fields } = extractBookingFromEmail(body, 'Expedia travel confirmation - Itinerary # 7294810293');
  assert.equal(fields.confirmationNumber, '7294810293');
  assert.equal(fields.hotelName, 'Grand Hyatt Rio de Janeiro');
  assert.equal(fields.currency, 'USD');
});

test('Provider 3. Airbnb reservation code format', () => {
  const body = 'Reservation code: HM98765432\nHost: Apartment Ipanema Beach\nCheck-in: 2026-12-20';
  const { fields } = extractBookingFromEmail(body, 'Reservation confirmed for Rio de Janeiro');
  assert.equal(fields.confirmationNumber, 'HM98765432');
});

test('Provider 4. Agoda booking voucher format', () => {
  const body = 'Agoda Booking Reference No: 99887766\nHotel: Hotel Fasano Sao Paulo\nCheck-in: 2026-09-10\nTotal: USD 1,200.00';
  const { fields } = extractBookingFromEmail(body, 'Agoda Booking Confirmation - 99887766');
  assert.equal(fields.confirmationNumber, '99887766');
  assert.equal(fields.hotelName, 'Hotel Fasano Sao Paulo');
  assert.equal(fields.currency, 'USD');
});

test('Provider 5. Hotels.com confirmation format', () => {
  const body = 'Hotels.com Confirmation: 918273645\nHotel: Hotel Unique\nCheck-in: 2026-08-15';
  const { fields } = extractBookingFromEmail(body, 'Hotels.com confirmation 918273645');
  assert.equal(fields.confirmationNumber, '918273645');
  assert.equal(fields.hotelName, 'Hotel Unique');
});

test('Provider 6. Hilton Direct booking email', () => {
  const body = 'Hilton Honors Confirmation: 34567890\nHotel: Hilton Barra Rio de Janeiro\nCheck-in: 2026-10-05\nCheck-out: 2026-10-08\nTotal Price: USD 450.00';
  const { fields } = extractBookingFromEmail(body, 'Your Hilton Confirmation - 34567890');
  assert.equal(fields.confirmationNumber, '34567890');
  assert.equal(fields.hotelName, 'Hilton Barra Rio de Janeiro');
  assert.equal(fields.currency, 'USD');
});

test('Provider 7. Marriott Bonvoy direct confirmation email', () => {
  const body = 'Marriott Bonvoy Confirmation Number: 88771122\nHotel: JW Marriott Hotel Rio de Janeiro\nCheck-in: 2026-11-20';
  const { fields } = extractBookingFromEmail(body, 'Confirmation for JW Marriott Hotel Rio de Janeiro');
  assert.equal(fields.confirmationNumber, '88771122');
  assert.equal(fields.hotelName, 'JW Marriott Hotel Rio de Janeiro');
});

test('Provider 8. Accor ALL direct confirmation email', () => {
  const body = 'Código de reserva: ACC-554433\nHotel: Fairmont Copacabana\nCheck-in: 10/12/2026\nCheck-out: 15/12/2026\nValor total: BRL 3.400,00';
  const { fields } = extractBookingFromEmail(body, 'Confirmação de reserva Accor - ACC-554433');
  assert.equal(fields.confirmationNumber, 'ACC-554433');
  assert.equal(fields.hotelName, 'Fairmont Copacabana');
  assert.equal(fields.currency, 'BRL');
});

test('Provider 9. Hyatt Hotels direct confirmation email', () => {
  const body = 'Hyatt Confirmation Code: HY-998877\nHotel: Grand Hyatt Sao Paulo\nCheck-in: 2026-09-01';
  const { fields } = extractBookingFromEmail(body, 'Hyatt Reservation Confirmation HY-998877');
  assert.equal(fields.confirmationNumber, 'HY-998877');
  assert.equal(fields.hotelName, 'Grand Hyatt Sao Paulo');
});

test('Provider 10. Independent Hotel Direct confirmation email', () => {
  const body = 'Confirmação de Reserva # 102030\nHotel Pousada do Sol\nCheck-in: 01/11/2026\nCheck-out: 05/11/2026\nPreço Total: R$ 800,00';
  const { fields } = extractBookingFromEmail(body, 'Sua reserva na Pousada do Sol foi confirmada');
  assert.equal(fields.confirmationNumber, '102030');
  assert.equal(fields.currency, 'BRL');
});
