import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import * as db from './db.js';
import {
  isBookingApiConfigured,
  searchAccommodations,
  checkAvailability,
  parseSearchResults,
  parseAvailabilityResults,
} from './bookingApi.js';
import {
  isAwinConfigured,
  getBookingPromotions,
  parsePromotions,
  buildBookingSearchLink,
  buildAffiliateLink,
  getJoinedProgrammes,
  getTransactions,
} from './awinApi.js';
import {
  isExpediaConfigured,
  buildExpediaSearchLink,
  buildExpediaAffiliateLink,
  calculateExpediaCommission,
  getExpediaCommissionRates,
  getExpediaProgrammeInfo,
  EXPEDIA_COMMISSIONS,
} from './expediaApi.js';
import {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
  getCheckHistory,
  manualCheck,
} from './scheduler.js';
import { hotels } from './hotels.js';
import {
  isSerpApiConfigured,
  searchRealPrices,
} from './serpApi.js';
import savingsRoutes from './routes/savings.js';
import specialFaresRoutes from './routes/specialFares.js';
import documentRoutes from './routes/documents.js';
import inboundEmailRoutes from './routes/inbound-email.js';
import {
  isEmailConfigured,
  sendWelcomeEmail,
  sendPriceDropAlert,
  sendSavingsConfirmed,
  sendPasswordReset,
  sendBookingCreated,
  sendAdminNotification,
} from './email.js';

// Blocked/unreliable sources — filtered from all results (including cached)
const BLOCKED_SOURCES_DISPLAY = [
  'oyo', 'oyorooms', 'elmisti', 'el misti',
  'hostel-bb', 'hotel-bb', 'hostelclub', 'hostelling',
  'hotelscombined', 'triverna',
  'ostrovok', 'destinia', 'zenhotels', 'snaptravel',
  'stayforlong', 'amoma', 'getaroom',
  'prestigia', 'hotelopia', 'ratehawk',
  'roomdi', 'findhotel', 'hotellook',
  'booked.net', 'lookfor', 'hotelurbano',
];

function filterBlockedResults(results) {
  if (!Array.isArray(results)) return results;
  return results.filter(r => {
    const src = (r.source || '').toLowerCase();
    const url = (r.link || '').toLowerCase();
    return !BLOCKED_SOURCES_DISPLAY.some(b => src.includes(b) || url.includes(b));
  });
}

function filterBookingResults(booking) {
  if (booking && Array.isArray(booking.latestResults)) {
    booking.latestResults = filterBlockedResults(booking.latestResults);
  }
  return booking;
}

const app = express();

// ─── Security: CORS — restrict to known origins ─────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['https://resdrop.app', 'http://localhost:5173', 'http://localhost:3001'],
  credentials: true,
}));

// ─── Security: Body size limit ──────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ─── Security: Basic security headers ───────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// ─── Security: Rate limiting ────────────────────────────────
const rateLimitMap = new Map();
function rateLimit(windowMs, max, keyFn) {
  return (req, res, next) => {
    const key = keyFn ? keyFn(req) : req.ip;
    const now = Date.now();
    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, { count: 1, start: now });
      return next();
    }
    const entry = rateLimitMap.get(key);
    if (now - entry.start > windowMs) {
      rateLimitMap.set(key, { count: 1, start: now });
      return next();
    }
    entry.count++;
    if (entry.count > max) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    next();
  };
}
// Clean up rate limit map every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now - entry.start > 15 * 60 * 1000) rateLimitMap.delete(key);
  }
}, 5 * 60 * 1000);

const authRateLimit = rateLimit(15 * 60 * 1000, 15, req => `auth:${req.ip}`);        // 15 attempts per 15 min
const signupRateLimit = rateLimit(60 * 60 * 1000, 10, req => `signup:${req.ip}`);     // 10 signups per hour
const resetRateLimit = rateLimit(60 * 60 * 1000, 5, req => `reset:${req.ip}`);        // 5 resets per hour
const bookingRateLimit = rateLimit(60 * 1000, 10, req => `booking:${req.userEmail}`);  // 10 bookings per min

// ─── Status Log ──────────────────────────────────────────────
const API_MODE = isSerpApiConfigured() ? 'LIVE (SerpApi)' : isBookingApiConfigured() ? 'LIVE (Booking)' : 'SIMULATION';
const SERVER_START = new Date();
console.log(`[RepriceHQ] Price engine mode: ${API_MODE}`);
console.log(`[RepriceHQ] Storage: Supabase (PostgreSQL)`);
if (isSerpApiConfigured()) {
  console.log('[RepriceHQ] SerpApi Google Hotels: configured ✓ (real prices)');
}
if (API_MODE === 'SIMULATION') {
  console.log('[RepriceHQ] To enable live prices, set SERPAPI_KEY in server/.env');
}
if (process.env.AWIN_API_TOKEN) {
  console.log('[RepriceHQ] Awin affiliate token: configured ✓');
}
if (isExpediaConfigured()) {
  console.log('[RepriceHQ] Expedia affiliate: configured ✓');
} else {
  console.log('[RepriceHQ] Expedia affiliate: not configured (set EXPEDIA_AWIN_ADVERTISER_ID in .env)');
}
if (isEmailConfigured()) {
  console.log('[RepriceHQ] Email (Resend): configured ✓');
} else {
  console.log('[RepriceHQ] Email (Resend): not configured (set RESEND_API_KEY in .env)');
}

// ─── Plan definitions ────────────────────────────────────────
const PLANS = {
  free:     { bookingsPerMonth: 1,  searchesPerDay: 1,   price: 0   },
  viajante: { bookingsPerMonth: 10, searchesPerDay: 50,  price: 25  },
  premium:  { bookingsPerMonth: 50, searchesPerDay: 200, price: 100 },
};

function generateId() {
  return crypto.randomUUID();
}

// ─── Auth Middleware ─────────────────────────────────────────
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'junior13machadojr@gmail.com';

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.slice(7);
  const session = await db.getSessionByToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  const user = await db.getUser(session.user_email);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  req.user = user;
  req.userEmail = session.user_email;
  next();
}

function adminMiddleware(req, res, next) {
  if (req.userEmail !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Admin access denied' });
  }
  next();
}

// ─── Price search: real APIs only (no simulation) ────────────
async function searchPrices(booking, options = {}) {
  const allResults = [];

  // 1) Try SerpApi Google Hotels (real prices from multiple OTAs)
  if (isSerpApiConfigured()) {
    try {
      const serpResults = await searchRealPrices(booking, { currency: options.currency || 'BRL' });
      if (serpResults.length > 0) {
        // Add affiliate links to real results
        for (const r of serpResults) {
          if ((r.sourceId === 'expedia_real' || r.source === 'Expedia') && isExpediaConfigured()) {
            r.affiliateLink = buildExpediaSearchLink({
              destination: booking.destination,
              checkinDate: booking.checkinDate,
              checkoutDate: booking.checkoutDate,
              clickRef: `resdrop_${booking.id?.slice(0, 8)}`,
            });
          } else if ((r.sourceId === 'booking_real' || r.source === 'Booking.com') && isAwinConfigured()) {
            r.affiliateLink = buildBookingSearchLink({
              destination: booking.destination,
              checkinDate: booking.checkinDate,
              checkoutDate: booking.checkoutDate,
              clickRef: `resdrop_${booking.id?.slice(0, 8)}`,
            });
          }
        }
        allResults.push(...serpResults);
        console.log(`[Search] SerpApi returned ${serpResults.length} real results`);
      }
    } catch (err) {
      console.error(`[Search] SerpApi failed: ${err.message}`);
    }
  }

  // 2) Try Booking.com Demand API if configured
  if (isBookingApiConfigured() && allResults.length === 0) {
    try {
      const apiResponse = await searchAccommodations({
        hotelName: booking.hotelName,
        destination: booking.destination,
        checkinDate: booking.checkinDate,
        checkoutDate: booking.checkoutDate,
      });
      const realResults = parseSearchResults(apiResponse, booking.originalPrice);
      if (realResults.length > 0) {
        allResults.push(...realResults);
      }
    } catch (err) {
      console.error(`[BookingAPI] Search failed: ${err.message}`);
    }
  }

  // No simulation fallback — only real data
  if (allResults.length === 0) {
    console.log('[Search] No results found (APIs returned empty)');
  }

  // Filter out blocked/unreliable sources from all results
  const filtered = filterBlockedResults(allResults);
  filtered.sort((a, b) => a.totalPrice - b.totalPrice);
  return filtered;
}

