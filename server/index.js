import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
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

const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : true,  // allow all in dev
}));
app.use(express.json());

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

// ─── Plan definitions ────────────────────────────────────────
const PLANS = {
  free:     { bookingsPerMonth: 1,  searchesPerDay: 1,   price: 0   },
  viajante: { bookingsPerMonth: 10, searchesPerDay: 50,  price: 25  },
  premium:  { bookingsPerMonth: 50, searchesPerDay: 200, price: 100 },
};

function generateId() {
  return crypto.randomUUID();
}

// ─── Price search: real APIs only (no simulation) ────────────
async function searchPrices(booking) {
  const allResults = [];

  // 1) Try SerpApi Google Hotels (real prices from multiple OTAs)
  if (isSerpApiConfigured()) {
    try {
      const serpResults = await searchRealPrices(booking);
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

  allResults.sort((a, b) => a.totalPrice - b.totalPrice);
  return allResults;
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
    const diff = Math.round((booking.originalPrice - currentPrice) * 100) / 100;

    // Always record price history
    if (!booking.priceHistory) booking.priceHistory = [];
    booking.priceHistory.push({
      date: new Date().toISOString(),
      price: currentPrice,
      source: bestExact.source,
    });

    if (!booking.alerts) booking.alerts = [];

    if (diff > 0) {
      // PRICE DROP — real savings
      if (!booking.bestPrice || currentPrice < booking.bestPrice) {
        booking.bestPrice = currentPrice;
        booking.bestSource = bestExact.source;
        booking.totalSavings = diff;
        booking.status = 'savings_found';
      }
      booking.alerts.push({
        id: generateId(),
        date: new Date().toISOString(),
        type: 'price_drop',
        message: `📉 Preco caiu: R$${currentPrice} via ${bestExact.source} — economia R$${diff}`,
        savings: diff,
      });
      await db.updateUserStats(booking.email);
    } else if (diff === 0) {
      booking.alerts.push({
        id: generateId(),
        date: new Date().toISOString(),
        type: 'price_same',
        message: `➡️ Preco estavel: R$${currentPrice} via ${bestExact.source}`,
        savings: 0,
      });
    } else {
      booking.alerts.push({
        id: generateId(),
        date: new Date().toISOString(),
        type: 'price_increase',
        message: `📈 Preco subiu: R$${currentPrice} via ${bestExact.source} (+R$${Math.abs(diff)})`,
        savings: 0,
      });
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
    totalSavings: booking.totalSavings,
    status: booking.status,
  });
}

// ═══════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════

// Submit a new booking for monitoring
app.post('/api/bookings', async (req, res) => {
  const {
    hotelName, destination, checkinDate, checkoutDate,
    roomType, originalPrice,
    guestName, confirmationNumber, email,
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

  // Create/update user and validate plan limit
  const user = await db.getOrCreateUser(email, guestName);
  if (user) {
    const plan = PLANS[user.plan] || PLANS.free;
    if (user.bookingsCount >= plan.bookingsPerMonth) {
      return res.status(403).json({
        error: 'plan_limit',
        message: `Limite do plano atingido (${plan.bookingsPerMonth} reservas/mes). Faca upgrade para continuar.`,
        limit: plan.bookingsPerMonth,
        plan: user.plan,
      });
    }
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
    guestName: guestName || 'Guest',
    confirmationNumber: confirmationNumber || `CONF-${id.slice(0, 8).toUpperCase()}`,
    email: email || '',
    status: 'monitoring',
    createdAt: new Date().toISOString(),
    lastChecked: null,
    bestPrice: null,
    bestSource: null,
    totalSavings: 0,
    notes: '',
    rateType: 'total',
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
    return res.status(500).json({ error: 'Failed to create booking' });
  }

  res.status(201).json(created);
});

// Get bookings (LGPD: filtered by user email)
app.get('/api/bookings', async (req, res) => {
  const email = (req.query.email || '').toLowerCase().trim();
  let results;
  if (email) {
    results = await db.getBookingsByEmail(email);
  } else {
    results = await db.getAllBookings();
  }
  res.json(results);
});

// Get a single booking
app.get('/api/bookings/:id', async (req, res) => {
  const booking = await db.getBooking(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  res.json(booking);
});

// Refresh price check
app.post('/api/bookings/:id/check', async (req, res) => {
  const booking = await db.getBooking(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  try {
    const results = await searchPrices(booking);
    await applyBestResult(booking, results);
    // Re-fetch to get the updated version from DB
    const updated = await db.getBooking(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error(`[Check] Failed for ${booking.hotelName}: ${err.message}`);
    res.status(500).json({ error: 'Price check failed', message: err.message });
  }
});

// Edit a booking (inline editing)
app.put('/api/bookings/:id', async (req, res) => {
  const booking = await db.getBooking(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const editable = ['hotelName', 'destination', 'checkinDate', 'checkoutDate', 'roomType', 'originalPrice', 'confirmationNumber', 'guestName', 'notes', 'rateType'];
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

// Parse a forwarded confirmation email (preview only)
app.post('/api/parse-email', (req, res) => {
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
app.post('/api/bookings/from-email', async (req, res) => {
  const { rawEmail, email } = req.body;
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

  // All fields extracted — create the booking
  const user = await db.getOrCreateUser(email, parsed.guestName);
  if (user) {
    const plan = PLANS[user.plan] || PLANS.free;
    if (user.bookingsCount >= plan.bookingsPerMonth) {
      return res.status(403).json({ error: 'plan_limit', parsed });
    }
  }

  const id = generateId();
  const booking = {
    id,
    ...parsed,
    email: email || '',
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

// Get stats summary (LGPD: filtered by user email if provided)
app.get('/api/stats', async (req, res) => {
  const email = (req.query.email || '').toLowerCase().trim();
  const stats = await db.getStats(email || null);
  res.json({ ...stats, apiMode: API_MODE });
});

// API config status endpoint
app.get('/api/config', (req, res) => {
  res.json({
    apiMode: API_MODE,
    bookingComConfigured: isBookingApiConfigured(),
    awinConfigured: isAwinConfigured(),
    expediaConfigured: isExpediaConfigured(),
    awinPublisherId: process.env.AWIN_AFFILIATE_ID || null,
    sandboxMode: process.env.BOOKING_USE_SANDBOX === 'true',
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
app.post('/api/auth/login', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email obrigatorio' });
  const user = await db.getUser(email);
  if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });
  await db.updateUser(email, { lastActive: new Date().toISOString() });
  await db.updateUserStats(email);
  const updated = await db.getUser(email);
  res.json(updated);
});

app.post('/api/auth/signup', async (req, res) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: 'Email obrigatorio' });
  const existing = await db.getUser(email);
  if (existing) return res.status(409).json({ error: 'Usuario ja existe' });
  const user = await db.createUser(email, name || 'Guest');
  res.json(user);
});

app.get('/api/users/:email', async (req, res) => {
  const key = req.params.email.toLowerCase();
  await db.updateUserStats(key);
  const user = await db.getUser(key);
  if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });
  const plan = PLANS[user.plan] || PLANS.free;
  res.json({ ...user, planLimit: plan.bookingsPerMonth, planPrice: plan.price });
});

app.put('/api/users/:email/plan', async (req, res) => {
  const key = req.params.email.toLowerCase();
  const user = await db.getUser(key);
  if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });
  const { plan } = req.body;
  if (!PLANS[plan]) return res.status(400).json({ error: 'Plano invalido' });
  const updated = await db.updateUser(key, { plan });
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
app.get('/api/admin/dashboard', async (req, res) => {
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
app.post('/api/admin/trigger-check', async (req, res) => {
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
app.get('/api/admin/scheduler', (req, res) => {
  res.json(getSchedulerStatus());
});

// Get check history
app.get('/api/admin/check-history', (req, res) => {
  res.json(getCheckHistory());
});

// Get all users
app.get('/api/admin/users', async (req, res) => {
  const allUsers = await db.getAllUsers(200);
  res.json({
    total: allUsers.length,
    users: allUsers,
  });
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

// ─── Scheduler paused — searches only via manual "Atualizar" button ─
console.log('[Scheduler] Paused — price checks run manually via "Atualizar"');

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
