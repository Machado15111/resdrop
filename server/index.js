import dotenv from 'dotenv';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
  bookingIdPrefix,
} from './awinApi.js';
import {
  isExpediaConfigured,
  buildExpediaSearchLink,
} from './expediaApi.js';
import { startScheduler, startAvailabilityScheduler, startLifecycleScheduler } from './scheduler.js';
import { hotels } from './hotels.js';
import { searchHotels } from './hotelSearch.js';
import {
  isSerpApiConfigured,
  searchRealPrices,
  fetchCategorizedHotelPhotos,
  bookingIsRefundable,
  isRefundabilityCompatible,
} from './serpApi.js';
import { filterOutPeopleImages } from './imageFilter.js';
import { pushConfigured, getVapidPublicKey, sendPushToUser } from './push.js';
import { stripeConfigured, createCheckoutSession, createPortalSession, constructWebhookEvent, planActionFromEvent } from './stripe.js';
import { PLANS } from './planAuthz.js';
import { rateLimit, startSweeper } from './rateLimit.js';
import { requestId, apiNotFound, errorHandler } from './errorHandler.js';
import { isAdminEmail, configuredAdmins } from './admins.js';
import { searchNuiteeRates } from './nuiteeRates.js';
import { matchHotelWithNuitee, hotelKeyFor, serpFallbackHotel } from './enrichment.js';
import { marketDataPoint, MAX_PRICE_HISTORY } from './priceHistory.js';
import { getCachedAuth, setCachedAuth } from './authCache.js';
import { nuiteeConfigured, nuiteeEnv } from './liteApi.js';
import savingsRoutes from './routes/savings.js';
import specialFaresRoutes from './routes/specialFares.js';
import documentRoutes from './routes/documents.js';
import inboundEmailRoutes from './routes/inbound-email.js';
import affiliateRoutes from './routes/affiliates.js';
import billingRoutes from './routes/billing.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import bookingRoutes from './routes/bookings.js';
import availabilityRoutes from './routes/availability.js';
import { checkWatch } from './availabilityRunner.js';
import { registerNuiteeRoutes } from './nuiteeRoutes.js';
import {
  isEmailConfigured,
  sendPriceDropAlert,
  sendBookingCreated,
  sendDormantActiveBookingsNudge,
  sendNoBookingAddedNudge,
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

/**
 * Attach Nuitée hotel data (images, star, address, coords) + nuiteeHotelId to a
 * single booking for the detail view. These were never stored on the booking
 * row — they live in hotel_mappings — so the detail page had nothing to render.
 *
 * matchHotelWithNuitee checks the permanent cache first and only calls the API
 * on a cache miss (then caches the result), so this is one fast lookup after the
 * first view. Best-effort with a timeout: hotel imagery must never block or slow
 * the reservation itself. Bookings that can't be confidently matched simply come
 * back without hotelData (correct — we don't show a guessed hotel's photos).
 */
function bookingHotelIdentity(booking) {
  const [city, country] = String(booking.destination || '').split(',').map(s => s.trim());
  return {
    hotelName: booking.hotelName,
    city: booking.city || city || '',
    country: booking.country || country || '',
    destination: booking.destination,
    currency: booking.currency,
  };
}

// A hotel record is only worth SHOWING as a gallery if it actually carries
// photos. Used throughout resolution so an imageless record never wins over one
// with images.
const hasImages = (h) => Array.isArray(h?.images) && h.images.length > 0;

async function resolveBookingHotel(booking, { cacheOnly = false } = {}) {
  if (!booking || !booking.hotelName) return null;
  const identity = bookingHotelIdentity(booking);

  // A match that carries NO photos must never SHADOW a source that does — that
  // was the "picture erases on reload and never returns" bug: an imageless
  // VERIFIED mapping was returned first and permanently blocked the SerpApi
  // gallery. Keep such a match aside for its metadata (map/star/nuiteeHotelId)
  // and only fall back to it once nothing with images has turned up.
  let imagelessMatch = null;

  // 1) Nuitée first — the authoritative match. It keeps nuiteeHotelId, which
  //    Price Trends needs, so a real catalogue hit WITH photos always wins.
  if (nuiteeConfigured()) {
    try {
      const match = await matchHotelWithNuitee(identity, { cacheOnly });
      if (match?.hotel && hasImages(match.hotel)) return match;
      if (match?.hotel) imagelessMatch = match;   // remember, but keep hunting for photos
    } catch (e) {
      console.error('[resolveBookingHotel] nuitee:', e.message);
    }
  }

  // Carry the Nuitée id onto a Google-sourced gallery so Price Trends still works
  // when the photos came from SerpApi rather than Nuitée's (image-less) match.
  const withNuiteeId = (hotel) => (
    imagelessMatch?.hotel?.nuiteeHotelId && !hotel.nuiteeHotelId
      ? { ...hotel, nuiteeHotelId: imagelessMatch.hotel.nuiteeHotelId }
      : hotel
  );

  // 2) Cached SerpApi (Google Hotels) imagery from hotel_mappings. Serves
  //    photos/coords for ANY hotel Google finds, even one absent from Nuitée's
  //    catalogue. serpFallbackHotel only returns a record that HAS images.
  let stale = null;
  try {
    const fallback = await db.getHotelMappingByKey(hotelKeyFor(identity));
    const hotel = serpFallbackHotel(fallback);
    if (hotel) {
      const result = { hotel: withNuiteeId(hotel), matchScore: fallback.matchScore || 0, matchSource: 'serpapi', status: 'SERP_FALLBACK' };
      if ((hotel.enrichVersion || 0) >= SERP_ENRICH_VERSION) return result;
      // Older-pipeline cache: the full /hotel path refreshes it below, but a real
      // gallery in hand ALWAYS beats blanking it — so serve it as the fallback on
      // BOTH paths (including the fast cacheOnly reload). This is what "freezes"
      // the picture: once cached, a reload never wipes it to chase a flaky refresh.
      stale = result;
    }
  } catch (e) {
    console.error('[resolveBookingHotel] serp fallback:', e.message);
  }

  // 3) On-demand SerpApi fetch (full mode only). The progressive /hotel endpoint
  //    isn't latency-critical, so for a hotel we've never checked (or whose cache
  //    is outdated) we fetch Google Hotels imagery now and cache it — existing
  //    bookings then show a clean gallery on first view without waiting for a
  //    (manual-only) price check. Runs once per hotel; step 2 serves it after.
  //    Skipped in cacheOnly so the main booking response never blocks on imagery.
  if (!cacheOnly && isSerpApiConfigured()) {
    try {
      // Hotel photos are date-independent, but Google Hotels returns nothing for
      // a stay far in the future (rates aren't published yet). Search a NEAR-TERM
      // window purely to fetch imagery, then cache it under the booking's
      // (date-independent) hotel key so it shows regardless of the stay dates.
      // Google Hotels is flaky per date for some queries (returns a detail page
      // with photos on some near-term dates, "no results" on others), so try a
      // few windows and stop as soon as we get imagery.
      const soon = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
      let serpResults = [];
      for (const off of [30, 60, 90]) {
        serpResults = await searchRealPrices(
          { ...booking, checkinDate: soon(off), checkoutDate: soon(off + 3) },
          { currency: booking.currency || 'USD' }
        );
        if (serpResults.hotelInfo?.images?.length) break;
      }
      const hotelData = await persistSerpHotelData(booking, serpResults.hotelInfo);
      if (hasImages(hotelData)) {
        return { hotel: withNuiteeId(hotelData), matchScore: 0, matchSource: 'serpapi', status: 'SERP_FALLBACK' };
      }
    } catch (e) {
      console.error('[resolveBookingHotel] serp on-demand:', e.message);
    }
  }

  // Preference order once nothing fresh-with-photos was found: an older-pipeline
  // gallery (still has images) beats an imageless metadata match, which in turn
  // beats nothing (map/star still render from that last-resort match).
  if (stale) return stale;
  if (imagelessMatch) return imagelessMatch;
  return null;
}

// Version of the SerpApi imagery pipeline. Bump when image sourcing changes so
// stale cached galleries (e.g. ones built before people-filtering) are refreshed
// on next view instead of served forever.
const SERP_ENRICH_VERSION = 3;

/**
 * Build the hotelData blob served to the booking detail view from SerpApi's
 * salvaged detail-page info. Shaped to match the Nuitée hotelData the frontend
 * already renders (images as plain URL strings), minus nuiteeHotelId.
 */
function buildSerpHotelData(identity, booking, hotelInfo, images) {
  return {
    nuiteeHotelId: null,
    googlePlaceId: null,
    name: booking.hotelName,
    address: hotelInfo.address || null,
    city: identity.city || null,
    country: identity.country || null,
    coords: hotelInfo.coords || null,
    star: hotelInfo.star || null,
    rating: hotelInfo.rating || null,
    reviews: hotelInfo.reviews || null,
    description: hotelInfo.description || null,
    amenities: Array.isArray(hotelInfo.amenities) ? hotelInfo.amenities : [],
    images: (images || hotelInfo.images || []).filter(i => typeof i === 'string' && i),
    source: 'google',
    matchSource: 'serpapi',
    enrichVersion: SERP_ENRICH_VERSION,
    verifiedAt: new Date().toISOString(),
    enrichmentStatus: 'SERP_FALLBACK',
  };
}

/**
 * Choose a clean, people-free image set for the gallery: prefer Google Hotels'
 * property-categorized photos (Exterior/Interior/Bedroom/…) over the flat set
 * that mixes in guest snapshots, then optionally run a vision pass (only if an
 * OpenAI key is configured; otherwise a no-op). Best-effort throughout — always
 * returns SOME imagery.
 */
async function cleanSerpImages(hotelInfo) {
  let images = Array.isArray(hotelInfo.images) ? hotelInfo.images : [];
  try {
    if (hotelInfo.photosLink) {
      const categorized = await fetchCategorizedHotelPhotos(hotelInfo.photosLink, { limit: 12 });
      if (categorized.length >= 3) images = categorized;
    }
  } catch (e) {
    console.error('[cleanSerpImages] categorized fetch:', e.message);
  }
  try {
    images = await filterOutPeopleImages(images);
  } catch { /* best-effort */ }
  return images;
}

/**
 * Persist SerpApi-salvaged hotel imagery into hotel_mappings — the
 * source-of-truth store for hotel enrichment (the bookings table has no
 * hotel_data column; Supabase REST is authoritative). Keyed by the same
 * canonical hotelKey the Nuitée matcher uses, so resolveBookingHotel serves it
 * as a fallback.
 *
 * A VERIFIED mapping (Nuitée/Google Places) is authoritative and wins — UNLESS
 * it has no photos. An imageless VERIFIED row otherwise PERMANENTLY blocks Google
 * imagery (the "picture never comes back" bug), so when it lacks images we enrich
 * it IN PLACE: keep its id/metadata/VERIFIED status, just add the salvaged
 * gallery. Returns the resulting hotelData (so the on-demand path can serve it
 * even if the DB write fails), or null when there's no usable imagery.
 */
async function persistSerpHotelData(booking, hotelInfo) {
  if (!booking || !booking.hotelName || !hotelInfo) return null;
  if (!Array.isArray(hotelInfo.images) || hotelInfo.images.length === 0) return null;
  const identity = bookingHotelIdentity(booking);
  const key = hotelKeyFor(identity);
  let existing = null;
  try {
    existing = await db.getHotelMappingByKey(key);
  } catch { /* treat as cache miss */ }
  // A VERIFIED mapping that ALREADY has photos is authoritative — leave it be.
  if (existing?.status === 'VERIFIED' && hasImages(existing.hotelData)) return existing.hotelData;

  const images = await cleanSerpImages(hotelInfo);
  if (images.length === 0) return existing?.hotelData || null;

  // Enrich an authoritative-but-imageless record in place (keep its id/metadata
  // and VERIFIED status, just add the gallery); otherwise write a SERP_FALLBACK.
  const enrichInPlace = existing?.status === 'VERIFIED';
  const hotelData = enrichInPlace
    ? { ...existing.hotelData, images, enrichVersion: SERP_ENRICH_VERSION, verifiedAt: new Date().toISOString() }
    : buildSerpHotelData(identity, booking, hotelInfo, images);
  try {
    await db.upsertHotelMapping({
      normalizedHotelKey: key,
      nuiteeHotelId: enrichInPlace ? (existing.nuiteeHotelId || existing.hotelData?.nuiteeHotelId || null) : null,
      source: enrichInPlace ? (existing.source || 'nuitee') : 'serpapi',
      matchScore: enrichInPlace ? (existing.matchScore || 0) : 0,
      status: enrichInPlace ? 'VERIFIED' : 'SERP_FALLBACK',
      hotelData,
    });
    console.log(`[SerpHotelData] ${enrichInPlace ? 'Enriched imageless VERIFIED mapping with' : 'Cached'} ${hotelData.images.length} image(s) for "${booking.hotelName}"`);
  } catch (e) {
    console.error('[persistSerpHotelData]', e.message);
  }
  return hotelData; // serve imagery even if the DB write failed
}

/**
 * Fast, cache-only hotel attach for the booking response. On a cache miss it
 * warms the cache in the background (see matchHotelWithNuitee cacheOnly) and the
 * frontend fills images in progressively via GET /api/bookings/:id/hotel — so
 * the reservation itself never waits on a multi-second catalog search.
 */
async function attachHotelData(booking) {
  if (!booking || (booking.hotelData && booking.nuiteeHotelId)) return booking;
  try {
    const match = await resolveBookingHotel(booking, { cacheOnly: true });
    if (match?.hotel) {
      return { ...booking, hotelData: match.hotel, nuiteeHotelId: match.hotel.nuiteeHotelId || null };
    }
  } catch (e) {
    console.error('[attachHotelData]', e.message);
  }
  return booking;
}

const app = express();

// ─── Security: proxy trust (must be set before anything reads req.ip) ───────
//
// In production the API sits behind Railway's edge proxy. Without this, Express
// reports the PROXY's address as req.ip for every request, so every rate-limit
// bucket keyed on req.ip collapses into a single shared counter: 15 failed
// logins from anyone would lock out the whole user base, and publicRateLimit
// (60/min) would throttle the entire site.
//
// The hop count is deliberate. `trust proxy: true` trusts the whole
// X-Forwarded-For chain, which the client controls — an attacker could prepend
// arbitrary addresses and mint a fresh rate-limit bucket per request. Trusting
// exactly the number of proxies actually in front of us makes the resolved IP
// the one OUR proxy observed.
const TRUST_PROXY_HOPS = Number.isFinite(parseInt(process.env.TRUST_PROXY_HOPS, 10))
  ? parseInt(process.env.TRUST_PROXY_HOPS, 10)
  : 1;
app.set('trust proxy', TRUST_PROXY_HOPS);

// Correlation id on every request, so a 500 the user reports ("requestId
// a1b2…") can be found in the logs. Must run before anything that can fail.
app.use(requestId);

// ─── Security: CORS — restrict to known origins ─────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['https://resdrop.app', 'http://localhost:5173', 'http://localhost:3001'],
  credentials: true,
}));