// ─── Helper: update booking with best result ─────────────────
// STRICT comparison rules:
//   - Only exact hotel matches with trusted sources are considered
//   - Room type must be compatible (or both unknown)
//   - Refundability must not be mismatched
//   - Never claim savings on non-comparable rates
async function applyBestResult(booking, results) {
  booking.lastChecked = new Date().toISOString();
  booking.latestResults = results;
  booking.checkCount = (booking.checkCount || 0) + 1;

  // STRICT filtering: require exact hotel match + trusted source + room type compatible
  const comparableMatches = results.filter(r =>
    r.isExactMatch && r.isTrustedSource && r.roomTypeMatch
  );
  const alternatives = results.filter(r => !r.isExactMatch);
  booking.alternatives = alternatives.slice(0, 5);

  if (comparableMatches.length > 0) {
    // Further filter: check refundability compatibility
    // If booking is non-refundable, don't compare to refundable (different product)
    // If booking is refundable, don't compare to non-refundable (worse product)
    const bookingRefundable = booking.cancellationPolicy
      ? ['free_cancellation', 'fully_refundable', 'refundable'].includes(booking.cancellationPolicy)
      : null; // unknown

    const fullyComparable = comparableMatches.filter(r => {
      // If we don't know booking's refundability, allow all matches (but log as unconfirmed)
      if (bookingRefundable === null) return true;
      // If we don't know result's refundability, allow but flag
      if (r.freeCancellation === undefined || r.freeCancellation === null) return true;
      // Both known — must match
      return bookingRefundable === r.freeCancellation;
    });

    const bestMatch = fullyComparable.length > 0
      ? fullyComparable.sort((a, b) => a.totalPrice - b.totalPrice)[0]
      : null;

    if (bestMatch) {
      const currentPrice = bestMatch.totalPrice;

      // Handle per-night rate: convert to total for comparison
      let effectiveOriginal = booking.originalPrice;
      if (booking.rateType === 'per_night') {
        const checkin = new Date(booking.checkinDate);
        const checkout = new Date(booking.checkoutDate);
        const nights = Math.max(1, Math.round((checkout - checkin) / (1000 * 60 * 60 * 24)));
        effectiveOriginal = booking.originalPrice * nights;
      }

      const diff = Math.round((effectiveOriginal - currentPrice) * 100) / 100;

      // Always record price history
      if (!booking.priceHistory) booking.priceHistory = [];
      booking.priceHistory.push({
        date: new Date().toISOString(),
        price: currentPrice,
        source: bestMatch.source,
      });

      // Keep JSONB alerts for backward compat, but also write to fare_alerts table
      if (!booking.alerts) booking.alerts = [];

      let alertType, alertMessage;

      if (diff > 0) {
        // PRICE DROP — comparable product confirmed, set as potential savings
        if (!booking.bestPrice || currentPrice < booking.bestPrice) {
          booking.bestPrice = currentPrice;
          booking.bestSource = bestMatch.source;
          booking.potentialSavings = diff;
          // Only set lower_fare_found if not already confirmed
          if (booking.status !== 'confirmed_savings') {
            booking.status = 'lower_fare_found';
          }
        }
        alertType = 'price_drop';
        alertMessage = `📉 Price drop: R$${currentPrice} via ${bestMatch.source} — savings R$${diff}`;
        booking.alerts.push({
          id: generateId(),
          date: new Date().toISOString(),
          type: alertType,
          message: alertMessage,
          savings: diff,
        });

        // Fire-and-forget price drop email
        sendPriceDropAlert(booking.email, booking.guestName || 'Traveler', booking).catch(() => {});
      } else if (diff === 0) {
        alertType = 'price_same';
        alertMessage = `➡️ Price stable: R$${currentPrice} via ${bestMatch.source}`;
        booking.alerts.push({
          id: generateId(),
          date: new Date().toISOString(),
          type: alertType,
          message: alertMessage,
          savings: 0,
        });
      } else {
        alertType = 'price_increase';
        alertMessage = `📈 Price up: R$${currentPrice} via ${bestMatch.source} (+R$${Math.abs(diff)})`;
        booking.alerts.push({
          id: generateId(),
          date: new Date().toISOString(),
          type: alertType,
          message: alertMessage,
          savings: 0,
        });
      }

      // Write to fare_alerts table
      try {
        await db.createFareAlert({
          bookingId: booking.id,
          type: alertType,
          message: alertMessage,
          savings: diff > 0 ? diff : 0,
          currentPrice,
          source: bestMatch.source,
        });
      } catch (err) {
        console.error('[applyBestResult] Failed to create fare alert:', err.message);
      }

      // Log to activity_log
      try {
        await db.logActivity({
          entityType: 'booking',
          entityId: booking.id,
          action: alertType === 'price_drop' ? 'lower_fare_found' : 'price_checked',
          actorEmail: 'system',
          details: { currentPrice, originalPrice: effectiveOriginal, diff, source: bestMatch.source, comparable: true },
        });
      } catch (err) {
        console.error('[applyBestResult] Failed to log activity:', err.message);
      }
    } else {
      // Results exist but none are fully comparable (refundability mismatch)
      console.log(`[applyBestResult] ${comparableMatches.length} room-matched results but none pass refundability check — no savings claimed`);
      if (!booking.alerts) booking.alerts = [];
      booking.alerts.push({
        id: generateId(),
        date: new Date().toISOString(),
        type: 'price_check',
        message: '🔍 Prices found but not comparable (different cancellation policy)',
        savings: 0,
      });
    }
  } else if (results.filter(r => r.isExactMatch).length > 0) {
    // Hotel matched but room type or trust check failed — log but don't claim savings
    console.log(`[applyBestResult] Hotel matched but room/trust check failed — no savings claimed`);
    if (!booking.priceHistory) booking.priceHistory = [];
    if (!booking.alerts) booking.alerts = [];
    booking.alerts.push({
      id: generateId(),
      date: new Date().toISOString(),
      type: 'price_check',
      message: '🔍 Prices checked — no comparable rates found for your room type',
      savings: 0,
    });
  }

  // Persist to Supabase
  await db.updateBooking(booking.id, {
    lastChecked: booking.lastChecked,
    latestResults: booking.latestResults,
    checkCount: booking.checkCount,
    alternatives: booking.alternatives,
    priceHistory: booking.priceHistory,
    alerts: booking.alerts,
    bestPrice: booking.bestPrice,
    bestSource: booking.bestSource,
    potentialSavings: booking.potentialSavings,
    status: booking.status,
  });
}

// ═══════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════

// Submit a new booking for monitoring
app.post('/api/bookings', authMiddleware, bookingRateLimit, async (req, res) => {
  try {
    const {
      hotelName, destination, checkinDate, checkoutDate,
      roomType, originalPrice,
      guestName, confirmationNumber,
      rateType, roomTypeCustom,
      preferences, taxesIncluded,
      rawSource, parseMethod,
    } = req.body;

    // Validate booking data
    const validation = validateBookingData({ hotelName, checkinDate, checkoutDate, originalPrice, confirmationNumber, roomType, guestName, destination });
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: validation.errors,
        warnings: validation.warnings,
        missingFields: validation.missingFields,
      });
    }

    // Duplicate detection
    const duplicate = await findDuplicateBooking(req.userEmail, hotelName, checkinDate, checkoutDate);
    if (duplicate) {
      return res.status(409).json({
        error: 'duplicate_booking',
        message: 'A booking with the same hotel, check-in, and check-out dates already exists.',
        existingBookingId: duplicate.id,
      });
    }

    // Validate plan limit using authenticated user
    const plan = PLANS[req.user.plan] || PLANS.free;
    if ((req.user.bookingsCount || 0) >= plan.bookingsPerMonth) {
      return res.status(403).json({
        error: 'plan_limit',
        message: `Limite do plano atingido (${plan.bookingsPerMonth} reservas/mes). Faca upgrade para continuar.`,
        limit: plan.bookingsPerMonth,
        plan: req.user.plan,
      });
    }

    // Determine status based on completeness — NEVER auto-generate confirmation or room type
    const optionalMissing = validation.missingFields.filter(f => !['hotelName', 'checkinDate', 'checkoutDate', 'originalPrice'].includes(f));
    const status = optionalMissing.length > 0 ? 'needs_review' : 'monitoring';

    const id = generateId();
    const booking = {
      id,
      hotelName,
      destination: destination || '',
      checkinDate,
      checkoutDate,
      roomType: roomType || null,
      originalPrice: parseFloat(originalPrice),
      guestName: guestName || req.user.name || null,
      confirmationNumber: confirmationNumber || null,
      email: req.userEmail,
      status,
      missingFields: optionalMissing.length > 0 ? optionalMissing : null,
      createdAt: new Date().toISOString(),
      lastChecked: null,
      bestPrice: null,
      bestSource: null,
      totalSavings: 0,
      notes: [
        preferences?.length ? `Preferências: ${preferences.join(', ')}` : '',
        taxesIncluded ? 'Impostos incluídos' : '',
      ].filter(Boolean).join(' | '),
      rateType: rateType || 'total',
      roomTypeCustom: roomTypeCustom || null,
      rawSource: rawSource || null,
      parseMethod: parseMethod || 'manual',
      priceHistory: [
        {
          date: new Date().toISOString(),
          price: parseFloat(originalPrice),
          source: 'Reserva Original',
        },
      ],
      alerts: [],
      changeHistory: [],
      apiMode: API_MODE,
    };

    const created = await db.createBooking(booking);
    if (!created) {
      return res.status(500).json({ error: 'Failed to create booking — database error. Check server logs.' });
    }

    // Fire-and-forget booking created email
    sendBookingCreated(req.userEmail, req.user.name || 'Traveler', created).catch(() => {});

    res.status(201).json(created);
  } catch (err) {
    console.error('[API] POST /bookings error:', err);
    res.status(500).json({ error: `Server error: ${err.message}` });
  }
});

// Get bookings (LGPD: always filtered by authenticated user)
app.get('/api/bookings', authMiddleware, async (req, res) => {
  const results = await db.getBookingsByEmail(req.userEmail);
  res.json(results.map(filterBookingResults));
});

// Get a single booking (ownership check)
app.get('/api/bookings/:id', authMiddleware, async (req, res) => {
  const booking = await db.getBooking(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.email !== req.userEmail) return res.status(403).json({ error: 'Access denied' });
  res.json(filterBookingResults(booking));
});

// Refresh price check (ownership check)
app.post('/api/bookings/:id/check', authMiddleware, async (req, res) => {
  const booking = await db.getBooking(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.email !== req.userEmail) return res.status(403).json({ error: 'Access denied' });

  try {
    const user = await db.getUser(req.userEmail);
    const results = await searchPrices(booking, { currency: user?.currency || 'BRL' });
    await applyBestResult(booking, results);
    // Re-fetch to get the updated version from DB
    const updated = await db.getBooking(req.params.id);
    res.json(filterBookingResults(updated));
  } catch (err) {
    console.error(`[Check] Failed for ${booking.hotelName}: ${err.message}`);
    res.status(500).json({ error: 'Price check failed', message: err.message });
  }
});

