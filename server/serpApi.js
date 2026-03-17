/**
 * SerpApi Google Hotels Integration
 *
 * Uses SerpApi's Google Hotels engine to get real hotel prices
 * from multiple OTAs (Booking.com, Expedia, Hotels.com, Agoda, etc.)
 *
 * Docs: https://serpapi.com/google-hotels-api
 */

function env(key, fallback = '') {
  return process.env[key] || fallback;
}

export function isSerpApiConfigured() {
  return !!env('SERPAPI_KEY');
}

/**
 * Normalize text for fuzzy matching — remove accents, lowercase, trim
 */
function normalize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s]/g, '') // remove special chars
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if two hotel names refer to the same property
 * Uses multiple strategies: exact, contains, word overlap
 */
function isHotelNameMatch(resultName, bookingName) {
  const a = normalize(resultName);
  const b = normalize(bookingName);

  // Direct containment (either direction)
  if (a.includes(b) || b.includes(a)) return true;

  // Word overlap — if 2+ significant words match, likely same hotel
  const stopWords = new Set(['hotel', 'resort', 'spa', 'suites', 'inn', 'the', 'de', 'do', 'da', 'e', 'a', 'o']);
  const wordsA = a.split(' ').filter(w => w.length > 2 && !stopWords.has(w));
  const wordsB = b.split(' ').filter(w => w.length > 2 && !stopWords.has(w));

  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.some(wb => wb.includes(w) || w.includes(wb))) overlap++;
  }

  // If ≥2 significant words match, or if one name only has 1 significant word and it matches
  const minWords = Math.min(wordsA.length, wordsB.length);
  if (minWords <= 1) return overlap >= 1;
  return overlap >= 2;
}

/**
 * Search Google Hotels for a specific hotel
 */
export async function searchGoogleHotels({
  hotelName,
  destination,
  checkinDate,
  checkoutDate,
  adults = 2,
  currency = 'BRL',
}) {
  const apiKey = env('SERPAPI_KEY');
  if (!apiKey) throw new Error('SERPAPI_KEY not configured');

  // Build search query — hotel name + destination for best match
  const query = destination ? `${hotelName} ${destination}` : hotelName;

  const params = new URLSearchParams({
    engine: 'google_hotels',
    q: query,
    check_in_date: checkinDate,
    check_out_date: checkoutDate,
    adults: adults.toString(),
    currency,
    gl: 'br',
    hl: 'pt-br',
    // sort_by omitted = relevance (default), so the exact hotel appears first
    api_key: apiKey,
  });

  const url = `https://serpapi.com/search.json?${params.toString()}`;
  console.log(`[SerpApi] Searching: "${query}" | ${checkinDate} → ${checkoutDate} | ${currency}`);

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SerpApi ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`SerpApi error: ${data.error}`);
  }

  return data;
}

/**
 * Parse SerpApi Google Hotels results into our standard format
 * Separates exact hotel matches from alternative options
 */