// ─── Security: Body size limit ──────────────────────────────
// Stash the raw body so the Stripe webhook can verify its signature (Stripe
// needs the exact bytes, not the re-serialized JSON).
app.use(express.json({
  limit: '1mb',
  verify: (req, res, buf) => { req.rawBody = buf; },
}));

// ─── Security: headers (helmet) ─────────────────────────────
//
// Replaces a hand-rolled setHeader block. The CSP below is BYTE-FOR-BYTE the
// policy that block emitted — helmet's defaults are deliberately overridden
// rather than merged, because its stock policy would drop the directives this
// app actually needs (the tp-em.com Travelpayouts script and the OpenStreetMap
// frame) and break the SPA.
//
// script-src no longer carries 'unsafe-inline': the one executable inline block
// (the Travelpayouts bootstrap) moved to /tp-loader.js, and Vite's output is
// all external. A nonce was not an option — resdrop.app is served by Vercel
// from static files, which cannot vary a header per request. The three
// application/ld+json blocks in index.html are data, not script, and are not
// subject to script-src.
//
// style-src keeps 'unsafe-inline' for now. The app's own styles are external
// and React's style props go through the CSSOM (which CSP does not police), so
// it may well be droppable too — but that needs its own browser pass across
// every screen, and a blocked stylesheet is a silently unreadable page.
// NOTE: vercel.json carries the same policy for the statically served frontend.
// The two must be changed together — see security_headers.test.js.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      'default-src': ["'self'"],
      'base-uri': ["'self'"],
      'object-src': ["'none'"],
      'frame-ancestors': ["'none'"],
      'form-action': ["'self'"],
      'img-src': ["'self'", 'data:', 'blob:', 'https:'],
      'media-src': ["'self'", 'https:'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'script-src': ["'self'", 'https://tp-em.com'],
      'connect-src': ["'self'", 'https:'],
      'frame-src': ['https://www.openstreetmap.org'],
      'worker-src': ["'self'"],
      // The Travelpayouts entrypoint pulls its own chunks over http://, which
      // the browser blocks as mixed active content before CSP even weighs in.
      // Upgrading them is what makes that script work at all; everything else
      // the app loads is already https.
      'upgrade-insecure-requests': [],
    },
  },
  // Match the previous header exactly: 1 year, includeSubDomains, no preload.
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true, preload: false },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' },
  // helmet sets Cross-Origin-Resource-Policy: same-origin, which would block
  // the /dist assets and hotel images the SPA loads cross-origin.
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// helmet omits X-XSS-Protection by design (the legacy filter introduced its own
// vulnerabilities and every current browser ignores it). The previous block set
// it, so it is kept explicitly rather than silently dropped.
app.use((req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// ─── Security: Rate limiting ────────────────────────────────
// Implementation (and its single-process caveat) lives in rateLimit.js.
startSweeper();

const authRateLimit = rateLimit(15 * 60 * 1000, 15, req => `auth:${req.ip}`, 'authRateLimit');        // 15 attempts per 15 min
const signupRateLimit = rateLimit(60 * 60 * 1000, 10, req => `signup:${req.ip}`, 'signupRateLimit');     // 10 signups per hour
const resetRateLimit = rateLimit(60 * 60 * 1000, 5, req => `reset:${req.ip}`, 'resetRateLimit');        // 5 resets per hour
const resetSubmitLimit = rateLimit(15 * 60 * 1000, 10, req => `resetSubmit:${req.ip}`, 'resetSubmitLimit'); // 10 reset attempts per 15 min
const bookingRateLimit = rateLimit(60 * 1000, 10, req => `booking:${req.userEmail}`, 'bookingRateLimit');  // 10 bookings per min
const parseRateLimit = rateLimit(15 * 60 * 1000, 30, req => `parse:${req.userEmail}`, 'parseRateLimit'); // 30 parses per 15 min
const publicRateLimit = rateLimit(60 * 1000, 60, req => `public:${req.ip}`, 'publicRateLimit');           // 60/min per IP (unauth public endpoints)

// Paid-API guard. These routes each spend real money on an upstream call
// (SerpApi Google Hotels / Nuitée), and were previously authenticated but
// otherwise unlimited — one logged-in account could drain the monthly quota in
// a loop. Keyed per user so one account can't spend everyone else's budget.
const costlyApiRateLimit = rateLimit(60 * 60 * 1000, 30, req => `costly:${req.userEmail}`, 'costlyApiRateLimit'); // 30/hour per user

// ─── Status Log ──────────────────────────────────────────────
const API_MODE = isSerpApiConfigured() ? 'LIVE (SerpApi)' : isBookingApiConfigured() ? 'LIVE (Booking)' : 'SIMULATION';
const SERVER_START = new Date();
console.log(`[RepriceHQ] Price engine mode: ${API_MODE}`);
console.log(`[RepriceHQ] Storage: Supabase (PostgreSQL)`);
// Make the proxy setting visible in Railway logs: if this ever reads 0, every
// IP-keyed rate limit has silently collapsed into one shared global bucket.
console.log(`[RepriceHQ] trust proxy: ${TRUST_PROXY_HOPS} hop(s) — rate limits key on the client IP as seen by our edge proxy`);
console.log(`[RepriceHQ] Admins configured: ${configuredAdmins().length} (from ADMIN_EMAILS)`);
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
// Defined in planAuthz.js alongside the rules for changing a plan, so the tiers
// and the "who may move between them" logic can't drift apart.

function generateId() {
  return crypto.randomUUID();
}

// ─── Auth Middleware ─────────────────────────────────────────
// isAdminEmail is defined once, in admins.js, and re-exported here so anything
// importing it from index.js keeps working.
export { isAdminEmail };

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.slice(7);

  // Fast path: a recently validated token. Saves two serial Supabase round-trips
  // (~460ms) per request. Purged on logout and on user updates — see authCache.js.
  const cached = getCachedAuth(token);
  if (cached) {
    req.user = cached.user;
    req.userEmail = cached.email;
    return next();
  }

  const session = await db.getSessionByToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  const email = (session.user_email || session.userEmail || session.email || '').toLowerCase();
  if (!email) {
    return res.status(401).json({ error: 'Invalid session data' });
  }
  const user = await db.getUser(email);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  // Once per ~60s auth-cache window per user, not per request — enough
  // resolution for dormancy signals without hammering Supabase.
  db.touchLastActive(email);
  setCachedAuth(token, email, user);
  req.user = user;
  req.userEmail = email;
  next();
}

function adminMiddleware(req, res, next) {
  if (!isAdminEmail(req.userEmail)) {
    return res.status(403).json({ error: 'Admin access denied' });
  }
  next();
}

/**
 * The currency a booking's rates must be quoted in — ALWAYS the currency the
 * reservation itself was made in. A user whose profile is BRL can hold a USD
 * reservation; quoting that stay in BRL and rendering it under the booking's
 * USD label showed a Brazilian amount with a "$" (R$30,390 → $30,390). The
 * booking wins; the caller-supplied option is only a fallback for bookings that
 * somehow carry no currency.
 */
function quoteCurrencyFor(booking, options = {}) {
  return (booking?.currency || options.currency || 'USD').toUpperCase();
}

// Currencies a booking may be held in (mirrors the editor's dropdown).
const SUPPORTED_CURRENCIES = ['USD', 'BRL', 'EUR', 'GBP'];

// ─── Price search: real APIs only (no simulation) ────────────
async function searchPrices(booking, options = {}) {
  const allResults = [];

  // 1) Try SerpApi Google Hotels (real prices from multiple OTAs)
  if (isSerpApiConfigured()) {
    try {
      const serpResults = await searchRealPrices(booking, { currency: quoteCurrencyFor(booking, options) });
      // Salvage hotel imagery from the detail page for hotels not in Nuitée's
      // catalogue. Fire-and-forget so it never slows the price check.
      if (serpResults.hotelInfo) {
        persistSerpHotelData(booking, serpResults.hotelInfo).catch(() => {});
      }
      if (serpResults.length > 0) {
        // Add affiliate links to real results
        for (const r of serpResults) {
          if ((r.sourceId === 'expedia_real' || r.source === 'Expedia') && isExpediaConfigured()) {
            r.affiliateLink = buildExpediaSearchLink({
              destination: booking.destination,
              checkinDate: booking.checkinDate,
              checkoutDate: booking.checkoutDate,
              clickRef: `resdrop_${bookingIdPrefix(booking.id)}`,
            });
          } else if ((r.sourceId === 'booking_real' || r.source === 'Booking.com') && isAwinConfigured()) {
            r.affiliateLink = buildBookingSearchLink({
              destination: booking.destination,
              checkinDate: booking.checkinDate,
              checkoutDate: booking.checkoutDate,
              clickRef: `resdrop_${bookingIdPrefix(booking.id)}`,
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

  // 1b) Nuitée (LiteAPI) live rates — an independent source. Runs alongside
  // SerpApi so the hotel still gets a real quote when Google's OTA coverage is
  // thin. Deduped against SerpApi's Nuitée entry (if any) by source name below.
  if (nuiteeConfigured()) {
    try {
      const nuiteeResults = await searchNuiteeRates(booking, { currency: quoteCurrencyFor(booking, options) });
      if (nuiteeResults.length > 0) {
        allResults.push(...nuiteeResults);
        console.log(`[Search] Nuitée returned ${nuiteeResults.length} real result(s)`);
      }
    } catch (err) {
      console.error(`[Search] Nuitée failed: ${err.message}`);
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

  // Dedup by source name — if the same vendor appears from more than one API
  // (e.g. Nuitée via SerpApi AND via the direct LiteAPI source), keep the
  // cheapest. Prefer exact-hotel matches when prices tie.
  const bySource = new Map();
  for (const r of filtered) {
    const key = (r.source || 'Unknown').toLowerCase();
    const existing = bySource.get(key);
    if (!existing
      || r.totalPrice < existing.totalPrice
      || (r.totalPrice === existing.totalPrice && r.isExactMatch && !existing.isExactMatch)) {
      bySource.set(key, r);
    }
  }
  const deduped = [...bySource.values()];
  deduped.sort((a, b) => a.totalPrice - b.totalPrice);
  return deduped;
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

  // Task 4: record ONE market data-point per check (cheapest EXACT-hotel total +
  // its source) so the price chart isn't empty even when no comparable savings
  // are claimed. This is history only — it does NOT feed the strict savings/alert
  // logic below, which is unchanged. Pushed at the end so it never duplicates the
  // entry the savings path records when a comparable match exists.
  const marketPoint = marketDataPoint(results, booking.lastChecked);
  const historyLenBefore = Array.isArray(booking.priceHistory) ? booking.priceHistory.length : 0;

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
    // Same rule the rate parser applies when it decides whether a quote may
    // claim a saving, so the detail screen and the alerting path can never
    // disagree about what counts as comparable.
    const bookingRefundable = bookingIsRefundable(booking);
    const fullyComparable = comparableMatches.filter(
      r => isRefundabilityCompatible(bookingRefundable, r.freeCancellation)
    );

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
      // Only a NEW or improved drop is actionable. Without this guard, a booking
      // sitting at a persistently lower rate would email + push the user on
      // EVERY daily monitoring cycle (alert-fatigue spam) now that monitoring
      // runs 24/7. Computed before bestPrice is updated below.
      const isNewDrop = diff > 0 && (!booking.bestPrice || currentPrice < booking.bestPrice);

      if (diff > 0) {
        // PRICE DROP — comparable product confirmed, set as potential savings
        if (isNewDrop) {
          booking.bestPrice = currentPrice;
          booking.bestSource = bestMatch.source;
          booking.potentialSavings = diff;
          // Only set lower_fare_found if not already confirmed
          if (booking.status !== 'confirmed_savings') {
            booking.status = 'lower_fare_found';
          }
          // Issue 14: Add booking history entry
          if (!booking.bookingHistory) booking.bookingHistory = [];
          booking.bookingHistory.push({
            date: new Date().toISOString(),
            action: 'offer_found',
            details: { price: currentPrice, source: bestMatch.source, savings: diff, roomType: bestMatch.roomType },
          });
        }
        alertType = 'price_drop';
        alertMessage = `📉 Price drop: R$${currentPrice} via ${bestMatch.source} — savings R$${diff}`;
        // Record the alert + notify only on a new/improved drop, never on a daily
        // re-check of the same rate.
        if (isNewDrop) {
          booking.alerts.push({
            id: generateId(),
            date: new Date().toISOString(),
            type: alertType,
            message: alertMessage,
            savings: diff,
          });

          // Fire-and-forget price drop email
          // Fetch user for currency/lang context
          db.getUser(booking.email).then(u => {
            sendPriceDropAlert(booking.email, booking.guestName || 'Traveler', booking, u || {}).catch(() => {});
          }).catch(() => {});

          // Fire-and-forget Web Push (no-op unless VAPID is configured).
          sendPushToUser(booking.email, {
            title: `📉 ${booking.hotelName}`,
            body: `A lower rate appeared via ${bestMatch.source} — save ${booking.currency || ''}${diff}.`,
            url: `/bookings/${booking.id}`,
            tag: `drop-${booking.id}`,
          }).catch(() => {});
        }
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

      // Write to fare_alerts table (feeds the user's Alerts page). For a price
      // drop, only on a new/improved one so the list isn't filled with daily
      // repeats; price_same/price_increase keep their existing behavior.
      if (alertType !== 'price_drop' || isNewDrop) {
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
      // Results exist but none are fully comparable (refundability mismatch).
      // "Different cancellation policy" implies we confirmed a downgrade —
      // true only when a source actually reported non-refundable terms. Most
      // of the time the source just never said either way (freeCancellation
      // is null, not false), which isn't a mismatch we verified, so say that
      // instead of a fact we don't have.
      console.log(`[applyBestResult] ${comparableMatches.length} room-matched results but none pass refundability check — no savings claimed`);
      if (!booking.alerts) booking.alerts = [];
      const cancellationKnownWorse = comparableMatches.some(r => r.freeCancellation === false);
      booking.alerts.push({
        id: generateId(),
        date: new Date().toISOString(),
        type: 'price_check',
        message: cancellationKnownWorse
          ? '🔍 Prices found but not comparable (different cancellation policy)'
          : '🔍 Prices found but cancellation terms not shown by these sources',
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

  // Task 4: ensure exactly ONE history point per check. If the strict savings
  // path already recorded one above, keep it; otherwise fall back to the market
  // point so the chart isn't empty. Then bound history to the most recent 60.
  const historyLenAfter = Array.isArray(booking.priceHistory) ? booking.priceHistory.length : 0;
  if (historyLenAfter === historyLenBefore && marketPoint) {
    if (!booking.priceHistory) booking.priceHistory = [];
    booking.priceHistory.push(marketPoint);
  }
  if (Array.isArray(booking.priceHistory) && booking.priceHistory.length > MAX_PRICE_HISTORY) {
    booking.priceHistory = booking.priceHistory.slice(-MAX_PRICE_HISTORY);
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
// Booking CRUD, checks, import/export, email parsing and stats now live in
// routes/bookings.js (mounted below).

app.get('/api/config', (req, res) => {
  res.json({
    apiMode: API_MODE,
    bookingComConfigured: isBookingApiConfigured(),
    awinConfigured: isAwinConfigured(),
    expediaConfigured: isExpediaConfigured(),
    // Nuitée live-rate source status (non-secret: booleans / mode only)
    nuiteeConfigured: nuiteeConfigured(),
    nuiteeEnv: nuiteeEnv(),
    // Security: Don't expose affiliate IDs or internal config to public
    sandboxMode: process.env.BOOKING_USE_SANDBOX === 'true',
    resendConfigured: isEmailConfigured(),
    // Web Push: whether it's enabled + the non-secret public key to subscribe with.
    pushEnabled: pushConfigured(),
    vapidPublicKey: getVapidPublicKey(),
    // Whether real Stripe checkout is wired (else the UI falls back to a flag flip).
    stripeEnabled: stripeConfigured(),
  });
});

// Stripe checkout / portal / webhook and plan changes now live in
// routes/billing.js (mounted below).

// ─── Web Push subscriptions ─────────────────────────────────
app.post('/api/push/subscribe', authMiddleware, async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Invalid subscription' });
  }
  const saved = await db.savePushSubscription({ email: req.userEmail, endpoint, p256dh: keys.p256dh, auth: keys.auth });
  if (!saved) return res.status(500).json({ error: 'Could not save subscription' });
  res.json({ success: true });
});

app.post('/api/push/unsubscribe', authMiddleware, async (req, res) => {
  const { endpoint } = req.body || {};
  if (endpoint) await db.deletePushSubscription(endpoint);
  res.json({ success: true });
});

// ─── HOTEL SEARCH ───────────────────────────────────────────
app.get('/api/hotels/search', publicRateLimit, (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json([]);
  // Matching lives in hotelSearch.js: per word, across name AND city, accent
  // folded. The old name-only substring match could not find Le Meurice from
  // "paris" and could not find anything at all from "fasano sao paulo".
  res.json(searchHotels(hotels, q, 10));
});

// Auth + user-account routes now live in routes/auth.js (mounted below).

// Awin + Expedia affiliate routes now live in routes/affiliates.js
// (mounted below with the other routers).

// ═══════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════

// Full admin dashboard data
// Admin routes now live in routes/admin.js (mounted below).

// ─── Booking Validation ──────────────────────────────────────
const VALID_BOOKING_STATUSES = [
  'received', 'processing', 'needs_review', 'monitoring',
  'lower_fare_found', 'savings_found', 'confirmed_savings',
  'dismissed', 'expired', 'archived', 'draft',  // Issue 21: add archive & draft
];

// Auto-detect OTA from email, URL, or confirmation number (Issue 5)
function detectOTA(data) {
  const { otpEmail = '', bookingUrl = '', rawSource = '', confirmationNumber = '' } = data;
  const text = `${otpEmail} ${bookingUrl} ${rawSource} ${confirmationNumber}`.toLowerCase();

  if (text.includes('booking.com') || text.includes('bookingcombr')) return 'booking.com';
  if (text.includes('expedia') || text.includes('expediabr')) return 'expedia';
  if (text.includes('airbnb') || text.includes('abnb')) return 'airbnb';
  if (text.includes('agoda')) return 'agoda';
  if (text.includes('kayak')) return 'kayak';
  if (text.includes('trip.com') || text.includes('tripadvisor')) return 'tripadvisor';
  if (text.includes('hotels.com')) return 'hotels.com';
  if (text.includes('vrbo') || text.includes('homeaway')) return 'vrbo';

  return 'unknown';
}

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
    } else if (price < 10) {
      warnings.push('Very low price (<$10) — likely error?');
    } else if (price > 50000) {
      warnings.push('Unusually high price (>$50k) — verify this is correct');
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

// ─── Mount Awin + Expedia affiliate routes ───────────────────
app.use('/api', affiliateRoutes(authMiddleware, adminMiddleware, publicRateLimit));

// ─── Mount Stripe billing + plan routes ──────────────────────
app.use('/api', billingRoutes(authMiddleware));

// ─── Mount booking routes ────────────────────────────────────
app.use('/api', bookingRoutes({
  authMiddleware, bookingRateLimit, parseRateLimit, costlyApiRateLimit,
  searchPrices, applyBestResult, attachHotelData, filterBookingResults,
  resolveBookingHotel, generateId, detectOTA, validateBookingData,
  findDuplicateBooking, parseEmailContent,
  VALID_BOOKING_STATUSES, SUPPORTED_CURRENCIES,
  apiMode: API_MODE,
}));

// ─── Mount admin routes ──────────────────────────────────────
// ─── Mount availability watches ──────────────────────────────
app.use('/api', availabilityRoutes({
  authMiddleware, bookingRateLimit, costlyApiRateLimit, searchPrices,
}));

app.use('/api', adminRoutes({
  authMiddleware, adminMiddleware, searchPrices, applyBestResult,
  apiMode: API_MODE, serverStart: SERVER_START,
}));

// ─── Mount auth + user-account routes ────────────────────────
app.use('/api', authRoutes({
  authMiddleware, authRateLimit, signupRateLimit, resetRateLimit, resetSubmitLimit,
}));

// Is this process actually serving traffic, or has something imported index.js
// for its `app` (route tests, tooling)? Only the entry point binds a port and
// starts the 24/7 price-check scheduler.
//
// This is the standard ESM "am I the main module" check, and it is deliberate:
// sniffing NODE_ENV or process.execArgv does NOT work here. Under `node --test`
// each test file runs in a child process where execArgv is [] and NODE_ENV is
// unset, so an env-based guard silently fails open — importing index.js from a
// test would bind port 3001 and start the scheduler against the production
// database. argv[1] is the test file in that case, so this check is correct.
const IS_MAIN = import.meta.url === pathToFileURL(process.argv[1] || '').href;
const IS_TEST_IMPORT = !IS_MAIN;

// ─── Automated price monitoring (cost-capped) ─────────────────
// Loads bookings fresh from the DB each cycle and searches in each booking's own
// currency. Bounded by MONITOR_DAILY_BUDGET + per-booking cadence so it monitors
// 24/7 without blowing the SerpApi quota. Set MONITOR_ENABLED=false to pause.
if (!IS_TEST_IMPORT && process.env.MONITOR_ENABLED !== 'false') {
  startScheduler(
    () => db.getAllBookings(),
    (booking) => searchPrices(booking, { currency: booking.currency }),
    applyBestResult
  );
} else {
  console.log('[Monitor] Disabled (MONITOR_ENABLED=false) — price checks run manually only');
}

// ─── Availability watches ("tell me when a room opens up") ────
// Its own loop and its own daily budget, so a burst of watches can never eat
// the price-check budget. Follows MONITOR_ENABLED too: pausing monitoring is
// meant to stop ALL automated API spend, not half of it.
if (!IS_TEST_IMPORT && process.env.MONITOR_ENABLED !== 'false') {
  startAvailabilityScheduler(
    () => db.getActiveAvailabilityWatches(),
    (watch) => checkWatch(watch, { searchPrices }),
    (watch) => db.updateAvailabilityWatch(watch.id, { status: 'expired' }),
  );
} else if (!IS_TEST_IMPORT) {
  console.log('[Watch] Disabled (MONITOR_ENABLED=false) — availability checks run manually only');
}

// ─── Lifecycle (retention) nudges ─────────────────────────────
// Independent of MONITOR_ENABLED: pausing paid-API price checks shouldn't
// also silence free, DB-driven re-engagement email. Its own flag instead.
// Opt-in (LIFECYCLE_ENABLED must be 'true'), not opt-out: the cooldown this
// relies on was silently broken end-to-end on first ship (see comment below
// and in scheduler.js/email.js) and sent duplicate nudges to a live user
// within minutes. Re-enable deliberately once that's verified fixed.
if (!IS_TEST_IMPORT && process.env.LIFECYCLE_ENABLED === 'true' && isEmailConfigured()) {
  startLifecycleScheduler({
    loadUsers: () => db.getAllUsers(5000),
    loadBookings: () => db.getAllBookings({ columns: 'id,email,status,hotel_name,checkin_date,check_count' }),
    // activity_log.entity_id is UUID — must be the user's row id, never their
    // email. Using the email string here made every insert fail silently
    // (Postgres rejects it, the error was swallowed), so the cooldown below
    // always saw an empty log and never once blocked a resend.
    getActivity: (user) => db.getActivityLog('user', user.id),
    sendDormant: (user, booking) => sendDormantActiveBookingsNudge(
      user.email, user.name || 'Traveler', booking, { cycles: booking.checkCount || 0 }, user
    ),
    sendNoBooking: (user, days) => sendNoBookingAddedNudge(user.email, user.name || 'Traveler', days, user),
    logSent: (user, nudgeKind) => db.logActivity({
      entityType: 'user', entityId: user.id, action: 'email_sent', actorEmail: user.email, details: { nudgeKind },
    }),
  });
} else if (!IS_TEST_IMPORT) {
  console.log('[Lifecycle] Disabled (set LIFECYCLE_ENABLED=true to opt in, once RESEND_API_KEY is set)');
}

// ─── Serve frontend build in production ─────────────────────
// Nuitée / Price Trends routes (registered before the SPA fallback)
registerNuiteeRoutes(app, { authMiddleware, adminMiddleware, costlyApiRateLimit });

// Every API router is mounted by this point. An /api path that reached here
// matched nothing, so answer with JSON instead of falling through to the SPA —
// which used to match it, return no response and hang the request.
app.use('/api', apiNotFound);

import { existsSync } from 'fs';
const distPath = join(__dirname, '..', 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA fallback — all non-API routes serve index.html
  // Express 5 requires named parameter syntax instead of bare '*'
  app.get('/{*splat}', (req, res, next) => {
    // /api is already handled above; next() rather than hanging, just in case.
    if (req.path.startsWith('/api')) return next();
    res.sendFile(join(distPath, 'index.html'));
  });
  console.log('[ResDrop] Serving frontend from /dist');
}

// ─── Terminal error handler — MUST be the last app.use ──────
// Converts any thrown/rejected handler into the { error, requestId } JSON shape
// the frontend expects, logs the stack server-side, and never leaks a stack or
// a raw driver message to the client.
app.use(errorHandler);

// The configured app, importable without side effects. Route tests and tooling
// mount this on an ephemeral port of their own; only a real run binds PORT.
export { app };

const PORT = process.env.PORT || 3001;
if (!IS_TEST_IMPORT) app.listen(PORT, async () => {
  const userCount = await db.getUserCount();
  const bookingCount = await db.getBookingCount();
  console.log(`\n🏨 ResDrop API server running on http://localhost:${PORT}`);
  console.log(`   Mode: ${API_MODE}`);
  console.log(`   Storage: Supabase (PostgreSQL) ✓`);
  console.log(`   Awin: ${isAwinConfigured() ? `✓ publisher ${process.env.AWIN_AFFILIATE_ID}` : '✗ not set'}`);
  console.log(`   Expedia: ${isExpediaConfigured() ? '✓ configured' : '✗ not configured (set EXPEDIA_AWIN_ADVERTISER_ID)'}`);
  console.log(`   Booking.com (Demand): ${isBookingApiConfigured() ? '✓ configured' : '✗ not set (using simulation)'}`);
  console.log(`   Booking.com (Awin Brazil): advertiser ${process.env.BOOKING_AWIN_ADVERTISER_ID_BRAZIL || 'not set'}`);
  console.log(`   Monitoring: ${process.env.MONITOR_ENABLED === 'false' ? 'DISABLED (manual only)' : `ON (every ${process.env.MONITOR_INTERVAL_MINUTES || 120}min, ≤${process.env.MONITOR_DAILY_BUDGET || 100}/day)`}`);
  console.log(`   Users: ${userCount} | Bookings: ${bookingCount}`);
  console.log(`   Sandbox: ${process.env.BOOKING_USE_SANDBOX === 'true' ? 'ON' : 'OFF'}\n`);
});
