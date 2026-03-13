/**
 * Awin Publisher API Client
 *
 * Handles interactions with Awin's affiliate network API:
 * - Promotions/Offers: fetch current Booking.com deals & voucher codes
 * - Link Builder: generate affiliate tracking links for rebooking
 * - Transactions: track commissions earned from rebookings
 *
 * Auth: OAuth2 Bearer Token
 * Rate limit: 20 requests/minute
 * Docs: https://help.awin.com/apidocs/introduction-1
 */

// Read env vars dynamically (not cached at import time) because
// ES module imports are hoisted before dotenv.config() runs
function env(key, fallback = '') {
  return process.env[key] || fallback;
}

export function isAwinConfigured() {
  return !!(env('AWIN_API_TOKEN') && env('AWIN_AFFILIATE_ID'));
}

/**
 * Make authenticated request to Awin API
 */
async function awinRequest(method, path, body = null) {
  const url = `${env('AWIN_API_URL', 'https://api.awin.com')}${path}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${env('AWIN_API_TOKEN')}`,
      'Content-Type': 'application/json',
    },
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  console.log(`[Awin] ${method} ${path}`);

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Awin API ${response.status}: ${errorText}`);
  }

  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ─── PROMOTIONS / OFFERS ─────────────────────────────────────

/**
 * Fetch current Booking.com promotions/deals from Awin
 *
 * POST /publishers/{publisherId}/promotions
 * Returns active offers, voucher codes, deals
 */
export async function getBookingPromotions({ region = 'apac' } = {}) {
  const advertiserId = region === 'na'
    ? env('BOOKING_AWIN_ADVERTISER_ID_NA', '6776')
    : env('BOOKING_AWIN_ADVERTISER_ID_APAC', '18117');

  try {
    const result = await awinRequest(
      'POST',
      `/publishers/${env('AWIN_AFFILIATE_ID')}/promotions`,
      {
        advertiserId: parseInt(advertiserId),
        promotionStatus: 'active',
      }
    );
    console.log(`[Awin] Got ${Array.isArray(result) ? result.length : 0} promotions`);
    return result || [];
  } catch (error) {
    console.error(`[Awin] Promotions error: ${error.message}`);
    return [];
  }
}

/**
 * Parse Awin promotions into our deal format
 */
export function parsePromotions(promotions) {
  if (!Array.isArray(promotions)) return [];

  return promotions.map((promo) => ({
    id: promo.id || promo.promotionId,
    type: promo.type || promo.promotionType || 'deal',
    title: promo.description || promo.title || '',
    code: promo.code || promo.voucherCode || null,
    discount: promo.discount || null,
    discountType: promo.discountType || null, // 'percentage' or 'amount'
    startDate: promo.startDate || null,
    endDate: promo.endDate || promo.expiryDate || null,
    terms: promo.terms || '',
    deepLink: promo.deepLink || promo.trackingLink || '',
    advertiser: 'Booking.com',
    source: 'Awin',
  }));
}

// ─── LINK BUILDER ────────────────────────────────────────────

/**
 * Generate Awin affiliate tracking link for a Booking.com URL
 *
 * This creates a proper tracking link so we earn commission when
 * users rebook through our links.
 */
export function buildAffiliateLink(destinationUrl, { region = 'brazil', clickRef = '' } = {}) {
  const regionMap = {
    brazil: () => env('BOOKING_AWIN_ADVERTISER_ID_BRAZIL', '18120'),
    latam: () => env('BOOKING_AWIN_ADVERTISER_ID_LATAM', '18119'),
    apac: () => env('BOOKING_AWIN_ADVERTISER_ID_APAC', '18117'),
    na: () => env('BOOKING_AWIN_ADVERTISER_ID_NA', '6776'),
  };
  const advertiserId = (regionMap[region] || regionMap.brazil)();

  // Awin tracking link format
  const baseLink = `https://www.awin1.com/cread.php`;
  const params = new URLSearchParams({
    awinmid: advertiserId,
    awinaffid: env('AWIN_AFFILIATE_ID'),
    ued: destinationUrl,
  });

  if (clickRef) {
    params.set('clickref', clickRef);
  }

  return `${baseLink}?${params.toString()}`;
}

