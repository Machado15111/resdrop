import * as db from './db.js';
import { getHotels, nuiteeConfigured } from './liteApi.js';

/**
 * Normalizes strings for matching.
 */
function normalizeForMatch(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes deterministic match score (0.0 to 1.0) between extracted hotel & catalog property.
 */
export function calculateMatchScore(extracted, candidate) {
  if (!extracted || !candidate) return 0;
  const nameA = normalizeForMatch(extracted.hotelName);
  const nameB = normalizeForMatch(candidate.name);

  if (!nameA || !nameB) return 0;

  let score = 0;

  // Exact name match
  if (nameA === nameB) {
    score += 0.70;
  } else if (nameA.includes(nameB) || nameB.includes(nameA)) {
    score += 0.50;
  } else {
    // Word intersection score
    const wordsA = new Set(nameA.split(' ').filter(w => w.length > 2));
    const wordsB = new Set(nameB.split(' ').filter(w => w.length > 2));
    if (wordsA.size > 0 && wordsB.size > 0) {
      let intersection = 0;
      for (const w of wordsA) {
        if (wordsB.has(w)) intersection++;
      }
      const ratio = intersection / Math.max(wordsA.size, wordsB.size);
      score += ratio * 0.45;
    }
  }

  // City match
  if (extracted.city && candidate.city) {
    const cityA = normalizeForMatch(extracted.city);
    const cityB = normalizeForMatch(candidate.city);
    if (cityA === cityB || cityA.includes(cityB) || cityB.includes(cityA)) {
      score += 0.20;
    }
  }

  // Country match
  if (extracted.country && candidate.countryCode) {
    const countryA = normalizeForMatch(extracted.country);
    const countryB = normalizeForMatch(candidate.countryCode);
    if (countryA === countryB || countryA.slice(0, 2) === countryB.slice(0, 2)) {
      score += 0.10;
    }
  }

  return Math.min(1.0, Math.round(score * 100) / 100);
}

/**
 * ─── Task 7: Nuitée Hotel Matching ─────────────────────────────────────
 */
export async function matchHotelWithNuitee(extractedBooking) {
  if (!extractedBooking || !extractedBooking.hotelName) {
    return { hotel: null, matchScore: 0, status: 'NEEDS_REVIEW' };
  }

  const hotelKey = normalizeForMatch(`${extractedBooking.hotelName}_${extractedBooking.city || ''}_${extractedBooking.country || ''}`);

  // 1. Permanent Cache Lookup
  try {
    const existingMapping = await db.getHotelMappingByKey(hotelKey);
    if (existingMapping && existingMapping.status === 'VERIFIED') {
      return {
        hotel: existingMapping.hotelData,
        matchScore: existingMapping.matchScore,
        matchSource: 'nuitee_cached',
        status: 'VERIFIED',
      };
    }
  } catch (err) {
    console.warn('[Enrichment] Cache lookup warning:', err.message);
  }

  if (!nuiteeConfigured()) {
    return { hotel: null, matchScore: 0, status: 'NEEDS_REVIEW' };
  }

  try {
    const city = extractedBooking.city || extractedBooking.destination || undefined;
    const candidates = await getHotels({
      cityName: city,
      countryCode: extractedBooking.country ? String(extractedBooking.country).substring(0, 2).toUpperCase() : undefined,
      limit: 50,
    });

    let bestMatch = null;
    let maxScore = 0;

    for (const cand of (Array.isArray(candidates) ? candidates : [])) {
      if (!cand) continue;
      const score = calculateMatchScore(extractedBooking, cand);
      if (score > maxScore) {
        maxScore = score;
        bestMatch = cand;
      }
    }

    if (bestMatch && maxScore >= 0.80) {
      const enrichedHotel = {
        nuiteeHotelId: bestMatch.id,
        googlePlaceId: null,
        name: bestMatch.name,
        address: bestMatch.address || null,
        city: bestMatch.city || extractedBooking.city || null,
        country: bestMatch.countryCode || extractedBooking.country || null,
        // Use != null so a valid 0° coordinate (equator/prime meridian) isn't dropped.
        coords: bestMatch.lat != null && bestMatch.lng != null ? { lat: bestMatch.lat, lng: bestMatch.lng } : null,
        star: bestMatch.stars || null,
        amenities: [],
        images: [],
        phone: null,
        website: null,
        matchScore: maxScore,
        matchSource: 'nuitee',
        verifiedAt: new Date().toISOString(),
        enrichmentStatus: 'VERIFIED',
      };

      // Save confirmed mapping permanently
      await db.upsertHotelMapping({
        normalizedHotelKey: hotelKey,
        nuiteeHotelId: bestMatch.id,
        source: 'nuitee',
        matchScore: maxScore,
        status: 'VERIFIED',
        hotelData: enrichedHotel,
      }).catch(() => {});

      return { hotel: enrichedHotel, matchScore: maxScore, status: 'VERIFIED' };
    } else {
      return {
        hotel: null,
        matchScore: maxScore,
        status: 'NEEDS_REVIEW',
        candidate: bestMatch ? { name: bestMatch.name, score: maxScore } : null,
      };
    }
  } catch (err) {
    console.warn('[Enrichment] Nuitée matching warning:', err.message);
    return { hotel: null, matchScore: 0, status: 'NEEDS_REVIEW' };
  }
}

/**
 * ─── Task 8: Controlled Google Places Fallback ─────────────────────────
 */
export async function matchHotelWithGooglePlaces(extractedBooking) {
  const enabled = process.env.GOOGLE_PLACES_ENABLED === 'true';
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!enabled || !apiKey) {
    return { hotel: null, matchScore: 0, status: 'DISABLED' };
  }
  if (!extractedBooking || !extractedBooking.hotelName) {
    return { hotel: null, matchScore: 0, status: 'NO_MATCH' };
  }

  // Guard against a garbage env value (parseInt('abc') → NaN, which would make
  // the cap check behave unpredictably).
  const dailyCap = Number.parseInt(process.env.GOOGLE_PLACES_DAILY_CALL_CAP, 10) || 10;
  const monthlyCap = Number.parseInt(process.env.GOOGLE_PLACES_MONTHLY_CALL_CAP, 10) || 100;

  // Check atomic caps server-side in DB
  const underCap = await db.checkAndConsumeProviderCap('google_places', 'find_place', dailyCap, monthlyCap);
  if (!underCap) {
    console.warn('[Enrichment] Google Places daily/monthly cap reached — skipping fallback');
    return { hotel: null, matchScore: 0, status: 'CAP_EXCEEDED' };
  }

  const query = `${extractedBooking.hotelName} ${extractedBooking.city || ''} ${extractedBooking.country || ''}`.trim();

  try {
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name,formatted_address,geometry,rating,photos&key=${apiKey}`;
    // Abort a slow/hung Google request so it can't stall import processing.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let res;
    try {
      res = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return { hotel: null, matchScore: 0, status: 'FAILED' };

    const json = await res.json().catch(() => ({}));
    const candidate = Array.isArray(json.candidates) ? json.candidates[0] : undefined;

    if (!candidate) {
      return { hotel: null, matchScore: 0, status: 'NO_MATCH' };
    }

    const enrichedHotel = {
      nuiteeHotelId: null,
      googlePlaceId: candidate.place_id,
      name: candidate.name,
      address: candidate.formatted_address || null,
      city: extractedBooking.city || null,
      country: extractedBooking.country || null,
      coords: candidate.geometry?.location ? { lat: candidate.geometry.location.lat, lng: candidate.geometry.location.lng } : null,
      star: candidate.rating || null,
      amenities: [],
      images: Array.isArray(candidate.photos)
        ? candidate.photos.filter(p => p?.photo_reference).map(p => `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${p.photo_reference}&key=${apiKey}`)
        : [],
      matchScore: 0.85,
      matchSource: 'google_places',
      verifiedAt: new Date().toISOString(),
      enrichmentStatus: 'VERIFIED',
    };

    return { hotel: enrichedHotel, matchScore: 0.85, status: 'VERIFIED' };
  } catch (err) {
    console.warn('[Enrichment] Google Places error:', err.message);
    return { hotel: null, matchScore: 0, status: 'FAILED' };
  }
}

/**
 * Complete hotel enrichment pipeline (Nuitée first, Google fallback if needed).
 */
export async function enrichHotelData(extractedBooking) {
  // Step 1: Nuitée primary lookup
  const nuiteeResult = await matchHotelWithNuitee(extractedBooking);
  if (nuiteeResult.status === 'VERIFIED') {
    return nuiteeResult;
  }

  // Step 2: Google Places fallback if Nuitée had no acceptable match
  const googleResult = await matchHotelWithGooglePlaces(extractedBooking);
  if (googleResult.status === 'VERIFIED') {
    return googleResult;
  }

  return {
    hotel: null,
    matchScore: nuiteeResult.matchScore || 0,
    status: 'NEEDS_REVIEW',
  };
}