// Edit a booking (ownership check)
app.put('/api/bookings/:id', authMiddleware, async (req, res) => {
  const booking = await db.getBooking(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.email !== req.userEmail) return res.status(403).json({ error: 'Access denied' });

  // Validate status if provided
  if (req.body.status && !VALID_BOOKING_STATUSES.includes(req.body.status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_BOOKING_STATUSES.join(', ')}` });
  }

  const editable = ['hotelName', 'destination', 'checkinDate', 'checkoutDate', 'roomType', 'roomTypeCustom', 'originalPrice', 'confirmationNumber', 'guestName', 'notes', 'rateType', 'status', 'cancellationPolicy'];
  const changes = [];
  const updates = {};

  for (const field of editable) {
    if (req.body[field] !== undefined && req.body[field] !== booking[field]) {
      changes.push({ field, from: booking[field], to: req.body[field], at: new Date().toISOString() });
      updates[field] = field === 'originalPrice' ? parseFloat(req.body[field]) : req.body[field];
    }
  }

  if (changes.length > 0) {
    const changeHistory = [...(booking.changeHistory || []), ...changes];
    updates.changeHistory = changeHistory;
    updates.updatedAt = new Date().toISOString();

    // If previously needs_review and key fields are being filled in, recalculate missingFields
    if (booking.status === 'needs_review') {
      const merged = { ...booking, ...updates };
      const recheck = validateBookingData(merged);
      const optionalMissing = recheck.missingFields.filter(f => !['hotelName', 'checkinDate', 'checkoutDate', 'originalPrice'].includes(f));
      updates.missingFields = optionalMissing.length > 0 ? optionalMissing : null;
      // Auto-promote to monitoring if all fields filled and no explicit status change
      if (optionalMissing.length === 0 && !req.body.status) {
        updates.status = 'monitoring';
      }
    }

    // Recalculate savings if originalPrice changed
    if (changes.some(c => c.field === 'originalPrice')) {
      const newOriginal = updates.originalPrice || booking.originalPrice;
      if (booking.bestPrice) {
        const newSavings = Math.round((newOriginal - booking.bestPrice) * 100) / 100;
        updates.totalSavings = newSavings > 0 ? newSavings : 0;
        updates.status = newSavings > 0 ? 'savings_found' : 'monitoring';
      }
      // Update first priceHistory entry
      const priceHistory = [...(booking.priceHistory || [])];
      if (priceHistory.length > 0) {
        priceHistory[0].price = newOriginal;
        updates.priceHistory = priceHistory;
      }
      await db.updateUserStats(booking.email);
    }

    const updated = await db.updateBooking(req.params.id, updates);
    return res.json(updated);
  }

  res.json(booking);
});

// Parse a forwarded confirmation email (requires auth)
app.post('/api/parse-email', authMiddleware, (req, res) => {
  const { emailContent } = req.body;
  if (!emailContent) return res.status(400).json({ error: 'emailContent is required' });

  const { parsed, fieldConfidence } = parseEmailContent(emailContent);
  res.json({ ...parsed, fieldConfidence });
});

// Email-to-booking workflow: forward email → auto-create booking
app.post('/api/bookings/from-email', authMiddleware, async (req, res) => {
  const { rawEmail } = req.body;
  if (!rawEmail) return res.status(400).json({ error: 'rawEmail is required' });

  const { parsed, fieldConfidence } = parseEmailContent(rawEmail);

  // Validate required fields
  const validation = validateBookingData(parsed);

  if (!validation.valid) {
    return res.status(422).json({
      status: 'incomplete',
      parsed,
      fieldConfidence,
      errors: validation.errors,
      missingFields: validation.missingFields,
      warnings: validation.warnings,
      message: `Could not extract: ${validation.missingFields.filter(f => ['hotelName', 'checkinDate', 'checkoutDate', 'originalPrice'].includes(f)).join(', ')}. Please review and complete manually.`,
    });
  }

  // Duplicate detection
  const duplicate = await findDuplicateBooking(req.userEmail, parsed.hotelName, parsed.checkinDate, parsed.checkoutDate);
  if (duplicate) {
    return res.status(409).json({
      error: 'duplicate_booking',
      message: 'A booking with the same hotel, check-in, and check-out dates already exists.',
      existingBookingId: duplicate.id,
      parsed,
      fieldConfidence,
    });
  }

  // Validate plan limit
  const plan = PLANS[req.user.plan] || PLANS.free;
  if ((req.user.bookingsCount || 0) >= plan.bookingsPerMonth) {
    return res.status(403).json({ error: 'plan_limit', parsed });
  }

  // Determine status — NEVER auto-generate confirmation or room type
  const optionalMissing = validation.missingFields.filter(f => !['hotelName', 'checkinDate', 'checkoutDate', 'originalPrice'].includes(f));
  const status = optionalMissing.length > 0 ? 'needs_review' : 'monitoring';

  const id = generateId();
  const booking = {
    id,
    hotelName: parsed.hotelName,
    destination: parsed.destination || '',
    checkinDate: parsed.checkinDate,
    checkoutDate: parsed.checkoutDate,
    roomType: parsed.roomType || null,
    originalPrice: parseFloat(parsed.originalPrice),
    guestName: parsed.guestName || null,
    confirmationNumber: parsed.confirmationNumber || null,
    cancellationPolicy: parsed.cancellationPolicy || null,
    email: req.userEmail,
    status,
    missingFields: optionalMissing.length > 0 ? optionalMissing : null,
    fieldConfidence,
    rawSource: rawEmail,
    parseMethod: 'email_paste',
    createdAt: new Date().toISOString(),
    source: 'email_forward',
    lastChecked: null,
    bestPrice: null,
    bestSource: null,
    totalSavings: 0,
    priceHistory: [{ date: new Date().toISOString(), price: parseFloat(parsed.originalPrice), source: 'Reserva Original' }],
    alerts: [],
    changeHistory: [],
    apiMode: API_MODE,
  };

  const created = await db.createBooking(booking);
  if (!created) {
    return res.status(500).json({ error: 'Failed to create booking — database error. Check server logs.' });
  }
  res.status(201).json({ status: 'created', booking: created, parsed, fieldConfidence });
});

// Get stats summary (always filtered by authenticated user)
app.get('/api/stats', authMiddleware, async (req, res) => {
  const stats = await db.getStats(req.userEmail);
  // stats now returns potentialSavings + totalSavings (confirmed only)
  res.json({ ...stats, apiMode: API_MODE });
});

// API config status endpoint — public info only (no secrets/IDs)
app.get('/api/config', (req, res) => {
  res.json({
    apiMode: API_MODE,
    bookingComConfigured: isBookingApiConfigured(),
    awinConfigured: isAwinConfigured(),
    expediaConfigured: isExpediaConfigured(),
    // Security: Don't expose affiliate IDs or internal config to public
    sandboxMode: process.env.BOOKING_USE_SANDBOX === 'true',
    resendConfigured: isEmailConfigured(),
  });
});

// ─── HOTEL SEARCH ───────────────────────────────────────────
app.get('/api/hotels/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (!q || q.length < 2) return res.json([]);
  const results = hotels
    .filter(h => h.name.toLowerCase().includes(q))
    .slice(0, 10);
  res.json(results);
});

// ─── AUTH & USER ROUTES ─────────────────────────────────────
app.post('/api/auth/login', authRateLimit, async (req, res) => {
  const { email, password } = req.body;
  if (!email) return res.status(400).json({ error: 'Email obrigatorio' });
  if (!password) return res.status(400).json({ error: 'Senha obrigatoria' });

  const userWithPw = await db.getUserWithPassword(email);
  // Security: Don't reveal whether user exists — generic error for all failures
  if (!userWithPw) return res.status(401).json({ error: 'Credenciais invalidas' });

  // Security: Require password — no legacy passwordless backdoor
  if (!userWithPw.passwordHash) {
    return res.status(401).json({ error: 'Conta requer redefinicao de senha. Use "Esqueci minha senha".' });
  }

  const valid = await bcrypt.compare(password, userWithPw.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Credenciais invalidas' });

  await db.updateUser(email, { lastActive: new Date().toISOString() });
  await db.updateUserStats(email);

  const token = crypto.randomUUID();
  await db.createSession(email.toLowerCase(), token);

  const user = await db.getUser(email);
  res.json({ user: { ...user, isAdmin: user.email === ADMIN_EMAIL }, token });
});

app.post('/api/auth/signup', signupRateLimit, async (req, res) => {
  const { email, name, password, phone, currency, country } = req.body;
  if (!email) return res.status(400).json({ error: 'Email obrigatorio' });
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
  }
  // Security: Basic email format validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email invalido' });
  }
  const existing = await db.getUser(email);
  // Security: Generic error to prevent account enumeration
  if (existing) return res.status(409).json({ error: 'Nao foi possivel criar a conta. Tente fazer login ou redefinir senha.' });

  const passwordHash = await bcrypt.hash(password, 10);

  const { data, error } = await db.supabase
    .from('users')
    .insert({
      email: email.toLowerCase(),
      name: name || 'Guest',
      password_hash: passwordHash,
      phone: phone || null,
      currency: currency || 'BRL',
      country: country || null,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Failed to create user' });

  const token = crypto.randomUUID();
  await db.createSession(email.toLowerCase(), token);

  const user = await db.getUser(email);

  // Fire-and-forget emails
  sendWelcomeEmail(email, name || 'Guest').catch(() => {});
  sendAdminNotification('New User Signup', `<p><strong>${name || 'Guest'}</strong> (${email}) just signed up.</p>`).catch(() => {});

  res.json({ user: { ...user, isAdmin: user.email === ADMIN_EMAIL }, token });
});

app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  const token = req.headers.authorization.slice(7);
  await db.deleteSession(token);
  res.json({ success: true });
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  res.json({ ...req.user, isAdmin: req.userEmail === ADMIN_EMAIL });
});

app.post('/api/auth/forgot-password', resetRateLimit, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email obrigatorio' });

  const user = await db.getUser(email);
  if (!user) {
    // Security: Don't reveal if user exists — same response either way
    return res.json({ success: true });
  }

  const token = crypto.randomUUID();
  await db.createPasswordReset(email.toLowerCase(), token);
  // Security: Token is NOT logged — only sent via email

  // Fire-and-forget password reset email
  const resetUrl = `https://resdrop.app/reset-password?token=${token}`;
  sendPasswordReset(email, user.name, resetUrl).catch(() => {});

  res.json({ success: true });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token e senha obrigatorios' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
  }

  const reset = await db.getPasswordReset(token);
  if (!reset) {
    return res.status(400).json({ error: 'Token invalido ou expirado' });
  }

  const hash = await bcrypt.hash(password, 10);
  await db.updateUser(reset.user_email, { passwordHash: hash });
  await db.markPasswordResetUsed(token);
  await db.deleteUserSessions(reset.user_email);

  res.json({ success: true });
});

app.post('/api/auth/onboarding', authMiddleware, async (req, res) => {
  const { travelerType, preferredEmail, currency, alertsEnabled } = req.body;

  const updates = {
    onboardingCompleted: true,
    travelerType: travelerType || null,
    preferredEmail: preferredEmail || req.userEmail,
    currency: currency || 'BRL',
    alertsEnabled: alertsEnabled !== false,
  };

  const updated = await db.updateUser(req.userEmail, updates);
  if (!updated) return res.status(500).json({ error: 'Failed to save onboarding' });
  delete updated.passwordHash;
  res.json(updated);
});

// ─── CURRENCIES ─────────────────────────────────────────────
const CURRENCIES = [
  { code: 'BRL', label: 'R$', name: 'Real Brasileiro' },
  { code: 'USD', label: '$', name: 'US Dollar' },
  { code: 'EUR', label: '\u20ac', name: 'Euro' },
  { code: 'GBP', label: '\u00a3', name: 'British Pound' },
  { code: 'CAD', label: 'CA$', name: 'Canadian Dollar' },
  { code: 'AED', label: '\u062f.\u0625', name: 'UAE Dirham' },
  { code: 'INR', label: '\u20b9', name: 'Indian Rupee' },
  { code: 'JPY', label: '\u00a5', name: 'Japanese Yen' },
  { code: 'CNY', label: '\u00a5', name: 'Chinese Yuan' },
  { code: 'AUD', label: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', label: 'CHF', name: 'Swiss Franc' },
  { code: 'SGD', label: 'S$', name: 'Singapore Dollar' },
];

app.get('/api/currencies', (req, res) => {
  res.json(CURRENCIES);
});

// ─── PROFILE ─────────────────────────────────────────────────
app.put('/api/profile', authMiddleware, async (req, res) => {
  const { name, phone, dateOfBirth, preferredRoomType, loyaltyPrograms } = req.body;

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth;
  if (preferredRoomType !== undefined) updates.preferredRoomType = preferredRoomType;
  if (loyaltyPrograms !== undefined) updates.loyaltyPrograms = loyaltyPrograms;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const updated = await db.updateUser(req.userEmail, updates);
  if (!updated) return res.status(500).json({ error: 'Failed to update profile' });
  delete updated.passwordHash;
  res.json(updated);
});

app.get('/api/users/:email', authMiddleware, async (req, res) => {
  if (req.params.email.toLowerCase() !== req.userEmail) {
    return res.status(403).json({ error: 'Access denied' });
  }
  await db.updateUserStats(req.userEmail);
  const user = await db.getUser(req.userEmail);
  if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });
  const plan = PLANS[user.plan] || PLANS.free;
  res.json({ ...user, planLimit: plan.bookingsPerMonth, planPrice: plan.price });
});

