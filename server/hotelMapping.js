/**
 * Map a ResDrop reservation to a Nuitée hotel id using the synced
 * hotels_catalog (free data). Confidence-scored; low-confidence matches are
 * flagged for admin review rather than silently trusted — we must never
 * monitor the wrong hotel just because names look similar.
 */

const HIGH = 0.85;   // auto-accept
const LOW = 0.60;    // below this we don't map at all

export function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // strip accents
    .replace(/\b(hotel|resort|spa|inn|suites?|the|by|de|da|do)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Token Jaccard + containment bonus → 0..1 similarity. */
export function nameSimilarity(a, b) {
  const ta = new Set(normalize(a).split(' ').filter(Boolean));
  const tb = new Set(normalize(b).split(' ').filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const jaccard = inter / (ta.size + tb.size - inter);
  const na = normalize(a), nb = normalize(b);
  const contains = na.includes(nb) || nb.includes(na) ? 0.15 : 0;
  return Math.min(1, jaccard + contains);
}

/** Score a candidate against the reservation (name dominates; city confirms). */
export function scoreCandidate(reservation, candidate) {
  const name = nameSimilarity(reservation.hotelName, candidate.name);
  const cityMatch = reservation.city && candidate.city
    ? (normalize(reservation.city) === normalize(candidate.city) ? 1 : 0.5)
    : 0.75;
  return +(name * 0.8 + cityMatch * 0.2).toFixed(4);
}

/**
 * Resolve and persist a mapping for a reservation.
 * @returns {{nuitee_hotel_id, confidence, status}}
 */
export async function mapReservation({ reservationId, hotelName, city, countryCode }) {
  const { supabase: sql } = await import('./db.js');
  const cc = (countryCode || '').toUpperCase();
  const candidates = await sql`
    SELECT liteapi_id, name, city FROM hotels_catalog
    WHERE ${cc ? sql`country_code = ${cc}` : sql`true`}
    ${city ? sql`AND lower(city) = ${String(city).toLowerCase()}` : sql``}
    LIMIT 400
  `;
  let best = null, bestScore = 0;
  for (const c of candidates) {
    const s = scoreCandidate({ hotelName, city }, c);
    if (s > bestScore) { bestScore = s; best = c; }
  }

  const status = bestScore >= HIGH ? 'auto' : bestScore >= LOW ? 'review' : 'failed';
  const hotelId = status === 'failed' ? null : best?.liteapi_id ?? null;

  await sql`
    INSERT INTO nuitee_hotel_mapping (reservation_id, nuitee_hotel_id, confidence, mapping_status, mapping_method, mapped_at)
    VALUES (${reservationId}, ${hotelId}, ${bestScore}, ${status}, 'catalog_name_city', now())
    ON CONFLICT (reservation_id) DO UPDATE SET
      nuitee_hotel_id = EXCLUDED.nuitee_hotel_id,
      confidence = EXCLUDED.confidence,
      mapping_status = EXCLUDED.mapping_status,
      mapping_method = EXCLUDED.mapping_method,
      mapped_at = now()
  `;
  return { nuitee_hotel_id: hotelId, confidence: bestScore, status };
}