/**
 * Build a Booking.com search URL with affiliate tracking
 */
export function buildBookingSearchLink({
  destination,
  checkinDate,
  checkoutDate,
  adults = 2,
  rooms = 1,
  clickRef = '',
}) {
  // Build the Booking.com search URL
  const bookingParams = new URLSearchParams({
    ss: destination || '',
    checkin: checkinDate || '',
    checkout: checkoutDate || '',
    group_adults: adults.toString(),
    no_rooms: rooms.toString(),
    selected_currency: 'BRL',
  });

  const bookingUrl = `https://www.booking.com/searchresults.html?${bookingParams.toString()}`;

  // Wrap with Awin tracking
  return buildAffiliateLink(bookingUrl, { clickRef });
}

/**
 * Build a direct Booking.com hotel page link with affiliate tracking
 */
export function buildBookingHotelLink({
  hotelSlug,
  checkinDate,
  checkoutDate,
  adults = 2,
  rooms = 1,
  clickRef = '',
}) {
  const bookingParams = new URLSearchParams({
    checkin: checkinDate || '',
    checkout: checkoutDate || '',
    group_adults: adults.toString(),
    no_rooms: rooms.toString(),
    selected_currency: 'BRL',
  });

  const bookingUrl = `https://www.booking.com/hotel/${hotelSlug}.html?${bookingParams.toString()}`;

  return buildAffiliateLink(bookingUrl, { clickRef });
}

// ─── LINK BUILDER API (batch) ────────────────────────────────

/**
 * Use Awin's Link Builder API to generate tracking links
 * POST — creates proper deep links with click tracking
 */
export async function createTrackingLinks(urls, { region = 'apac' } = {}) {
  const advertiserId = region === 'na'
    ? env('BOOKING_AWIN_ADVERTISER_ID_NA', '6776')
    : env('BOOKING_AWIN_ADVERTISER_ID_APAC', '18117');

  try {
    const result = await awinRequest(
      'POST',
      `/publishers/${env('AWIN_AFFILIATE_ID')}/linkbuilder`,
      {
        advertiserId: parseInt(advertiserId),
        links: urls.map((url) => ({ destinationUrl: url })),
      }
    );
    return result || [];
  } catch (error) {
    console.error(`[Awin] Link builder error: ${error.message}`);
    // Fallback to client-side link building
    return urls.map((url) => ({
      destinationUrl: url,
      trackingUrl: buildAffiliateLink(url, { region }),
    }));
  }
}

// ─── TRANSACTIONS ────────────────────────────────────────────

/**
 * Get recent transactions (commission tracking)
 * Useful for showing users their rebooking savings that actually went through
 */
export async function getTransactions({ startDate, endDate } = {}) {
  const now = new Date();
  const start = startDate || new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = endDate || now.toISOString().split('T')[0];

  try {
    const result = await awinRequest(
      'GET',
      `/publishers/${env('AWIN_AFFILIATE_ID')}/transactions/?startDate=${start}&endDate=${end}&timezone=UTC`
    );
    return result || [];
  } catch (error) {
    console.error(`[Awin] Transactions error: ${error.message}`);
    return [];
  }
}

// ─── PROGRAMMES ──────────────────────────────────────────────

/**
 * Get joined programmes (to verify Booking.com connection)
 */
export async function getJoinedProgrammes() {
  try {
    const result = await awinRequest(
      'GET',
      `/publishers/${env('AWIN_AFFILIATE_ID')}/programmes?relationship=joined`
    );
    return result || [];
  } catch (error) {
    console.error(`[Awin] Programmes error: ${error.message}`);
    return [];
  }
}