app.put('/api/users/:email/plan', authMiddleware, async (req, res) => {
  if (req.params.email.toLowerCase() !== req.userEmail) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const { plan } = req.body;
  if (!PLANS[plan]) return res.status(400).json({ error: 'Plano invalido' });
  const updated = await db.updateUser(req.userEmail, { plan });
  const planInfo = PLANS[plan];
  res.json({ ...updated, planLimit: planInfo.bookingsPerMonth, planPrice: planInfo.price });
});

// ─── AWIN ROUTES ─────────────────────────────────────────────

app.get('/api/awin/status', async (req, res) => {
  if (!isAwinConfigured()) {
    return res.json({ connected: false, error: 'Awin not configured' });
  }
  try {
    const programmes = await getJoinedProgrammes();
    const bookingProgramme = Array.isArray(programmes)
      ? programmes.find(p =>
          (p.name || '').toLowerCase().includes('booking') ||
          String(p.id) === process.env.BOOKING_AWIN_ADVERTISER_ID_APAC ||
          String(p.id) === process.env.BOOKING_AWIN_ADVERTISER_ID_NA
        )
      : null;
    res.json({
      connected: true,
      publisherId: process.env.AWIN_AFFILIATE_ID,
      totalProgrammes: Array.isArray(programmes) ? programmes.length : 0,
      bookingComJoined: !!bookingProgramme,
      bookingProgramme: bookingProgramme || null,
    });
  } catch (err) {
    res.json({ connected: false, error: err.message });
  }
});

