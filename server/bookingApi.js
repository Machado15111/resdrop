/**
 * Booking.com Demand API Client
 *
 * Handles real hotel price searches via the Booking.com Demand API.
 * Falls back to simulation when API credentials are not configured.
 *
 * Docs: https://developers.booking.com/demand/docs/open-api/demand-api
 * Auth: https://developers.booking.com/demand/docs/development-guide/authentication
 */

// Read env vars dynamically (ES module imports hoist before dotenv.config)
function env(key, fallback = '') {
  return process.env[key] || fallback;
}

function getBaseUrl() {
  return env('BOOKING_USE_SANDBOX') === 'true'
    ? env('BOOKING_SANDBOX_URL', 'https://demandapi-sandbox.booking.com/3.1')
    : env('BOOKING_API_URL', 'https://demandapi.booking.com/3.1');
}

/**
 * Check if Booking.com API is properly configured
 */
export function isBookingApiConfigured() {
  return !!(env('BOOKING_API_TOKEN') && env('BOOKING_AFFILIATE_ID'));
}

/**
 * Make an authenticated request to the Booking.com Demand API
 */
async function apiRequest(endpoint, body) {
  const url = `${getBaseUrl()}${endpoint}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env('BOOKING_API_TOKEN')}`,
      'X-Affiliate-Id': env('BOOKING_AFFILIATE_ID'),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Booking.com API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * Search for accommodations matching the booking criteria
 *
 * Endpoint: POST /accommodations/search
 * Returns the cheapest available product for each accommodation
 */
export async function searchAccommodations({
  hotelName,
  destination,
  checkinDate,
  checkoutDate,
  guests = { number_of_adults: 2, number_of_rooms: 1 },
  currency = 'USD',
  rows = 10,
}) {
  // First, we need to resolve the destination to a Booking.com location ID
  // For now, we search by coordinates or city name
  const searchBody = {
    booker: {
      country: 'us',
      platform: 'desktop',
    },
    checkin: checkinDate,
    checkout: checkoutDate,
    guests: {
      number_of_adults: guests.number_of_adults || 2,
      number_of_rooms: guests.number_of_rooms || 1,
    },
    currency,
    rows,
    extras: ['extra_charges', 'products'],
  };

  // If we have coordinates, use them (most precise)
  if (guests.latitude && guests.longitude) {
    searchBody.coordinates = {
      latitude: guests.latitude,
      longitude: guests.longitude,
    };
  }

  try {
    const result = await apiRequest('/accommodations/search', searchBody);
    return result;
  } catch (error) {
    console.error('[BookingAPI] Search error:', error.message);
    throw error;
  }
}

/**
 * Check detailed availability and pricing for a specific accommodation
 *
 * Endpoint: POST /accommodations/availability
 * Returns detailed product availability, price, and charges
 */
export async function checkAvailability({
  accommodationId,
  checkinDate,
  checkoutDate,
  guests = { number_of_adults: 2, number_of_rooms: 1 },
  currency = 'USD',
}) {
  const body = {
    accommodation: accommodationId,
    booker: {
      country: 'us',
      platform: 'desktop',
    },
    checkin: checkinDate,
    checkout: checkoutDate,
    guests: {
      number_of_adults: guests.number_of_adults || 2,
      number_of_rooms: guests.number_of_rooms || 1,
    },
    currency,
    extras: ['extra_charges', 'products'],
  };

  try {
    const result = await apiRequest('/accommodations/availability', body);
    return result;
  } catch (error) {
    console.error('[BookingAPI] Availability error:', error.message);
    throw error;
  }
}

/**
 * Check bulk availability for multiple accommodations (up to 50)
 *
 * Endpoint: POST /accommodations/bulk-availability
 */
export async function checkBulkAvailability({
  accommodationIds,
  checkinDate,
  checkoutDate,
  guests = { number_of_adults: 2, number_of_rooms: 1 },
  currency = 'USD',
}) {
  const body = {
    accommodations: accommodationIds.slice(0, 50),
    booker: {
      country: 'us',
      platform: 'desktop',
    },
    checkin: checkinDate,
    checkout: checkoutDate,
    guests: {
      number_of_adults: guests.number_of_adults || 2,
      number_of_rooms: guests.number_of_rooms || 1,
    },
    currency,
    extras: ['extra_charges', 'products'],
  };

  try {
    const result = await apiRequest('/accommodations/bulk-availability', body);
    return result;
  } catch (error) {
    console.error('[BookingAPI] Bulk availability error:', error.message);
    throw error;
  }
}

/**
 * Parse Booking.com API response into our standardized price result format
 */
export function parseSearchResults(apiResponse, originalPrice) {
  if (!apiResponse?.data) return [];

  const results = [];

  for (const accommodation of apiResponse.data) {
    // Get the cheapest product
    const products = accommodation.products || [];
    if (products.length === 0) continue;

    // Sort by book price
    const sorted = [...products].sort((a, b) => {
      const priceA = a.price?.book || Infinity;
      const priceB = b.price?.book || Infinity;
      return priceA - priceB;
    });

    const cheapest = sorted[0];
    const totalPrice = cheapest.price?.book || cheapest.price?.total || 0;
    const nights = Math.max(1, sorted.length); // rough estimate

    const savings = Math.round((originalPrice - totalPrice) * 100) / 100;
    const savingsPercent = Math.round((savings / originalPrice) * 100);

    results.push({
      source: 'Booking.com',
      sourceLogo: '🅱️',
      sourceId: 'booking_com',
      accommodationId: accommodation.id,
      accommodationName: accommodation.name || 'Unknown',
      pricePerNight: Math.round((totalPrice / Math.max(1, nights)) * 100) / 100,
      totalPrice: Math.round(totalPrice * 100) / 100,
      savings: savings > 0 ? savings : 0,
      savingsPercent: savings > 0 ? savingsPercent : 0,
      hasDrop: savings > 0,
      freeCancellation: cheapest.policies?.cancellation?.type === 'free',
      breakfastIncluded: false, // would need to parse meal plans
      deepLink: accommodation.deep_link_url || accommodation.url || '',
      currency: apiResponse.data?.[0]?.currency || 'USD',
      lastChecked: new Date().toISOString(),
      isReal: true, // flag to indicate this is real data, not simulated
    });
  }

  results.sort((a, b) => a.totalPrice - b.totalPrice);
  return results;
}

/**
 * Parse availability response for a single accommodation
 */
export function parseAvailabilityResults(apiResponse, originalPrice) {
  if (!apiResponse?.data) return null;

  const data = apiResponse.data;
  const products = data.products || [];

  if (products.length === 0) return null;

  const sorted = [...products].sort((a, b) => {
    const priceA = a.price?.book || Infinity;
    const priceB = b.price?.book || Infinity;
    return priceA - priceB;
  });

  return sorted.map((product) => {
    const totalPrice = product.price?.book || product.price?.total || 0;
    const basePrice = product.price?.base || totalPrice;
    const savings = Math.round((originalPrice - totalPrice) * 100) / 100;
    const savingsPercent = Math.round((savings / originalPrice) * 100);

    return {
      source: 'Booking.com',
      sourceLogo: '🅱️',
      sourceId: 'booking_com',
      productId: product.id,
      priceBase: Math.round(basePrice * 100) / 100,
      priceBook: Math.round(totalPrice * 100) / 100,
      totalPrice: Math.round(totalPrice * 100) / 100,
      savings: savings > 0 ? savings : 0,
      savingsPercent: savings > 0 ? savingsPercent : 0,
      hasDrop: savings > 0,
      freeCancellation: product.policies?.cancellation?.type === 'free',
      extraCharges: product.price?.extra_charges || {},
      deepLink: data.deep_link_url || data.url || '',
      currency: data.currency || 'USD',
      lastChecked: new Date().toISOString(),
      isReal: true,
    };
  });
}
