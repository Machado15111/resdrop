/**
 * Expedia Affiliate API Client (via Awin)
 *
 * Handles interactions with Expedia's affiliate program through Awin:
 * - Affiliate link generation for Expedia hotel searches
 * - Commission tracking: Lodging 4%, Cars 1.5%, Vacation Rentals 2%, Packages 2%
 * - 7-day cookie window, last-click attribution via Awin
 *
 * NOT ELIGIBLE: Flights (0%), Insurance (0%), Lodging with coupon (0%)
 *
 * Docs: https://creator.expediagroup.com/lp/b/affhub/affiliate?siteid=2055
 */

function env(key, fallback = '') {
  return process.env[key] || fallback;
}

// Expedia commission structure
export const EXPEDIA_COMMISSIONS = {
  lodging: { rate: 0.04, label: '4%' },
  cars: { rate: 0.015, label: '1.5%' },
  vacationRentals: { rate: 0.02, label: '2%' },
  packages: { rate: 0.02, label: '2%' },
  lodgingWithCoupon: { rate: 0, label: '0%' },
  flights: { rate: 0, label: '0% (not eligible)' },
  insurance: { rate: 0, label: '0% (not eligible)' },
};

// Expedia Awin advertiser IDs by region
const EXPEDIA_ADVERTISER_IDS = {
  brazil: () => env('EXPEDIA_AWIN_ADVERTISER_ID_BRAZIL', ''),
  latam: () => env('EXPEDIA_AWIN_ADVERTISER_ID_LATAM', ''),
  global: () => env('EXPEDIA_AWIN_ADVERTISER_ID_GLOBAL', ''),
  us: () => env('EXPEDIA_AWIN_ADVERTISER_ID_US', ''),
};

/**
 * Check if Expedia affiliate is configured
 */
export function isExpediaConfigured() {
  return !!(
    env('AWIN_API_TOKEN') &&
    env('AWIN_AFFILIATE_ID') &&
    env('EXPEDIA_AWIN_ADVERTISER_ID')
  );
}

/**
 * Build Expedia hotel search URL
 */
export function buildExpediaSearchUrl({
  destination,
  checkinDate,
  checkoutDate,
  adults = 2,
  rooms = 1,
  currency = 'BRL',
}) {
  const params = new URLSearchParams({
    q: destination || '',
    d1: checkinDate || '',
    d2: checkoutDate || '',
    adults: adults.toString(),
    rooms: rooms.toString(),
  });

  // Use Expedia Brazil domain for BR market
  const domain = currency === 'BRL' ? 'www.expedia.com.br' : 'www.expedia.com';
  return `https://${domain}/Hotel-Search?${params.toString()}`;
}

/**
 * Build Expedia hotel page URL
 */
export function buildExpediaHotelUrl({
  hotelId,
  hotelSlug,
  checkinDate,
  checkoutDate,
  adults = 2,
  rooms = 1,
  currency = 'BRL',
}) {
  const params = new URLSearchParams({
    chkin: checkinDate || '',
    chkout: checkoutDate || '',
    rm1: `a${adults}`,
    rooms: rooms.toString(),
  });

  const domain = currency === 'BRL' ? 'www.expedia.com.br' : 'www.expedia.com';
  const slug = hotelSlug || `h${hotelId}`;
  return `https://${domain}/Hotels-${slug}.h${hotelId}.Hotel-Information?${params.toString()}`;
}

/**
 * Generate Awin affiliate tracking link for an Expedia URL
 */
export function buildExpediaAffiliateLink(destinationUrl, { clickRef = '' } = {}) {
  const advertiserId = env('EXPEDIA_AWIN_ADVERTISER_ID');
  const affiliateId = env('AWIN_AFFILIATE_ID');

  if (!advertiserId || !affiliateId) {
    return destinationUrl; // Return raw URL if not configured
  }

  const baseLink = 'https://www.awin1.com/cread.php';
  const params = new URLSearchParams({
    awinmid: advertiserId,
    awinaffid: affiliateId,
    ued: destinationUrl,
  });

  if (clickRef) {
    params.set('clickref', clickRef);
  }

  return `${baseLink}?${params.toString()}`;
}

/**
 * Build a full Expedia search link with Awin tracking
 */
export function buildExpediaSearchLink({
  destination,
  checkinDate,
  checkoutDate,
  adults = 2,
  rooms = 1,
  currency = 'BRL',
  clickRef = '',
}) {
  const searchUrl = buildExpediaSearchUrl({
    destination,
    checkinDate,
    checkoutDate,
    adults,
    rooms,
    currency,
  });

  return buildExpediaAffiliateLink(searchUrl, { clickRef });
}

/**
 * Calculate estimated commission from a booking
 */
export function calculateExpediaCommission(bookingAmount, type = 'lodging') {
  const commissionInfo = EXPEDIA_COMMISSIONS[type] || EXPEDIA_COMMISSIONS.lodging;
  return {
    amount: Math.round(bookingAmount * commissionInfo.rate * 100) / 100,
    rate: commissionInfo.rate,
    label: commissionInfo.label,
    type,
  };
}

/**
 * Get all commission rates for display
 */
export function getExpediaCommissionRates() {
  return Object.entries(EXPEDIA_COMMISSIONS).map(([key, value]) => ({
    category: key.replace(/([A-Z])/g, ' $1').trim(),
    rate: value.rate,
    label: value.label,
    eligible: value.rate > 0,
  }));
}

/**
 * Get Expedia programme info for admin dashboard
 */
export function getExpediaProgrammeInfo() {
  return {
    name: 'Expedia',
    network: 'Awin',
    advertiserId: env('EXPEDIA_AWIN_ADVERTISER_ID') || 'Not configured',
    configured: isExpediaConfigured(),
    commissions: EXPEDIA_COMMISSIONS,
    cookieWindow: '7 days',
    attributionModel: 'Last click via Awin',
    allowedTypes: ['Coupons', 'Social Media', 'Content', 'Email Marketing', 'Cashback'],
    notAllowed: ['Siteunder', 'Direct Search (SEM)'],
    nonEligible: ['Flights', 'Insurance'],
    domains: {
      brazil: 'expedia.com.br',
      us: 'expedia.com',
      global: 'expedia.com',
    },
  };
}
