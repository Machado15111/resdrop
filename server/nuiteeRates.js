/**
 * Nuitée (LiteAPI) live-rate source for the price comparison.
 *
 * Independent from SerpApi/Google Hotels: it resolves the booking's hotel to a
 * Nuitée hotel id (via the cached mapping first, then a live match) and pulls
 * live rates from LiteAPI's free `/hotels/rates` endpoint. Used as an ADDITIONAL
 * source so bookings still get a real quote when Google's OTA coverage is thin.
 *
 * Returns results in the same shape as parseGoogleHotelsResults so the caller
 * (searchPrices) and the frontend can treat every source uniformly.
 */

import { searchRates, nuiteeConfigured, getHotels } from './liteApi.js';
import { matchHotelWithNuitee, resolveCountryCode } from './enrichment.js';
import {
  isRoomTypeCompatible, normalizeRoomType, isHotelNameMatch, roomMatchRank,
  isRefundabilityCompatible, bookingIsRefundable,
} from './serpApi.js';

/**
 * Resolve the booking's hotel to a Nuitée hotel id.
 *   1. The verified/cached mapping (enrichment, score ≥ 0.80).
 *   2. Lenient fallback: search the city catalog and take a strong NAME match.
 *      Enrichment's overall score also weighs address/coords, so a real hotel
 *      can land in "needs review" while its NAME is unambiguous — good enough to
 *      fetch rates for the same property.
 */
async function resolveNuiteeHotelId(booking, hints) {
  const match = await matchHotelWithNuitee({
    hotelName: booking.hotelName,
    city: hints.city,
    country: hints.country,
    destination: booking.destination,
  });
  if (match?.hotel?.nuiteeHotelId) return match.hotel.nuiteeHotelId;

  const countryCode = resolveCountryCode({ country: hints.country, currency: booking.currency });
  if (!countryCode || !hints.city) return null;

  const candidates = await getHotels({ cityName: hints.city, countryCode, limit: 100 });
  const named = (Array.isArray(candidates) ? candidates : [])
    .find(c => c?.name && isHotelNameMatch(c.name, booking.hotelName, { destination: booking.destination }));
  if (named?.id) {
    console.log(`[Nuitée] Lenient name match for "${booking.hotelName}" → "${named.name}" (${named.id})`);
    return named.id;
  }
  return null;
}

