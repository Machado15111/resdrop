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
const BLOCKED_SOURCES_DISPLAY = ['oyo', 'oyorooms', 'elmisti', 'el misti', 'hostel-bb', 'hotel-bb', 'hostelclub', 'hostelling'];

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
async function applyBestResult(booking, results) {
  booking.lastChecked = new Date().toISOString();
  booking.latestResults = results;
  booking.checkCount = (booking.checkCount || 0) + 1;

  const exactMatches = results.filter(r => r.isExactMatch);
  const alternatives = results.filter(r => !r.isExactMatch);
  booking.alternatives = alternatives.slice(0, 5);

  if (exactMatches.length > 0) {
    const bestExact = exactMatches[0]; // sorted by price ascending
    const currentPrice = bestExact.totalPrice;

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
      source: bestExact.source,
    });

    // Keep JSONB alerts for backward compat, but also write to fare_alerts table
    if (!booking.alerts) booking.alerts = [];

    let alertType, alertMessage;

    if (diff > 0) {
      // PRICE DROP — set as potential savings (NOT confirmed yet)
      if (!booking.bestPrice || currentPrice < booking.bestPrice) {
        booking.bestPrice = currentPrice;
        booking.bestSource = bestExact.source;
        booking.potentialSavings = diff;
        // Only set lower_fare_found if not already confirmed
        if (booking.status !== 'confirmed_savings') {
          booking.status = 'lower_fare_found';
        }
      }
      alertType = 'price_drop';
      alertMessage = `📉 Preco caiu: R$${currentPrice} via ${bestExact.source} — economia potencial R$${diff}`;
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
      alertMessage = `➡️ Preco estavel: R$${currentPrice} via ${bestExact.source}`;
      booking.alerts.push({
        id: generateId(),
        date: new Date().toISOString(),
        type: alertType,
        message: alertMessage,
        savings: 0,
      });
    } else {
      alertType = 'price_increase';
      alertMessage = `📈 Preco subiu: R$${currentPrice} via ${bestExact.source} (+R$${Math.abs(diff)})`;
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
        source: bestExact.source,
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
        details: { currentPrice, originalPrice: effectiveOriginal, diff, source: bestExact.source },
      });
    } catch (err) {
      console.error('[applyBestResult] Failed to log activity:', err.message);
    }
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
    } = req.body;

    if (!hotelName || !checkinDate || !checkoutDate || !originalPrice) {
      return res.status(400).json({ error: 'Missing required fields: hotelName, checkinDate, checkoutDate, originalPrice' });
    }
    if (new Date(checkoutDate) <= new Date(checkinDate)) {
      return res.status(400).json({ error: 'Check-out must be after check-in' });
    }
    if (parseFloat(originalPrice) <= 0) {
      return res.status(400).json({ error: 'Price must be greater than zero' });
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

    const id = generateId();
    const booking = {
      id,
      hotelName,
      destination: destination || '',
      checkinDate,
      checkoutDate,
      roomType: roomType || 'Standard Room',
      originalPrice: parseFloat(originalPrice),
      guestName: guestName || req.user.name || 'Guest',
      confirmationNumber: confirmationNumber || `CONF-${id.slice(0, 8).toUpperCase()}`,
      email: req.userEmail,
      status: 'monitoring',
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

  const editable = ['hotelName', 'destination', 'checkinDate', 'checkoutDate', 'roomType', 'roomTypeCustom', 'originalPrice', 'confirmationNumber', 'guestName', 'notes', 'rateType'];
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
  const parsed = {
    hotelName: extractField(emailContent, 'hotel') || extractField(emailContent, 'property') || '',
    destination: extractField(emailContent, 'destination') || extractField(emailContent, 'city') || extractField(emailContent, 'location') || '',
    checkinDate: extractDate(emailContent, 'check-in') || extractDate(emailContent, 'checkin') || extractDate(emailContent, 'arrival') || '',
    checkoutDate: extractDate(emailContent, 'check-out') || extractDate(emailContent, 'checkout') || extractDate(emailContent, 'departure') || '',
    roomType: extractField(emailContent, 'room') || extractField(emailContent, 'accommodation') || 'Standard Room',
    originalPrice: extractPrice(emailContent) || 0,
    confirmationNumber: extractField(emailContent, 'confirmation') || extractField(emailContent, 'booking') || extractField(emailContent, 'reservation') || '',
    guestName: extractField(emailContent, 'guest') || extractField(emailContent, 'name') || '',
  };
  res.json(parsed);
});

