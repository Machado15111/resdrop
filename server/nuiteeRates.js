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

import { searchRates, nuiteeConfigured } from './liteApi.js';
import { matchHotelWithNuitee } from './enrichment.js';
import { isRoomTypeCompatible, normalizeRoomType } from './serpApi.js';

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
export async function searchNuiteeRates(booking, { currency = 'BRL' } = {}) {
  if (!nuiteeConfigured()) return [];
  if (!booking?.hotelName || !booking.checkinDate || !booking.checkoutDate) return [];

  try {
    // Best-effort city/country from the free-text destination ("City, Country").
    const [destCity, destCountry] = (booking.destination || '').split(',').map(s => s.trim());
    const match = await matchHotelWithNuitee({
      hotelName: booking.hotelName,
      city: booking.city || destCity || '',
      country: booking.country || destCountry || '',
      destination: booking.destination,
    });

    const hotelId = match?.hotel?.nuiteeHotelId;
    if (!hotelId) {
      console.log(`[Nuitée] No hotel id for "${booking.hotelName}" (${match?.status || 'no match'}) — skipping rates`);
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
export function parseNuiteeRates(data, booking, currency = 'BRL') {
  const hotels = data?.data || data?.rates || [];
  if (!Array.isArray(hotels) || hotels.length === 0) return [];

  const nights = nightsBetween(booking.checkinDate, booking.checkoutDate);
  const bookingRoomType = booking.roomType || '';

  let best = null;
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
        const freeCancellation = tag === 'RFN' || rate?.cancellationPolicies?.refundable === true;

        if (!best || total < best.total) best = { total, roomName, freeCancellation };
      }
    }
  }

  if (!best) return [];

  const originalPrice = parseFloat(booking.originalPrice) || 0;
  const roomTypeMatch = isRoomTypeCompatible(bookingRoomType, best.roomName);
  const savings = roomTypeMatch ? Math.round((originalPrice - best.total) * 100) / 100 : 0;
  const savingsPercent = savings > 0 && originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;

  return [{
    source: 'Nuitée',
    sourceLogo: '🏨',
    sourceId: 'nuitee_real',
    hotelName: booking.hotelName,
    isExactMatch: true,            // resolved by hotel id — same property by construction
    roomType: best.roomName || undefined,
    roomTypeCategory: normalizeRoomType(best.roomName),
    roomTypeMatch,
    isTrustedSource: true,
    confidenceScore: 90,
    pricePerNight: Math.round((best.total / nights) * 100) / 100,
    totalPrice: best.total,
    savings: savings > 0 ? savings : 0,
    savingsPercent: savingsPercent > 0 ? savingsPercent : 0,
    hasDrop: roomTypeMatch && savings > 0,
    freeCancellation: best.freeCancellation,
    breakfastIncluded: false,
    lastChecked: new Date().toISOString(),
    isReal: true,
    link: '',
    affiliateLink: '',
    estimatedCommission: 0,
  }];
}