function nightsBetween(checkin, checkout) {
  const a = new Date(checkin);
  const b = new Date(checkout);
  const n = Math.round((b - a) / (1000 * 60 * 60 * 24));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * Pull the lowest live Nuitée rate for the booked hotel and map it to a result.
 * Always resolves to an array (0 or 1 result); never throws.
 */
export async function searchNuiteeRates(booking, { currency } = {}) {
  // Quote in the booking's own currency (see quoteCurrencyFor in index.js).
  currency = currency || booking?.currency || 'USD';
  if (!nuiteeConfigured()) return [];
  if (!booking?.hotelName || !booking.checkinDate || !booking.checkoutDate) return [];

  try {
    // Best-effort city/country from the free-text destination ("City, Country").
    const [destCity, destCountry] = (booking.destination || '').split(',').map(s => s.trim());
    const hints = {
      city: booking.city || destCity || '',
      country: booking.country || destCountry || '',
    };

    const hotelId = await resolveNuiteeHotelId(booking, hints);
    if (!hotelId) {
      console.log(`[Nuitée] No hotel id for "${booking.hotelName}" — skipping rates`);
      return [];
    }

    const data = await searchRates({
      hotelIds: [hotelId],
      checkin: booking.checkinDate,
      checkout: booking.checkoutDate,
      currency,
      guestNationality: currency === 'BRL' ? 'BR' : 'US',
      occupancies: [{ adults: 2 }],
      maxRatesPerHotel: 5,
    });

    return parseNuiteeRates(data, booking, currency);
  } catch (err) {
    console.error(`[Nuitée] rate search failed: ${err.message}`);
    return [];
  }
}

/**
 * Reduce a LiteAPI /hotels/rates response to the single lowest valid rate and
 * shape it like a SerpApi result. Defensive against the response's nested,
 * sometimes-varying structure.
 */
export function parseNuiteeRates(data, booking, quoteCurrency) {
  // Amounts come back in the currency the request asked for — stamp it on the
  // result so the UI never labels them with a different currency's symbol.
  const currency = quoteCurrency || booking?.currency || 'USD';
  const hotels = data?.data || data?.rates || [];
  if (!Array.isArray(hotels) || hotels.length === 0) return [];

  const nights = nightsBetween(booking.checkinDate, booking.checkoutDate);
  const bookingRoomType = booking.roomType || '';

  // The room the guest actually holds — imported bookings keep the hotel's own
  // wording under roomTypeCustom.
  const wantedRoom = (booking.roomType === 'Other' && booking.roomTypeCustom)
    ? booking.roomTypeCustom
    : bookingRoomType;

  const candidates = [];
  for (const h of hotels) {
    for (const rt of (h.roomTypes || [])) {
      for (const rate of (rt.rates || [])) {
        const total =
          rate?.retailRate?.total?.[0]?.amount ??
          rt?.offerRetailRate?.amount ??
          null;
        if (total == null || !(total > 0)) continue;

        const roomName = rate.name || rate.boardName || rt.name || '';
        const tag = rate?.cancellationPolicies?.refundableTag;
        const flag = rate?.cancellationPolicies?.refundable;
        // TRUE / FALSE / NULL — "LiteAPI didn't say" must stay distinct from
        // "sold as non-refundable" (same contract as detectFreeCancellation).
        const freeCancellation =
          (tag === 'RFN' || flag === true) ? true
            : (tag === 'NRFN' || flag === false) ? false
              : null;

        candidates.push({ total, roomName, freeCancellation });
      }
    }
  }
  if (!candidates.length) return [];

  // Quote the guest's OWN room when the hotel sells it. Taking the globally
  // cheapest rate prices a Deluxe reservation against a Standard room — the
  // same defect the Google parser had (see pickRoomRate in serpApi.js): it
  // reads as a saving that simply isn't the same product. Fall back to the
  // cheapest only when their room isn't offered, in which case roomTypeMatch
  // below keeps the quote flagged as non-comparable.
  const ranked = candidates
    .map(c => ({ ...c, rank: roomMatchRank(c.roomName, wantedRoom) }))
    .filter(c => c.rank !== null);
  ranked.sort((a, b) => (a.rank - b.rank) || (a.total - b.total));

  const best = ranked[0]
    || candidates.slice().sort((a, b) => a.total - b.total)[0];

  const originalPrice = parseFloat(booking.originalPrice) || 0;
  const roomTypeMatch = isRoomTypeCompatible(bookingRoomType, best.roomName);
  // Same bar as the Google parser: a saving needs the same room AND
  // like-for-like cancellation terms, or it isn't the same product.
  const comparable = roomTypeMatch
    && isRefundabilityCompatible(bookingIsRefundable(booking), best.freeCancellation);
  const savings = comparable ? Math.round((originalPrice - best.total) * 100) / 100 : 0;
  const savingsPercent = savings > 0 && originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;

  return [{
    source: 'Nuitée',
    sourceLogo: '',
    sourceId: 'nuitee_real',
    hotelName: booking.hotelName,
    isExactMatch: true,            // resolved by hotel id — same property by construction
    roomType: best.roomName || undefined,
    roomTypeCategory: normalizeRoomType(best.roomName),
    roomTypeMatch,
    isTrustedSource: true,
    confidenceScore: 90,
    currency,
    pricePerNight: Math.round((best.total / nights) * 100) / 100,
    totalPrice: best.total,
    savings: savings > 0 ? savings : 0,
    savingsPercent: savingsPercent > 0 ? savingsPercent : 0,
    hasDrop: comparable && savings > 0,
    freeCancellation: best.freeCancellation,
    breakfastIncluded: false,
    lastChecked: new Date().toISOString(),
    isReal: true,
    link: '',
    affiliateLink: '',
    estimatedCommission: 0,
  }];
}