export function parseGoogleHotelsResults(data, originalPrice, booking) {
  const results = [];
  const properties = data.properties || [];

  // ── FORMAT A: Property Detail Page ──────────────────────────
  // When Google Hotels finds an exact match, it returns a single hotel's
  // detail page with prices from multiple vendors (prices[] / featured_prices[])
  // instead of a list of properties.
  if (properties.length === 0 && data.type === 'hotel' && data.name) {
    console.log(`[SerpApi] Property detail page: "${data.name}" — parsing vendor prices`);

    const hotelName = data.name;
    const rating = data.overall_rating || 0;
    const reviews = data.reviews || 0;
    const isMatch = isHotelNameMatch(hotelName, booking.hotelName);

    // Combine prices and featured_prices, dedup by source name
    const allPrices = [...(data.prices || []), ...(data.featured_prices || [])];
    const seen = new Set();

    for (const p of allPrices) {
      const sourceName = p.source || 'Unknown';
      if (seen.has(sourceName)) continue;
      seen.add(sourceName);

      const totalRate = p.total_rate?.extracted_lowest || 0;
      const perNight = p.rate_per_night?.extracted_lowest || 0;
      const link = p.link || data.link || '';

      if (totalRate <= 0) continue;

      // Detect OTA from link or source name
      const source = detectSourceFromVendor(sourceName, link);

      // Skip blocked/unreliable sources (unless hotel itself is that brand)
      if (isBlockedSource(sourceName, link, booking.hotelName)) continue;

      const savings = isMatch ? Math.round((originalPrice - totalRate) * 100) / 100 : 0;
      const savingsPercent = isMatch && savings > 0 ? Math.round((savings / originalPrice) * 100) : 0;

      results.push({
        source: source.name,
        sourceLogo: source.logo,
        sourceId: source.id,
        hotelName,
        isExactMatch: isMatch,
        pricePerNight: perNight,
        totalPrice: totalRate,
        savings: savings > 0 ? savings : 0,
        savingsPercent: savingsPercent > 0 ? savingsPercent : 0,
        hasDrop: isMatch && savings > 0,
        freeCancellation: false,
        breakfastIncluded: false,
        lastChecked: new Date().toISOString(),
        isReal: true,
        rating,
        reviews,
        link,
        affiliateLink: '',
        estimatedCommission: 0,
        official: p.official || false,
      });
    }

    // Sort by price (cheapest first)
    results.sort((a, b) => a.totalPrice - b.totalPrice);

    const exactCount = results.filter(r => r.isExactMatch).length;
    console.log(`[SerpApi] Detail page: ${results.length} vendor prices, ${exactCount} exact matches`);
    return results;
  }

  // ── FORMAT B: Search Results List ───────────────────────────
  // Normal search results with multiple properties
  if (properties.length === 0) {
    console.log('[SerpApi] No properties found (empty response)');
    return results;
  }

  console.log(`[SerpApi] Found ${properties.length} properties`);

  for (const prop of properties.slice(0, 15)) {
    const name = prop.name || 'Unknown Hotel';
    const totalRate = prop.total_rate?.extracted_lowest || 0;
    const perNight = prop.rate_per_night?.extracted_lowest || 0;
    const link = prop.link || '';
    const rating = prop.overall_rating || 0;
    const reviews = prop.reviews || 0;

    if (totalRate <= 0) continue;

    // Detect which OTA from the link
    const source = detectSource(prop, link);

    // Skip blocked/unreliable sources (unless hotel itself is that brand)
    if (isBlockedSource(source.name, link, booking.hotelName)) continue;

    // Check if this is the same hotel the user booked
    const isMatch = isHotelNameMatch(name, booking.hotelName);

    // Savings only apply for exact matches
    const savings = isMatch ? Math.round((originalPrice - totalRate) * 100) / 100 : 0;
    const savingsPercent = isMatch && savings > 0 ? Math.round((savings / originalPrice) * 100) : 0;

    results.push({
      source: source.name,
      sourceLogo: source.logo,
      sourceId: source.id,
      hotelName: name,
      isExactMatch: isMatch,
      pricePerNight: perNight,
      totalPrice: totalRate,
      savings: savings > 0 ? savings : 0,
      savingsPercent: savingsPercent > 0 ? savingsPercent : 0,
      hasDrop: isMatch && savings > 0,
      freeCancellation: prop.amenities?.includes('Free cancellation') || false,
      breakfastIncluded: prop.amenities?.includes('Breakfast') || prop.amenities?.includes('Free breakfast') || false,
      lastChecked: new Date().toISOString(),
      isReal: true,
      rating,
      reviews,
      link,
      affiliateLink: '', // Will be set by caller if Awin is configured
      estimatedCommission: 0,
    });
  }

  // Sort: exact matches first (by price), then alternatives (by price)
  results.sort((a, b) => {
    if (a.isExactMatch && !b.isExactMatch) return -1;
    if (!a.isExactMatch && b.isExactMatch) return 1;
    return a.totalPrice - b.totalPrice;
  });

  const exactCount = results.filter(r => r.isExactMatch).length;
  const altCount = results.filter(r => !r.isExactMatch).length;
  console.log(`[SerpApi] Matches: ${exactCount} exact, ${altCount} alternatives`);

  return results;
}

/**
 * Blocked sources — unreliable or budget-only platforms that should be
 * excluded from results unless the user's hotel belongs to that brand.
 * Matched case-insensitively against source/vendor names and URLs.
 */
const BLOCKED_SOURCES = [
  'oyo',
  'oyorooms',
  'elmisti',
  'el misti',
  'hostel-bb',
  'hotel-bb',
  'hostelclub',
  'hostelling',
];

/**
 * Check if a source should be excluded from results.
 * A source is blocked unless the booked hotel itself belongs to that brand
 * (e.g., an OYO-branded hotel should still show OYO results).
 */