// Email-to-booking workflow: forward email → auto-create booking
app.post('/api/bookings/from-email', authMiddleware, async (req, res) => {
  const { rawEmail } = req.body;
  if (!rawEmail) return res.status(400).json({ error: 'rawEmail is required' });

  const parsed = {
    hotelName: extractField(rawEmail, 'hotel') || extractField(rawEmail, 'property') || '',
    destination: extractField(rawEmail, 'destination') || extractField(rawEmail, 'city') || extractField(rawEmail, 'location') || '',
    checkinDate: extractDate(rawEmail, 'check-in') || extractDate(rawEmail, 'checkin') || extractDate(rawEmail, 'arrival') || '',
    checkoutDate: extractDate(rawEmail, 'check-out') || extractDate(rawEmail, 'checkout') || extractDate(rawEmail, 'departure') || '',
    roomType: extractField(rawEmail, 'room') || 'Standard Room',
    originalPrice: extractPrice(rawEmail) || 0,
    confirmationNumber: extractField(rawEmail, 'confirmation') || extractField(rawEmail, 'booking number') || '',
    guestName: extractField(rawEmail, 'guest') || extractField(rawEmail, 'name') || '',
  };

  const missing = [];
  if (!parsed.hotelName) missing.push('hotelName');
  if (!parsed.checkinDate) missing.push('checkinDate');
  if (!parsed.checkoutDate) missing.push('checkoutDate');
  if (!parsed.originalPrice) missing.push('originalPrice');

  if (missing.length > 0) {
    return res.status(422).json({
      status: 'incomplete',
      parsed,
      missing,
      message: `Could not extract: ${missing.join(', ')}. Please review and complete manually.`,
    });
  }

  // Validate plan limit
  const plan = PLANS[req.user.plan] || PLANS.free;
  if ((req.user.bookingsCount || 0) >= plan.bookingsPerMonth) {
    return res.status(403).json({ error: 'plan_limit', parsed });
  }

  const id = generateId();
  const booking = {
    id,
    ...parsed,
    email: req.userEmail,
    originalPrice: parseFloat(parsed.originalPrice),
    confirmationNumber: parsed.confirmationNumber || `CONF-${id.slice(0, 8).toUpperCase()}`,
    status: 'monitoring',
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
  res.status(201).json({ status: 'created', booking: created, parsed });
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

// GET /api/admin/bookings — all bookings with filtering/sorting/pagination
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
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/bookings/:id — single booking with fare_alerts + activity_log
app.get('/api/admin/bookings/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const booking = await db.getBooking(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const [fareAlerts, activityLog] = await Promise.all([
      db.getAlertsByBooking(req.params.id),
      db.getActivityLog('booking', req.params.id),
    ]);
    res.json({ booking, fareAlerts, activityLog });
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

// ─── Email parsing helpers ───────────────────────────────────
function extractField(text, key) {
  if (!text) return null;
  const patterns = [
    new RegExp(`${key}[:\\s]+([^\\n,]+)`, 'i'),
    new RegExp(`${key}[:\\s]*"([^"]+)"`, 'i'),
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

function extractDate(text, key) {
  if (!text) return null;
  const m = text.match(new RegExp(`${key}[:\\s]*(\\d{4}-\\d{2}-\\d{2})`, 'i'));
  if (m) return m[1];
  const m2 = text.match(new RegExp(`${key}[:\\s]*(\\w+ \\d{1,2},?\\s*\\d{4})`, 'i'));
  if (m2) {
    try { return new Date(m2[1]).toISOString().split('T')[0]; }
    catch { return null; }
  }
  return null;
}

function extractPrice(text) {
  if (!text) return null;
  const m = text.match(/\$\s*([\d,]+\.?\d*)/);
  if (m) return parseFloat(m[1].replace(',', ''));
  const m2 = text.match(/([\d,]+\.?\d*)\s*(?:USD|usd|dollars|BRL|R\$)/);
  if (m2) return parseFloat(m2[1].replace(',', ''));
  return null;
}

// ─── Mount savings confirmation routes ───────────────────────
app.use('/api', savingsRoutes(authMiddleware));

// ─── Mount special fares admin routes ────────────────────────
app.use('/api', specialFaresRoutes(authMiddleware, adminMiddleware));

// ─── Mount document upload routes ────────────────────────────
app.use('/api', documentRoutes(authMiddleware));

// ─── Scheduler paused — searches only via manual "Atualizar" button ─
console.log('[Scheduler] Paused — price checks run manually via "Atualizar"');

// ─── Serve frontend build in production ─────────────────────
import { existsSync } from 'fs';
const distPath = join(__dirname, '..', 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA fallback — all non-API routes serve index.html
  app.get('*', (req, res) => {
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