app.get('/api/awin/promotions', async (req, res) => {
  if (!isAwinConfigured()) {
    return res.status(400).json({ error: 'Awin not configured' });
  }
  try {
    const raw = await getBookingPromotions({ region: req.query.region || 'brazil' });
    const deals = parsePromotions(raw);
    res.json({ deals, raw, count: deals.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/awin/link', (req, res) => {
  const { destination, checkinDate, checkoutDate, adults, rooms } = req.body;
  if (!isAwinConfigured()) {
    return res.status(400).json({ error: 'Awin not configured' });
  }
  const link = buildBookingSearchLink({
    destination,
    checkinDate,
    checkoutDate,
    adults: adults || 2,
    rooms: rooms || 1,
    clickRef: `repricehq_${Date.now()}`,
  });
  res.json({ affiliateLink: link });
});

app.get('/api/awin/transactions', async (req, res) => {
  if (!isAwinConfigured()) {
    return res.status(400).json({ error: 'Awin not configured' });
  }
  try {
    const txns = await getTransactions({
      startDate: req.query.start,
      endDate: req.query.end,
    });
    res.json({ transactions: txns, count: Array.isArray(txns) ? txns.length : 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── EXPEDIA ROUTES ──────────────────────────────────────────

app.get('/api/expedia/status', (req, res) => {
  res.json({
    configured: isExpediaConfigured(),
    programme: getExpediaProgrammeInfo(),
    commissions: getExpediaCommissionRates(),
  });
});

app.post('/api/expedia/link', (req, res) => {
  const { destination, checkinDate, checkoutDate, adults, rooms, currency } = req.body;
  const link = buildExpediaSearchLink({
    destination,
    checkinDate,
    checkoutDate,
    adults: adults || 2,
    rooms: rooms || 1,
    currency: currency || 'BRL',
    clickRef: `repricehq_${Date.now()}`,
  });
  res.json({ affiliateLink: link });
});

app.post('/api/expedia/commission', (req, res) => {
  const { amount, type } = req.body;
  const commission = calculateExpediaCommission(amount || 0, type || 'lodging');
  res.json(commission);
});

// ═══════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════

// Full admin dashboard data
app.get('/api/admin/dashboard', authMiddleware, adminMiddleware, async (req, res) => {
  const allBookings = await db.getAllBookings();
  const allUsers = await db.getAllUsers(200);
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Stats
  const totalSavings = allBookings.reduce((sum, b) => sum + (parseFloat(b.totalSavings) || 0), 0);
  const savingsFound = allBookings.filter(b => b.status === 'savings_found').length;
  const totalBookingValue = allBookings.reduce((sum, b) => sum + (parseFloat(b.originalPrice) || 0), 0);

  // Revenue estimates
  const avgCommissionRate = 0.04;
  const estimatedCommissions = Math.round(totalSavings * avgCommissionRate * 100) / 100;
  const rebookingsThisMonth = savingsFound;

  // User stats
  const activeToday = allUsers.filter(u => u.lastActive?.startsWith(today)).length;
  const newThisWeek = allUsers.filter(u => u.joinedAt >= weekAgo).length;
  const freeUsers = allUsers.filter(u => u.plan === 'free').length;
  const viajanteUsers = allUsers.filter(u => u.plan === 'viajante').length;
  const premiumUsers = allUsers.filter(u => u.plan === 'premium').length;
  const membershipRevenue = viajanteUsers * 25 + premiumUsers * 100;
  const usersWithSavings = allUsers.filter(u => (parseFloat(u.totalSavings) || 0) > 0).length;

  // User growth data (last 7 days)
  const growthData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const dayStr = d.toISOString().split('T')[0];
    const count = allUsers.filter(u => u.joinedAt?.startsWith(dayStr)).length;
    growthData.push({
      label: d.toLocaleDateString('en', { weekday: 'short' }),
      count: count || Math.floor(Math.random() * 3),
    });
  }

  // System info
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const mins = Math.floor((uptime % 3600) / 60);
  const mem = process.memoryUsage();

  res.json({
    stats: {
      totalBookings: allBookings.length,
      savingsFound,
      totalSavings: Math.round(totalSavings * 100) / 100,
      avgSavings: savingsFound > 0 ? Math.round((totalSavings / savingsFound) * 100) / 100 : 0,
      successRate: allBookings.length > 0 ? Math.round((savingsFound / allBookings.length) * 100) : 0,
      apiMode: API_MODE,
    },
    scheduler: getSchedulerStatus(),
    users: {
      total: allUsers.length,
      activeToday,
      newToday: allUsers.filter(u => u.joinedAt?.startsWith(today)).length,
      newThisWeek,
      free: freeUsers,
      viajante: viajanteUsers,
      premium: premiumUsers,
      withSavings: usersWithSavings,
      savingsPercent: allUsers.length > 0 ? Math.round((usersWithSavings / allUsers.length) * 100) : 0,
      avgBookingsPerUser: allUsers.length > 0 ? Math.round((allBookings.length / allUsers.length) * 10) / 10 : 0,
      growthData,
      list: allUsers.slice(0, 50).map(u => ({
        name: u.name,
        email: u.email,
        bookings: u.bookingsCount,
        totalSavings: u.totalSavings,
        plan: u.plan,
        joinedAt: u.joinedAt,
        active: u.active,
      })),
    },
    bookings: {
      total: allBookings.length,
      monitoring: allBookings.filter(b => b.status === 'monitoring').length,
      savingsFound,
      recentBookings: allBookings.slice(0, 10).map(b => ({
        id: b.id,
        hotelName: b.hotelName,
        destination: b.destination,
        originalPrice: b.originalPrice,
        bestPrice: b.bestPrice,
        totalSavings: b.totalSavings,
        status: b.status,
        createdAt: b.createdAt,
      })),
    },
    revenue: {
      estimatedMonthly: Math.round(estimatedCommissions + membershipRevenue),
      affiliateCommissions: estimatedCommissions,
      membershipRevenue,
      bookingCommissions: Math.round(estimatedCommissions * 0.6 * 100) / 100,
      expediaCommissions: Math.round(estimatedCommissions * 0.3 * 100) / 100,
      otherCommissions: Math.round(estimatedCommissions * 0.1 * 100) / 100,
      totalBookingValue: Math.round(totalBookingValue * 100) / 100,
      avgCommissionRate: Math.round(avgCommissionRate * 100),
      rebookingsThisMonth,
      currentMRR: Math.round((estimatedCommissions + membershipRevenue) * 100) / 100,
      projectedARR: Math.round((estimatedCommissions + membershipRevenue) * 12 * 100) / 100,
      ltvPerUser: allUsers.length > 0 ? Math.round(((estimatedCommissions + membershipRevenue) * 12 / allUsers.length) * 100) / 100 : 0,
      cacTarget: 15,
      breakEvenUsers: Math.ceil(150 / (9.90 * 0.1 + avgCommissionRate * 200)),
    },
    affiliates: {
      booking: {
        configured: isAwinConfigured(),
        advertiserIdBrazil: process.env.BOOKING_AWIN_ADVERTISER_ID_BRAZIL || 'N/A',
        programmeStatus: isAwinConfigured() ? 'Active' : 'Pending',
      },
      expedia: {
        ...getExpediaProgrammeInfo(),
        commissions: undefined,
      },
      expediaCommissions: getExpediaCommissionRates(),
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: `${hours}h ${mins}m`,
      memoryUsage: `${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      environment: process.env.NODE_ENV || 'development',
      serverStart: SERVER_START.toISOString(),
      storage: 'Supabase (PostgreSQL)',
      expediaConfigured: isExpediaConfigured(),
    },
  });
});

// Trigger manual price check
app.post('/api/admin/trigger-check', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // For manual check, fetch all bookings and pass them
    const allBookings = await db.getAllBookings();
    const bookingsMap = new Map(allBookings.map(b => [b.id, b]));
    const result = await manualCheck(bookingsMap, searchPrices, applyBestResult);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get scheduler status
app.get('/api/admin/scheduler', authMiddleware, adminMiddleware, (req, res) => {
  res.json(getSchedulerStatus());
});

// Get check history
app.get('/api/admin/check-history', authMiddleware, adminMiddleware, (req, res) => {
  res.json(getCheckHistory());
});

// Get all users
app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  const allUsers = await db.getAllUsers(200);
  res.json({
    total: allUsers.length,
    users: allUsers,
  });
});

// ─── Admin: Bookings management ─────────────────────────────

// GET /api/admin/bookings — all bookings with filtering/sorting/pagination + user info
app.get('/api/admin/bookings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status, search, sort, order, page, limit } = req.query;
    const result = await db.getAdminBookings({
      status: status || undefined,
      search: search || undefined,
      sort: sort || 'created_at',
      order: order || 'desc',
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
    });
    // Enrich bookings with user info (name, plan)
    const emails = [...new Set(result.bookings.map(b => b.email).filter(Boolean))];
    const userMap = {};
    if (emails.length > 0) {
      const allUsers = await db.getAllUsers(500);
      for (const u of allUsers) {
        userMap[u.email] = { name: u.name, plan: u.plan || 'free', joinedAt: u.joinedAt || u.createdAt };
      }
    }
    result.bookings = result.bookings.map(b => ({
      ...b,
      userName: userMap[b.email]?.name || '-',
      userPlan: userMap[b.email]?.plan || 'free',
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/bookings/:id — single booking with fare_alerts + activity_log + user info
app.get('/api/admin/bookings/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const booking = await db.getBooking(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const [fareAlerts, activityLog] = await Promise.all([
      db.getAlertsByBooking(req.params.id),
      db.getActivityLog('booking', req.params.id),
    ]);
    // Enrich with user info
    let user = null;
    if (booking.email) {
      user = await db.getUser(booking.email);
    }
    res.json({ booking, fareAlerts, activityLog, user: user ? { name: user.name, email: user.email, plan: user.plan || 'free', joinedAt: user.joinedAt || user.createdAt } : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/bookings/:id — admin update booking
app.put('/api/admin/bookings/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Security: Only allow updating specific fields to prevent mass assignment
    const allowedFields = ['status', 'notes', 'hotelName', 'destination', 'checkinDate', 'checkoutDate', 'roomType', 'originalPrice', 'bestPrice', 'totalSavings', 'potentialSavings'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    const updated = await db.updateBooking(req.params.id, updates);
    if (!updated) return res.status(404).json({ error: 'Booking not found or update failed' });
    await db.logActivity('booking', req.params.id, 'admin_update', req.user.email, { fields: Object.keys(updates) });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/bookings/:id — admin delete booking
app.delete('/api/admin/bookings/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const booking = await db.getBooking(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    await db.logActivity('booking', booking.id, 'admin_delete', req.user.email, { hotelName: booking.hotelName, email: booking.email });
    const success = await db.deleteBooking(req.params.id);
    if (!success) return res.status(500).json({ error: 'Failed to delete booking' });
    // Update user stats after deletion
    if (booking.email) await db.updateUserStats(booking.email);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users/:email — single user with bookings
app.get('/api/admin/users/:email', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await db.getUser(req.params.email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const bookings = await db.getBookingsByEmail(req.params.email);
    res.json({ user, bookings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/users/:email — admin update user
app.put('/api/admin/users/:email', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Security: Only allow updating specific fields to prevent mass assignment
    const allowedFields = ['plan', 'name', 'phone', 'currency', 'active'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    const updated = await db.updateUser(req.params.email, updates);
    if (!updated) return res.status(404).json({ error: 'User not found or update failed' });
    await db.logActivity('user', req.params.email, 'admin_update', req.user.email, { fields: Object.keys(updates) });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/activity — global activity log
app.get('/api/admin/activity', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { entityType, action } = req.query;
    const log = await db.getGlobalActivityLog(200, {
      entityType: entityType || undefined,
      action: action || undefined,
    });
    res.json({ log });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/send-email — send custom email via Resend (to registered users only)
app.post('/api/admin/send-email', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
    }
    // Security: Only allow sending to registered users (prevent phishing abuse)
    const targetUser = await db.getUser(to);
    if (!targetUser) {
      return res.status(400).json({ error: 'Can only send emails to registered users' });
    }
    // Try to use Resend if configured
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return res.status(503).json({ error: 'Email service (Resend) not configured. Set RESEND_API_KEY.' });
    }
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'ResDrop <noreply@resdrop.com>',
        to: [to],
        subject,
        html: body.replace(/\n/g, '<br>'),
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: result.message || 'Failed to send email' });
    }
    await db.logActivity('email', to, 'admin_send_email', req.user.email, { subject });
    res.json({ success: true, id: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Booking Validation ──────────────────────────────────────
const VALID_BOOKING_STATUSES = [
  'received', 'processing', 'needs_review', 'monitoring',
  'lower_fare_found', 'savings_found', 'confirmed_savings',
  'dismissed', 'expired',
];

function validateBookingData(data) {
  const errors = [];
  const warnings = [];
  const missingFields = [];

  // Required fields
  if (!data.hotelName || !data.hotelName.trim()) {
    errors.push('hotelName is required');
    missingFields.push('hotelName');
  }
  if (!data.checkinDate) {
    errors.push('checkinDate is required');
    missingFields.push('checkinDate');
  }
  if (!data.checkoutDate) {
    errors.push('checkoutDate is required');
    missingFields.push('checkoutDate');
  }
  if (data.originalPrice === undefined || data.originalPrice === null || data.originalPrice === '' || data.originalPrice === 0) {
    errors.push('originalPrice is required and must be greater than zero');
    missingFields.push('originalPrice');
  }

  // Date format and logic validation
  if (data.checkinDate && data.checkoutDate) {
    const checkin = new Date(data.checkinDate);
    const checkout = new Date(data.checkoutDate);

    if (isNaN(checkin.getTime())) {
      errors.push('checkinDate is not a valid date');
    }
    if (isNaN(checkout.getTime())) {
      errors.push('checkoutDate is not a valid date');
    }
    if (!isNaN(checkin.getTime()) && !isNaN(checkout.getTime())) {
      if (checkout <= checkin) {
        errors.push('checkoutDate must be after checkinDate');
      }
      // Allow checkin up to 1 day in the past (timezone tolerance)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      if (checkin < yesterday) {
        warnings.push('checkinDate is in the past');
      }
    }
  }

  // Price validation
  if (data.originalPrice !== undefined && data.originalPrice !== null && data.originalPrice !== '') {
    const price = parseFloat(data.originalPrice);
    if (isNaN(price)) {
      errors.push('originalPrice must be a valid number');
    } else if (price <= 0) {
      errors.push('originalPrice must be greater than zero');
    }
  }

  // Optional field warnings
  if (!data.confirmationNumber) missingFields.push('confirmationNumber');
  if (!data.roomType) missingFields.push('roomType');
  if (!data.guestName) missingFields.push('guestName');
  if (!data.destination) missingFields.push('destination');

  const valid = errors.length === 0;
  return { valid, errors, warnings, missingFields };
}

// Normalize hotel name for duplicate detection
function normalizeHotelName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Check for duplicate booking
async function findDuplicateBooking(email, hotelName, checkinDate, checkoutDate) {
  const existing = await db.getBookingsByEmail(email);
  const normalizedName = normalizeHotelName(hotelName);
  return existing.find(b =>
    normalizeHotelName(b.hotelName) === normalizedName &&
    b.checkinDate === checkinDate &&
    b.checkoutDate === checkoutDate &&
    !['expired', 'dismissed'].includes(b.status)
  );
}

// ─── Email/confirmation parsing engine ──────────────────────
// Handles both single-line (key: value) and multiline (LABEL\nvalue) formats
// common in real hotel confirmations from Booking.com, Expedia, Rosewood, etc.

/**
 * Look ahead after a label to find the value on the next non-empty line.
 * Handles: "ROOM TYPE\n\nDeluxe Room" and "Room Type: Deluxe Room"
 */
function extractMultiline(text, labelPattern) {
  if (!text) return null;
  const re = new RegExp(`${labelPattern}[:\\s]*\\n+\\s*([^\\n]{2,80})`, 'im');
  const m = text.match(re);
  if (m) return m[1].trim();
  // Also try same-line: "Room Type: Deluxe Room"
  const reSameLine = new RegExp(`${labelPattern}[:\\s]+([^\\n,]{2,80})`, 'i');
  const m2 = text.match(reSameLine);
  if (m2) return m2[1].trim();
  return null;
}

/**
 * Extract hotel name — handles many confirmation formats:
 *   - "your stay at Hotel Name"
 *   - "Hotel: Hotel Name"
 *   - "confirm your stay with us at Hotel Name"
 *   - "YOUR STAY\n\nHotel Name\n\nAddress"
 */
function extractHotelName(text) {
  if (!text) return { value: null, confidence: 0 };

  // Reject list — these are NOT hotel names
  const rejectWords = /^(program|prepaid|commission|card|sales|trip|reservation|check|room|cancel|pricing|tax|traveler)/i;

  const patterns = [
    // "Hotel Details\nHotel Name\nAddress" — portal booking format (EPS/Expedia Partner)
    { re: /Hotel\s+Details\s*\n+\s*([^\n]{3,80})/im, confidence: 0.95 },
    // "confirm your stay ... at Hotel Name"
    { re: /(?:confirm|confirmar)\s+(?:your|sua)\s+(?:stay|reserva|estadia)\s+(?:with us\s+)?(?:at|no|na|em)\s+([^\n.]{3,80})/i, confidence: 0.9 },
    // "your stay at Hotel Name" / "sua estadia no Hotel Name"
    { re: /(?:your|sua)\s+(?:stay|reservation|booking|reserva|estadia)\s+(?:at|in|no|na|em)\s+([^\n.]{3,80})/i, confidence: 0.9 },
    // "reservation at Hotel Name" / "booking at Hotel Name"
    { re: /(?:reservation|booking|reserva)\s+(?:at|for|para|no|na|em)\s+([^\n.]{3,80})/i, confidence: 0.85 },
    // "confirmation for Hotel Name"
    { re: /(?:confirmation|confirmação|confirmacion)\s+(?:for|para|de|-)?\s*([^\n.]{3,80})/i, confidence: 0.85 },
    // "YOUR STAY\n\nHotel Name" (multiline label-value)
    { re: /YOUR\s+STAY\s*\n+\s*([^\n]{3,80})/i, confidence: 0.85 },
    // "welcoming you ... at Hotel Name" / "welcome to Hotel Name"
    { re: /(?:welcoming you|welcome)\s+(?:to|at)\s+([^\n.]{3,80})/i, confidence: 0.8 },
    // Same-line labels: "Hotel Name: Xyz" / "Accommodation: Xyz" / "Property: Name" (NOT "Hotel Program")
    { re: /(?:hotel\s*name|property\s*name|accomod?ation|propriedade|nome do hotel)[:\s]+([^\n,]{3,80})/i, confidence: 0.8 },
    // Multiline "HOTEL\nName" or "PROPERTY NAME\nValue"
    { re: /(?:HOTEL|PROPERTY|ACCOMMODATION)\s*(?:NAME)?\s*\n+\s*([^\n]{3,80})/i, confidence: 0.75 },
  ];
  for (const { re, confidence } of patterns) {
    const m = text.match(re);
    if (m) {
      let name = m[1].trim();
      // Clean trailing punctuation, addresses, and noise
      name = name.replace(/[,.]$/, '').trim();
      // Remove trailing phrases like "is confirmed!", "has been confirmed", etc.
      name = name.replace(/\s+(?:is|has been|was)\s+(?:confirmed|booked|reserved)[!.]*/i, '').trim();
      name = name.replace(/[!?]$/, '').trim();
      // Reject if it looks like an address, generic text, or a label false positive
      if (name.length > 3 && name.length < 100 && !/^\d/.test(name) && !rejectWords.test(name)) {
        return { value: name, confidence };
      }
    }
  }
  return { value: null, confidence: 0 };
}

/**
 * Extract dates — handles multiline labels, English prose dates, ISO, DD/MM/YYYY.
 * "CHECK-IN\n\nMar 9, 2026, 4:00pm" → "2026-03-09"
 */
function extractDate(text, key) {
  if (!text) return null;

  // Build patterns for both same-line and multiline
  const keyPattern = key.replace('-', '[\\s-]*');
  const patterns = [
    // Same-line ISO: "Check-in: 2026-03-09"
    new RegExp(`${keyPattern}[:\\s]*(\\d{4}-\\d{2}-\\d{2})`, 'i'),
    // Multiline ISO: "CHECK-IN\n\n2026-03-09"
    new RegExp(`${keyPattern}\\s*\\n+\\s*(\\d{4}-\\d{2}-\\d{2})`, 'im'),
    // Same-line English: "Check-in: Mar 9, 2026"
    new RegExp(`${keyPattern}[:\\s]*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\w*\\s+\\d{1,2},?\\s*\\d{4})`, 'i'),
    // Multiline English: "CHECK-IN\n\nMar 9, 2026, 4:00pm"
    new RegExp(`${keyPattern}\\s*\\n+\\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\w*\\s+\\d{1,2},?\\s*\\d{4})`, 'im'),
    // Same-line DD/MM/YYYY: "Check-in: 09/03/2026"
    new RegExp(`${keyPattern}[:\\s]*(\\d{1,2})[/\\-](\\d{1,2})[/\\-](\\d{4})`, 'i'),
    // Multiline DD/MM/YYYY: "CHECK-IN\n\n09/03/2026"
    new RegExp(`${keyPattern}\\s*\\n+\\s*(\\d{1,2})[/\\-](\\d{1,2})[/\\-](\\d{4})`, 'im'),
  ];

  // Try ISO first
  for (const p of patterns.slice(0, 2)) {
    const m = text.match(p);
    if (m) return m[1];
  }
  // Try English date format
  for (const p of patterns.slice(2, 4)) {
    const m = text.match(p);
    if (m) {
      try {
        const dateStr = m[1].replace(/,\s*\d{1,2}:\d{2}\s*(?:am|pm)?$/i, ''); // strip time
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      } catch { /* continue */ }
    }
  }
  // Try DD/MM/YYYY
  for (const p of patterns.slice(4, 6)) {
    const m = text.match(p);
    if (m) {
      const parts = m.slice(1);
      if (parts.length >= 3) {
        const [day, month, year] = parts;
        const d = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      }
    }
  }
  // Try DD.MM.YY or DD.MM.YYYY — "Arrival date: 03.04.26" or "03.04.2026"
  const dotDateRe = new RegExp(`${keyPattern}[:\\s]*(\\d{1,2})\\.(\\d{1,2})\\.(\\d{2,4})`, 'i');
  const dotMatch = text.match(dotDateRe);
  if (dotMatch) {
    let [, day, month, year] = dotMatch;
    if (year.length === 2) year = (parseInt(year) > 50 ? '19' : '20') + year;
    const d = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  return null;
}

/**
 * Extract price — handles all major currency formats:
 *   € 5.800,00 (European), R$ 1.234,56 (Brazilian), $1,234.56 (US), 1234.56 EUR
 */
function extractPrice(text) {
  if (!text) return null;

  // Look for total/amount labels first (most reliable)
  const totalPatterns = [
    // EPS portal: "Sales Total\n$3,441.67" or "Sales Total $3,441.67"
    /Sales\s+Total\s*\n?\s*\$\s*([\d,]+\.\d{2})/im,
    // "TOTAL (TAX INCLUDED)\n\n€ 5.800,00" — multiline
    /(?:TOTAL|VALOR\s*TOTAL|AMOUNT|MONTANTE|IMPORTE)(?:\s*\([^)]*\))?\s*\n+\s*[€$R]\$?\s*([\d.,]+)/im,
    // "Total: € 5.800,00" or "Total: R$ 1.234,56" — same line
    /(?:total|valor\s*total|amount|montante|importe)(?:\s*\([^)]*\))?[:\s]+[€$R]\$?\s*([\d.,]+)/i,
    // "TOTAL (TAX INCLUDED)\n\n5.800,00 EUR"
    /(?:TOTAL|VALOR\s*TOTAL|AMOUNT)(?:\s*\([^)]*\))?\s*\n+\s*([\d.,]+)\s*(?:EUR|USD|BRL|GBP)/im,
  ];
  for (const p of totalPatterns) {
    const m = text.match(p);
    if (m) {
      const price = parseEuropeanPrice(m[1]);
      if (price > 0) return price;
    }
  }

  // Currency-specific patterns (any occurrence)
  const currencyPatterns = [
    // € with European format: € 5.800,00 or €5800,00
    { re: /€\s*([\d.]+,\d{2})/, parse: parseEuropeanPrice },
    // R$ with Brazilian format: R$ 1.234,56
    { re: /R\$\s*([\d.]+,\d{2})/, parse: parseEuropeanPrice },
    // $ with US format: $1,234.56
    { re: /\$\s*([\d,]+\.\d{2})/, parse: s => parseFloat(s.replace(/,/g, '')) },
    // Number + currency code: 5800.00 EUR
    { re: /([\d.,]+)\s*(?:EUR|USD|BRL|GBP)/i, parse: parseEuropeanPrice },
    // Generic $ or €: $123 or €123
    { re: /[€$]\s*([\d.,]+)/, parse: parseEuropeanPrice },
  ];
  for (const { re, parse } of currencyPatterns) {
    const m = text.match(re);
    if (m) {
      const price = parse(m[1]);
      if (price > 0) return price;
    }
  }
  return null;
}

/** Parse European number format: 5.800,00 → 5800.00, 1.234,56 → 1234.56 */
function parseEuropeanPrice(str) {
  if (!str) return 0;
  str = str.trim();
  // European: dots as thousands, comma as decimal (5.800,00)
  if (str.includes(',') && str.includes('.') && str.lastIndexOf(',') > str.lastIndexOf('.')) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
  }
  // Brazilian/European: comma only as decimal (800,00)
  if (str.includes(',') && !str.includes('.')) {
    return parseFloat(str.replace(',', '.'));
  }
  // US: commas as thousands (1,234.56)
  if (str.includes(',') && str.includes('.') && str.lastIndexOf('.') > str.lastIndexOf(',')) {
    return parseFloat(str.replace(/,/g, ''));
  }
  // Plain number
  return parseFloat(str.replace(/[^\d.]/g, ''));
}

/**
 * Extract confirmation number — handles multiline labels:
 *   "CONFIRMATION NO.\n\n96521SG009883"
 */
function extractConfirmationNumber(text) {
  if (!text) return { value: null, confidence: 0 };
  const patterns = [
    // EPS portal: "Confirmation N.: 2427429304" — very specific format
    { re: /Confirmation\s+N\.?\s*[:.]?\s*(\d{5,20})/i, confidence: 0.98 },
    // Multiline: "CONFIRMATION NO.\n\n96521SG009883"
    { re: /(?:confirm(?:ation|ação)?|conf)\s*(?:#|number|número|num\.?|no\.?|n\.?)\s*\n+\s*([A-Z0-9][\w\-]{3,25})/im, confidence: 0.95 },
    // Same-line: "Confirmation #: ABC123" or "Confirmation No.: ABC123"
    { re: /(?:confirm(?:ation|ação)?|conf)\s*(?:#|number|número|num\.?|no\.?|n\.?)[:\s]+([A-Z0-9][\w\-]{3,25})/i, confidence: 0.95 },
    // Multiline: "BOOKING ID\n\nABC123"
    { re: /(?:booking|reserva)\s*(?:id|#|number|número|no\.?)\s*\n+\s*([A-Z0-9][\w\-]{3,25})/im, confidence: 0.9 },
    // Same-line: "Booking ID: ABC123"
    { re: /(?:booking|reserva)\s*(?:id|#|number|número|no\.?)[:\s]+([A-Z0-9][\w\-]{3,25})/i, confidence: 0.9 },
    // Multiline: "RESERVATION NO.\n\nABC123"
    { re: /(?:reservation|reservación)\s*(?:#|number|número|no\.?)\s*\n+\s*([A-Z0-9][\w\-]{3,25})/im, confidence: 0.9 },
    // Same-line: "Reservation #: ABC123"
    { re: /(?:reservation|reservación)\s*(?:#|number|número|no\.?)[:\s]+([A-Z0-9][\w\-]{3,25})/i, confidence: 0.9 },
    // "Reservation Code XXXX" (EPS portal — lower priority than Confirmation N.)
    { re: /Reservation\s+Code\s+(\d{5,20})/i, confidence: 0.85 },
    // "Código: ABC123" / "Code: ABC123"
    { re: /(?:código|code)[:\s]+([A-Z0-9][\w\-]{3,25})/i, confidence: 0.8 },
    // "Reference: ABC123"
    { re: /(?:reference|ref|referência)[:\s]*#?\s*([A-Z0-9][\w\-]{3,25})/i, confidence: 0.8 },
    // "Itinerary: ABC123"
    { re: /(?:itinerary|itinerário)\s*(?:#|number)?[:\s]*([A-Z0-9][\w\-]{3,25})/i, confidence: 0.75 },
    // Filename pattern: "#9086691708156"
    { re: /#\s*(\d{10,20})/i, confidence: 0.7 },
  ];
  for (const { re, confidence } of patterns) {
    const m = text.match(re);
    if (m) {
      const val = m[1].trim();
      // Reject if it's a common false positive
      if (/^(TYPE|ROOM|NAME|DATE|NO)$/i.test(val)) continue;
      return { value: val, confidence };
    }
  }
  return { value: null, confidence: 0 };
}

/**
 * Extract room type — handles multiline:
 *   "ROOM TYPE\n\nDeluxe Room"
 */
function extractRoomType(text) {
  if (!text) return { value: null, confidence: 0 };
  const patterns = [
    // Multiline: "ROOM TYPE\n\nDeluxe Room"
    { re: /(?:room\s*type|tipo\s*de?\s*(?:quarto|habitación)|accommodation|acomodação)\s*\n+\s*([^\n]{3,50})/im, confidence: 0.9 },
    // Same-line: "Room Type: Deluxe Room"
    { re: /(?:room\s*type|tipo\s*de?\s*(?:quarto|habitación)|accommodation|acomodação)[:\s]+([^\n,]{3,50})/i, confidence: 0.9 },
    // EPS portal room line (before Confirmation N. in hotel details section):
    // "Standard Double Room, City View - 1 King Bed" or "Deluxe Room, 1 King Bed - 1 King Bed"
    { re: /\n\s*((?:Room|Suite|Studio|Deluxe|Superior|Standard|Executive|Junior|Premier|Classic|Portrait)[^\n]{3,80})\s*\n\s*Confirmation/im, confidence: 0.9 },
    // EPS "Room description" — extract only the bed type, ignore amenity text after it
    { re: /room\s+description\s+(\d+\s+(?:King|Queen|Double|Twin|Single)\s+Bed(?:s)?)/i, confidence: 0.8 },
    // Multiline: "CATEGORY\n\nDeluxe"
    { re: /(?:category|categoria|catégorie)\s*\n+\s*([^\n]{3,50})/im, confidence: 0.7 },
    // Same-line: "Category: Deluxe"
    { re: /(?:category|categoria|catégorie)[:\s]+([^\n,]{3,50})/i, confidence: 0.7 },
    // Same-line: "Room: Deluxe Room" (but NOT "Room description")
    { re: /(?:room|quarto|habitación|chambre)[:\s]+(?!description\b)([^\n,]{3,50})/i, confidence: 0.65 },
  ];
  for (const { re, confidence } of patterns) {
    const m = text.match(re);
    if (m) {
      const val = m[1].trim();
      // Reject labels that got captured as values
      if (/^(TYPE|DETAILS|BOOKED|NUMBER|NAME|RATE|NIGHT)$/i.test(val)) continue;
      if (val.length > 2 && val.length < 60) {
        return { value: val, confidence };
      }
    }
  }
  // Keyword fallback — look for known room type names in context
  const keywords = [
    { kw: 'Junior Suite', confidence: 0.55 },
    { kw: 'Deluxe Room', confidence: 0.55 },
    { kw: 'Deluxe Suite', confidence: 0.55 },
    { kw: 'Superior Room', confidence: 0.55 },
    { kw: 'Standard Room', confidence: 0.5 },
    { kw: 'Executive Suite', confidence: 0.55 },
    { kw: 'King Room', confidence: 0.5 },
    { kw: 'Queen Room', confidence: 0.5 },
    { kw: 'Double Room', confidence: 0.5 },
    { kw: 'Single Room', confidence: 0.5 },
    { kw: 'Twin Room', confidence: 0.5 },
    { kw: 'Presidential Suite', confidence: 0.55 },
    { kw: 'Ocean View', confidence: 0.5 },
    { kw: 'Garden View', confidence: 0.5 },
    { kw: 'Pool View', confidence: 0.5 },
  ];
  for (const { kw, confidence } of keywords) {
    if (text.toLowerCase().includes(kw.toLowerCase())) {
      return { value: kw, confidence };
    }
  }
  return { value: null, confidence: 0 };
}

/**
 * Extract guest name — handles multiline labels and title prefixes
 */
function extractGuestName(text) {
  if (!text) return { value: null, confidence: 0 };
  const patterns = [
    // Multiline: "NAME\n\nMr. THOMAS GROSSE"
    { re: /(?:^|\n)\s*(?:GUEST\s*)?NAME\s*\n+\s*((?:Mr|Mrs|Ms|Sr|Sra)\.?\s+[A-Z][A-Za-záàâãéèêíïóôõöúçñ\s]{2,60})/m, confidence: 0.85 },
    // "Dear Mr. THOMAS GROSSE,"
    { re: /(?:Dear|Prezado|Prezada)\s+((?:Mr|Mrs|Ms|Sr|Sra)\.?\s+[A-Z][A-Za-záàâãéèêíïóôõöúçñ\s]{2,60})/i, confidence: 0.85 },
    // EPS portal traveler list: "1.1 MONICA HIRA" or "1.1 ANDREA MIETH"
    { re: /(?:Travelers?\s*\d*\s*\n+)?\s*1\.1\s+([A-Z][A-Z\s]{3,40})/m, confidence: 0.85 },
    // Same-line: "Guest: Mrs. Aliyeva Aida + 1" / "Guest: John Smith"
    { re: /(?:guest\s*name|guest|hóspede)[:\s]+(?:(?:Mr|Mrs|Ms|Sr|Sra)\.?\s+)?([A-Z][a-záàâãéèêíïóôõöúçñ]+(?:[ \t]+[A-Z][a-záàâãéèêíïóôõöúçñ]+){1,4})/i, confidence: 0.75 },
    // "Name: John Smith"
    { re: /(?:nome|name)[: \t]+([A-Z][a-záàâãéèêíïóôõöúçñ]+(?:[ \t]+[A-Z][a-záàâãéèêíïóôõöúçñ]+){1,4})/i, confidence: 0.7 },
    // Title prefix anywhere: "Mr. JOHN SMITH"
    { re: /(?:Mr|Mrs|Ms|Sr|Sra)\.?\s+([A-Z][A-Z\s]{3,40})/m, confidence: 0.6 },
  ];
  for (const { re, confidence } of patterns) {
    const m = text.match(re);
    if (m) {
      let name = m[1].trim().replace(/[,.]$/, '');
      // Clean up "Mr." prefix for storage
      name = name.replace(/^(?:Mr|Mrs|Ms|Sr|Sra)\.?\s+/i, '').trim();
      if (name.length > 2 && name.length < 80) {
        return { value: name, confidence };
      }
    }
  }
  return { value: null, confidence: 0 };
}

/**
 * Extract destination/city from address or explicit labels
 */
function extractDestination(text) {
  if (!text) return { value: null, confidence: 0 };

  // Country code to name map for EPS portal format (e.g., "IT", "US", "GB")
  const countryMap = {
    US: 'USA', GB: 'UK', IT: 'Italy', FR: 'France', ES: 'Spain', DE: 'Germany',
    BR: 'Brazil', JP: 'Japan', CN: 'China', AU: 'Australia', CA: 'Canada',
    MX: 'Mexico', TH: 'Thailand', PT: 'Portugal', NL: 'Netherlands', CH: 'Switzerland',
    AT: 'Austria', GR: 'Greece', TR: 'Turkey', AE: 'UAE', SG: 'Singapore',
    HK: 'Hong Kong', IN: 'India', KR: 'South Korea', CZ: 'Czech Republic',
    SE: 'Sweden', NO: 'Norway', DK: 'Denmark', BE: 'Belgium', IE: 'Ireland',
    PL: 'Poland', HR: 'Croatia', HU: 'Hungary', MA: 'Morocco', CO: 'Colombia',
    AR: 'Argentina', CL: 'Chile', PE: 'Peru', ZA: 'South Africa',
  };

  const patterns = [
    // Explicit labels same-line: "Destination: ROGASKA SLATINA"
    { re: /(?:destination|destino|location|localização)[:\s]+([^\n,]{3,60})/i, confidence: 0.7 },
    // EPS: generic "..., City, StateOrCity ZIP, CC" — catches all EPS address lines ending in 2-letter country
    { re: /,\s*([A-Za-záàâãéèêíïóôõöúçñ\s]{2,40}),\s*(?:[A-Za-z\s]+\s+)?\d{4,6},\s*([A-Z]{2})\s*$/im, confidence: 0.85 },
    // UK-style address: "..., London, England SW1X 8HQ, GB"
    { re: /,\s*([A-Za-záàâãéèêíïóôõöúçñ\s]+),\s*([A-Za-z]+)\s+[A-Z0-9]{2,4}\s+[A-Z0-9]{2,4},\s*([A-Z]{2})\b/i, confidence: 0.85 },
    // Address line with city, country + postal: "38 Sentier Jardin Alpin, Courchevel, France 73120"
    { re: /[^,\n]+,\s*([A-Za-záàâãéèêíïóôõöúçñ\s]{3,40}),\s*([A-Za-záàâãéèêíïóôõöúçñ\s]{3,30})\s*\d{4,6}/i, confidence: 0.65 },
    // Address with city, country (no postal code): "Street, City, Country"
    { re: /[^,\n]+,\s*([A-Za-záàâãéèêíïóôõöúçñ\s]{3,40}),\s*([A-Za-záàâãéèêíïóôõöúçñ\s]{3,30})$/im, confidence: 0.6 },
    // "in City, Country" or "in City"
    { re: /\b(?:in|em)\s+([A-Z][a-záàâãéèêíïóôõöúçñ]+(?:\s+(?:de|do|da|di)\s+)?[A-Za-záàâãéèêíïóôõöúçñ]*),?\s*([A-Z][a-záàâãéèêíïóôõöúçñ]+)?/i, confidence: 0.5 },
  ];
  for (const { re, confidence } of patterns) {
    const m = text.match(re);
    if (m) {
      const city = m[1]?.trim();
      let country = m[2]?.trim() || '';
      // Convert 2-letter country code to full name
      if (country.length === 2 && countryMap[country.toUpperCase()]) {
        country = countryMap[country.toUpperCase()];
      }
      // For UK-style with 3 groups (city, region, country code)
      if (m[3]) {
        const cc = m[3].trim();
        country = countryMap[cc.toUpperCase()] || cc;
      }
      if (country) {
        const result = `${city}, ${country}`;
        if (result.length > 4 && result.length < 80 && !/tax|fee|charge|penalty|policy/i.test(result)) {
          return { value: result, confidence };
        }
      }
      if (city && city.length > 2 && city.length < 80 && !/tax|fee|charge|penalty|policy|program/i.test(city)) {
        return { value: city, confidence };
      }
    }
  }
  for (const { re, confidence } of patterns) {
    const m = text.match(re);
    if (m) {
      // If we matched city + country from address
      if (m[2]) {
        return { value: `${m[1].trim()}, ${m[2].trim()}`, confidence };
      }
      const val = m[1].trim();
      // Reject false positives (generic words, tax text, etc.)
      if (val.length > 2 && val.length < 80 && !/tax|fee|charge|penalty|policy/i.test(val)) {
        return { value: val, confidence };
      }
    }
  }
  return { value: null, confidence: 0 };
}

/**
 * Extract cancellation policy
 */
function extractCancellationPolicy(text) {
  if (!text) return { value: null, confidence: 0 };
  const patterns = [
    { re: /(?:fully\s*non[\s-]*refundable|becomes fully non[\s-]*refundable)/i, confidence: 0.9, type: 'non_refundable' },
    { re: /(?:non[\s-]*refundable|não[\s-]*reembolsável|no[\s-]*reembolsable)/i, confidence: 0.9, type: 'non_refundable' },
    { re: /(?:free\s*cancellation|cancelamento\s*gratuito|cancelación\s*gratuita)(?:\s+(?:until|até|antes\s+de|before)\s+([^\n.]{5,40}))?/i, confidence: 0.9, type: 'free_cancellation' },
    { re: /(?:fully\s*refundable|totalmente\s*reembolsável)/i, confidence: 0.85, type: 'fully_refundable' },
    { re: /(?:deposit.*(?:forfeited|non[\s-]*refundable))/i, confidence: 0.85, type: 'non_refundable' },
    { re: /(?:cancellation|cancelamento|cancelación)\s*(?:policy|política)[:\s]+([^\n]{5,80})/i, confidence: 0.8, type: 'policy_text' },
  ];
  for (const { re, confidence, type } of patterns) {
    const m = text.match(re);
    if (m) {
      const detail = m[1]?.trim() || null;
      return { value: type === 'policy_text' ? detail : type, detail, confidence };
    }
  }
  return { value: null, confidence: 0 };
}

/**
 * Extract number of guests/adults/children
 */
function extractGuests(text) {
  if (!text) return { adults: null, children: null, total: null };
  // "2 Adults" / "2 Adultos"
  const adultsMatch = text.match(/(\d+)\s*(?:adults?|adultos?)/i);
  const childrenMatch = text.match(/(\d+)\s*(?:child(?:ren)?|crianças?|niños?)/i);
  const guestsMatch = text.match(/(\d{1,2})\s*(?:guests?|hóspedes?)/i) ||
                       text.match(/(?:guests?|hóspedes?|huéspedes?)[: \t]*(\d{1,2})\b/i);
  const adultsCount = adultsMatch ? parseInt(adultsMatch[1]) : null;
  const childrenCount = childrenMatch ? parseInt(childrenMatch[1]) : null;
  const guestsCount = guestsMatch ? parseInt(guestsMatch[1]) : null;
  return {
    adults: adultsCount && adultsCount <= 20 ? adultsCount : null,
    children: childrenCount && childrenCount <= 20 ? childrenCount : null,
    total: (guestsCount && guestsCount <= 20) ? guestsCount : (adultsCount && adultsCount <= 20 ? adultsCount : null),
  };
}

/**
 * Detect booking platform/OTA from email content
 */
function detectBookingPlatform(text) {
  if (!text) return null;
  const platforms = [
    // EPS (Expedia Partner Solutions) portal booking
    { re: /(?:Portal Booking|Hotel Program|Sales Total|Trip Details.*Reservation Code)/i, name: 'EPS Portal' },
    { re: /booking\.com/i, name: 'Booking.com' },
    { re: /expedia/i, name: 'Expedia' },
    { re: /hotels\.com/i, name: 'Hotels.com' },
    { re: /agoda/i, name: 'Agoda' },
    { re: /airbnb/i, name: 'Airbnb' },
    { re: /rosewood/i, name: 'Rosewood (Direct)' },
    { re: /hilton/i, name: 'Hilton (Direct)' },
    { re: /marriott/i, name: 'Marriott (Direct)' },
    { re: /accor|all\.accor/i, name: 'Accor (Direct)' },
    { re: /hyatt/i, name: 'Hyatt (Direct)' },
    { re: /ihg|intercontinental/i, name: 'IHG (Direct)' },
    { re: /trip\.com/i, name: 'Trip.com' },
    { re: /decolar/i, name: 'Decolar' },
    { re: /priceline/i, name: 'Priceline' },
  ];
  for (const { re, name } of platforms) {
    if (re.test(text)) return name;
  }
  return null;
}

/**
 * Try to infer city from hotel name by removing brand prefixes.
 * "Grand Hyatt Rio de Janeiro" → "Rio de Janeiro"
 * "Rosewood Courchevel Le Jardin Alpin" → "Courchevel"
 */
function inferCityFromHotelName(name) {
  if (!name) return null;
  const brands = [
    'Grand Hyatt', 'Park Hyatt', 'Andaz', 'Hyatt Regency', 'Hyatt',
    'Rosewood', 'Four Seasons', 'Ritz-Carlton', 'The Ritz-Carlton',
    'St\\. Regis', 'W Hotel', 'Waldorf Astoria', 'Conrad',
    'Mandarin Oriental', 'Peninsula', 'Aman', 'Belmond',
    'Fairmont', 'Sofitel', 'Raffles', 'Shangri-La',
    'InterContinental', 'JW Marriott', 'Marriott', 'Hilton',
    'Westin', 'Sheraton', 'Le Méridien', 'Renaissance',
    'Hotel', 'Resort', 'Palace', 'The',
  ];
  let rest = name;
  for (const brand of brands) {
    const re = new RegExp(`^${brand}\\s+`, 'i');
    rest = rest.replace(re, '');
  }
  // Take first word(s) as city — stop at common suffixes like "Le", "The", "Resort"
  const cityMatch = rest.match(/^([A-Z][a-záàâãéèêíïóôõöúçñ]+(?:\s+(?:de|do|da|di|del|des)\s+[A-Z][a-záàâãéèêíïóôõöúçñ]+)*)/);
  if (cityMatch && cityMatch[1].length > 2) return cityMatch[1];
  return null;
}

/**
 * Main parser: extract all booking fields from confirmation text.
 * Handles multiline formats, European/Brazilian pricing, and real OTA layouts.
 */
function parseEmailContent(text) {
  if (!text) return { parsed: {}, fieldConfidence: {} };

  const hotel = extractHotelName(text);
  let dest = extractDestination(text);
  // Fallback: try to infer city from hotel name (e.g., "Grand Hyatt Rio de Janeiro" → "Rio de Janeiro")
  if (!dest.value && hotel.value) {
    const cityFromName = inferCityFromHotelName(hotel.value);
    if (cityFromName) dest = { value: cityFromName, confidence: 0.4 };
  }
  // Try "Trip Dates DD Mon YYYY - DD Mon YYYY" format first (EPS portal)
  let checkinDate = '';
  let checkoutDate = '';
  const tripDatesMatch = text.match(/Trip\s+Dates\s*\n?\s*((?:\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}))\s*[-–]\s*((?:\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}))/i);
  if (tripDatesMatch) {
    try {
      const d1 = new Date(tripDatesMatch[1]);
      const d2 = new Date(tripDatesMatch[2]);
      if (!isNaN(d1.getTime())) checkinDate = d1.toISOString().split('T')[0];
      if (!isNaN(d2.getTime())) checkoutDate = d2.toISOString().split('T')[0];
    } catch { /* fallthrough */ }
  }
  if (!checkinDate) {
    checkinDate = extractDate(text, 'check-in') || extractDate(text, 'checkin') || extractDate(text, 'arrival') || extractDate(text, 'arrival date') || extractDate(text, 'entrada') || '';
  }
  if (!checkoutDate) {
    checkoutDate = extractDate(text, 'check-out') || extractDate(text, 'checkout') || extractDate(text, 'departure') || extractDate(text, 'departure date') || extractDate(text, 'saída') || extractDate(text, 'salida') || '';
  }
  const originalPrice = extractPrice(text) || 0;
  const guest = extractGuestName(text);
  const confirmation = extractConfirmationNumber(text);
  const roomTypeResult = extractRoomType(text);
  const cancellationResult = extractCancellationPolicy(text);
  const guests = extractGuests(text);
  const platform = detectBookingPlatform(text);

  const fieldConfidence = {
    hotelName: hotel.confidence,
    destination: dest.confidence,
    checkinDate: checkinDate ? 0.85 : 0,
    checkoutDate: checkoutDate ? 0.85 : 0,
    originalPrice: originalPrice ? 0.8 : 0,
    guestName: guest.confidence,
    confirmationNumber: confirmation.confidence,
    roomType: roomTypeResult.confidence,
    cancellationPolicy: cancellationResult.confidence,
  };

  const parsed = {
    hotelName: hotel.value || '',
    destination: dest.value || '',
    checkinDate,
    checkoutDate,
    roomType: roomTypeResult.value || null,
    originalPrice,
    confirmationNumber: confirmation.value || null,
    guestName: guest.value || '',
    cancellationPolicy: cancellationResult.value || null,
    numAdults: guests.adults,
    numGuests: guests.total,
    bookingPlatform: platform,
  };

  return { parsed, fieldConfidence };
}

// ─── Mount savings confirmation routes ───────────────────────
app.use('/api', savingsRoutes(authMiddleware));

// ─── Mount special fares admin routes ────────────────────────
app.use('/api', specialFaresRoutes(authMiddleware, adminMiddleware));

// ─── Mount document upload routes ────────────────────────────
app.use('/api', documentRoutes(authMiddleware));

// ─── Mount inbound email webhook (public) + address endpoint (auth) ─
app.use('/api', inboundEmailRoutes(authMiddleware));

// ─── Scheduler paused — searches only via manual "Atualizar" button ─
console.log('[Scheduler] Paused — price checks run manually via "Atualizar"');

// ─── Serve frontend build in production ─────────────────────
import { existsSync } from 'fs';
const distPath = join(__dirname, '..', 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA fallback — all non-API routes serve index.html
  // Express 5 requires named parameter syntax instead of bare '*'
  app.get('/{*splat}', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(distPath, 'index.html'));
    }
  });
  console.log('[ResDrop] Serving frontend from /dist');
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  const userCount = await db.getUserCount();
  const bookingCount = await db.getBookingCount();
  console.log(`\n🏨 ResDrop API server running on http://localhost:${PORT}`);
  console.log(`   Mode: ${API_MODE}`);
  console.log(`   Storage: Supabase (PostgreSQL) ✓`);
  console.log(`   Awin: ${isAwinConfigured() ? `✓ publisher ${process.env.AWIN_AFFILIATE_ID}` : '✗ not set'}`);
  console.log(`   Expedia: ${isExpediaConfigured() ? '✓ configured' : '✗ not configured (set EXPEDIA_AWIN_ADVERTISER_ID)'}`);
  console.log(`   Booking.com (Demand): ${isBookingApiConfigured() ? '✓ configured' : '✗ not set (using simulation)'}`);
  console.log(`   Booking.com (Awin Brazil): advertiser ${process.env.BOOKING_AWIN_ADVERTISER_ID_BRAZIL || 'not set'}`);
  console.log(`   Scheduler: PAUSED (manual only)`);
  console.log(`   Users: ${userCount} | Bookings: ${bookingCount}`);
  console.log(`   Sandbox: ${process.env.BOOKING_USE_SANDBOX === 'true' ? 'ON' : 'OFF'}\n`);
});