function isBlockedSource(sourceName, link, bookedHotelName) {
  const src = (sourceName || '').toLowerCase();
  const url = (link || '').toLowerCase();
  const hotel = (bookedHotelName || '').toLowerCase();

  for (const blocked of BLOCKED_SOURCES) {
    const inSource = src.includes(blocked);
    const inUrl = url.includes(blocked);
    if (inSource || inUrl) {
      // Allow if the booked hotel itself is from that brand
      if (hotel.includes(blocked)) return false;
      return true;
    }
  }
  return false;
}

/**
 * Detect source from vendor name (used in property detail page format)
 * The detail page gives us the vendor name directly (e.g., "Booking.com", "Agoda")
 */
function detectSourceFromVendor(vendorName, link) {
  const v = (vendorName || '').toLowerCase();

  // Major OTAs by name
  if (v.includes('booking.com')) return { name: 'Booking.com', logo: '🅱️', id: 'booking_real' };
  if (v.includes('expedia')) return { name: 'Expedia', logo: '✈️', id: 'expedia_real' };
  if (v.includes('hoteis.com') || v.includes('hotels.com')) return { name: 'Hotels.com', logo: '🏨', id: 'hotels_real' };
  if (v.includes('agoda')) return { name: 'Agoda', logo: '🌟', id: 'agoda_real' };
  if (v.includes('trip.com')) return { name: 'Trip.com', logo: '📡', id: 'trip_real' };
  if (v.includes('kayak')) return { name: 'Kayak', logo: '🔍', id: 'kayak_real' };
  if (v.includes('trivago')) return { name: 'Trivago', logo: '🔎', id: 'trivago_real' };
  if (v.includes('priceline')) return { name: 'Priceline', logo: '💲', id: 'priceline_real' };
  if (v.includes('decolar')) return { name: 'Decolar', logo: '✈️', id: 'decolar_real' };
  if (v.includes('hurb')) return { name: 'Hurb', logo: '🌴', id: 'hurb_real' };
  if (v.includes('traveluro')) return { name: 'Traveluro', logo: '🌐', id: 'traveluro_real' };
  if (v.includes('travelocity')) return { name: 'Travelocity', logo: '🌐', id: 'travelocity_real' };
  if (v.includes('vio.com')) return { name: 'Vio.com', logo: '🌐', id: 'vio_real' };
  if (v.includes('clicktrip')) return { name: 'Clicktrip', logo: '🌐', id: 'clicktrip_real' };
  if (v.includes('luxury escapes')) return { name: 'Luxury Escapes', logo: '💎', id: 'luxury_escapes_real' };
  if (v.includes('laterooms')) return { name: 'LateRooms', logo: '🌐', id: 'laterooms_real' };
  if (v.includes('my luxury')) return { name: 'My Luxury Hotel', logo: '💎', id: 'myluxury_real' };

  // Hotel chains (when the vendor is the hotel itself)
  if (v.includes('meli')) return { name: 'Meliá (Direto)', logo: '🏨', id: 'melia_direct' };
  if (v.includes('hilton')) return { name: 'Hilton (Direto)', logo: '🏨', id: 'hilton_direct' };
  if (v.includes('marriott')) return { name: 'Marriott (Direto)', logo: '🏨', id: 'marriott_direct' };
  if (v.includes('accor')) return { name: 'Accor (Direto)', logo: '🏨', id: 'accor_direct' };
  if (v.includes('ihg')) return { name: 'IHG (Direto)', logo: '🏨', id: 'ihg_direct' };
  if (v.includes('hyatt')) return { name: 'Hyatt (Direto)', logo: '🏨', id: 'hyatt_direct' };
  if (v.includes('wyndham')) return { name: 'Wyndham (Direto)', logo: '🏨', id: 'wyndham_direct' };

  // Fallback: try link detection, then use vendor name as-is
  if (link) {
    const fromLink = detectSource({}, link);
    if (fromLink.id !== 'google_hotels') return fromLink;
  }

  // Use the vendor name directly
  return { name: vendorName, logo: '🌐', id: vendorName.toLowerCase().replace(/[^a-z0-9]/g, '_') };
}

/**
 * Detect which OTA/source a property comes from
 * Recognizes major OTAs, hotel chains, and labels direct hotel sites
 */
