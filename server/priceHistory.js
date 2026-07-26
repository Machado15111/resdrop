/**
 * Price-history helpers for booking price checks.
 *
 * Kept as small pure functions (no DB, no network) so the strict savings logic
 * in applyBestResult stays untouched and the behaviour is unit-testable in
 * isolation.
 */

/** Maximum stored price-history points per booking. */
export const MAX_PRICE_HISTORY = 60;

/**
 * Build ONE market data-point for a price check: the cheapest EXACT-hotel total
 * plus the source that quoted it. Returns null when the check produced no priced
 * exact-hotel result (so we never fabricate a point).
 *
 * This is HISTORY ONLY — it deliberately does not consider trust/room-type/
 * refundability, which gate the strict savings comparison. It exists so the
 * price chart isn't empty when a hotel is found but no comparable saving is
 * claimed.
 *
 * @param {Array} results  merged price results (from searchPrices)
 * @param {string} dateIso ISO timestamp for the point
 * @returns {{date:string, price:number, source:string, market:true}|null}
 */
export function marketDataPoint(results, dateIso) {
  const exact = (Array.isArray(results) ? results : []).filter(
    r => r && r.isExactMatch && typeof r.totalPrice === 'number' && r.totalPrice > 0
  );
  if (exact.length === 0) return null;
  const cheapest = exact.reduce((a, b) => (b.totalPrice < a.totalPrice ? b : a));
  return { date: dateIso, price: cheapest.totalPrice, source: cheapest.source, market: true };
}