function detectSource(prop, link) {
  const url = (link || '').toLowerCase();

  // Major OTAs
  if (url.includes('booking.com')) return { name: 'Booking.com', logo: '🅱️', id: 'booking_real' };
  if (url.includes('expedia.com')) return { name: 'Expedia', logo: '✈️', id: 'expedia_real' };
  if (url.includes('hotels.com')) return { name: 'Hotels.com', logo: '🏨', id: 'hotels_real' };
  if (url.includes('agoda.com')) return { name: 'Agoda', logo: '🌟', id: 'agoda_real' };
  if (url.includes('trip.com')) return { name: 'Trip.com', logo: '📡', id: 'trip_real' };
  if (url.includes('kayak')) return { name: 'Kayak', logo: '🔍', id: 'kayak_real' };
  if (url.includes('trivago')) return { name: 'Trivago', logo: '🔎', id: 'trivago_real' };
  if (url.includes('priceline.com')) return { name: 'Priceline', logo: '💲', id: 'priceline_real' };
  if (url.includes('decolar.com')) return { name: 'Decolar', logo: '✈️', id: 'decolar_real' };
  if (url.includes('hurb.com')) return { name: 'Hurb', logo: '🌴', id: 'hurb_real' };

  // Hotel chains — direct sites
  if (url.includes('all.accor.com') || url.includes('accor.com')) return { name: 'Accor (Direto)', logo: '🏨', id: 'accor_direct' };
  if (url.includes('hilton.com')) return { name: 'Hilton (Direto)', logo: '🏨', id: 'hilton_direct' };
  if (url.includes('marriott.com')) return { name: 'Marriott (Direto)', logo: '🏨', id: 'marriott_direct' };
  if (url.includes('ihg.com')) return { name: 'IHG (Direto)', logo: '🏨', id: 'ihg_direct' };
  if (url.includes('hyatt.com')) return { name: 'Hyatt (Direto)', logo: '🏨', id: 'hyatt_direct' };
  if (url.includes('wyndham')) return { name: 'Wyndham (Direto)', logo: '🏨', id: 'wyndham_direct' };
  if (url.includes('melia.com')) return { name: 'Melia (Direto)', logo: '🏨', id: 'melia_direct' };
  if (url.includes('vilagale.com')) return { name: 'Vila Gale (Direto)', logo: '🏨', id: 'vilagale_direct' };
  if (url.includes('bluetree.com')) return { name: 'Blue Tree (Direto)', logo: '🏨', id: 'bluetree_direct' };
  if (url.includes('intercityhoteis')) return { name: 'Intercity (Direto)', logo: '🏨', id: 'intercity_direct' };
  if (url.includes('travelinn.com')) return { name: 'Travel Inn (Direto)', logo: '🏨', id: 'travelinn_direct' };
  if (url.includes('housi.com')) return { name: 'Housi (Direto)', logo: '🏠', id: 'housi_direct' };
  if (url.includes('atlanticahotels')) return { name: 'Atlantica (Direto)', logo: '🏨', id: 'atlantica_direct' };

  // Generic: if URL exists, it's a direct/independent hotel site
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    try {
      const hostname = new URL(link).hostname.replace('www.', '');
      const brand = hostname.split('.')[0];
      const displayName = brand.charAt(0).toUpperCase() + brand.slice(1);
      return { name: `${displayName} (Direto)`, logo: '🏨', id: 'hotel_direct' };
    } catch {
      return { name: 'Site do Hotel', logo: '🏨', id: 'hotel_direct' };
    }
  }

  return { name: 'Google Hotels', logo: '🔍', id: 'google_hotels' };
}

/**
 * Full search: query SerpApi and return parsed results
 */
export async function searchRealPrices(booking, options = {}) {
  try {
    const data = await searchGoogleHotels({
      hotelName: booking.hotelName,
      destination: booking.destination,
      checkinDate: booking.checkinDate,
      checkoutDate: booking.checkoutDate,
      currency: options.currency || 'BRL',
    });

    const results = parseGoogleHotelsResults(data, booking.originalPrice, booking);
    const bestMatch = results.find(r => r.isExactMatch);
    const bestAlt = results.find(r => !r.isExactMatch);
    console.log(`[SerpApi] Parsed ${results.length} results | Best match: ${bestMatch ? `R$${bestMatch.totalPrice} (${bestMatch.hotelName})` : 'none'} | Best alt: R$${bestAlt?.totalPrice || 'N/A'}`);
    return results;
  } catch (err) {
    console.error(`[SerpApi] Search failed: ${err.message}`);
    return [];
  }
}
