/**
 * Nuitée / Price Trends HTTP routes. Mounted from index.js:
 *   import { registerNuiteeRoutes } from './nuiteeRoutes.js';
 *   registerNuiteeRoutes(app, { authMiddleware, adminMiddleware });
 *
 * All provider calls happen server-side; the API key never leaves the server.
 */
import { supabase as sql } from './db.js';
import { defaultService, monthKey, readConfig, effectiveCap, PER_USER_MONTHLY_CAP } from './priceIndex.js';
import { nuiteeEnv, nuiteeConfigured, circuitState, getHotelDetails, getCities, getCountries, getHotels, searchRates } from './liteApi.js';

let _svc;
function service() { return (_svc ||= defaultService()); }

// Friendly, translated messages returned to the client per status.
const MESSAGES = {
  disabled:     { pt: 'Tendência de preços indisponível no momento.', en: 'Price Trends is currently unavailable.' },
  locked:       { pt: 'Tendência de preços é um recurso dos planos pagos.', en: 'Price Trends is a paid-plan feature.' },
  user_quota:   { pt: 'Você atingiu seu limite mensal de Tendência de preços.', en: 'You have reached your monthly Price Trends limit.' },
  global_quota: { pt: 'Tendência de preços volta a ficar disponível no próximo ciclo mensal.', en: 'Price Trends will be available again next monthly cycle.' },
  error:        { pt: 'Não foi possível carregar a tendência de preços agora.', en: 'Could not load price trends right now.' },
};
const DISCLAIMER = {
  pt: 'As tendências representam dados agregados de mercado e podem não corresponder a uma tarifa disponível para reserva.',
  en: 'Price trends represent aggregated market data and may not match a currently bookable rate.',
};

export function registerNuiteeRoutes(app, { authMiddleware, adminMiddleware }) {
  // NOTE: every route below reaches the upstream Nuitée/LiteAPI on each call, so
  // they are authenticated. Leaving them public would let anyone drain the
  // provider quota (and the paid cost cap) with a loop of anonymous requests.
  // Catalog browsing (hotels/cities/countries) is admin-only — it is an internal
  // data-exploration tool, not a customer feature.

  // ── Nuitée status (diagnostics: exposes circuit-breaker internals) ──
  app.get('/api/nuitee/status', authMiddleware, adminMiddleware, (req, res) => {
    res.json({
      environment: nuiteeEnv(),
      configured: nuiteeConfigured(),
      circuit: circuitState(),
    });
  });

  // ── Hotel Essential Details (Nuitée / LiteAPI /data/hotel) ──
  app.get('/api/nuitee/hotel/:hotelId', authMiddleware, async (req, res) => {
    const { hotelId } = req.params;
    if (!hotelId) return res.status(400).json({ error: 'hotelId parameter is required' });
    try {
      const data = await getHotelDetails(hotelId);
      res.json({ success: true, data });
    } catch (e) {
      console.error(`[nuitee] Error fetching hotel details for ${hotelId}:`, e.message);
      res.status(e.status || 500).json({ error: e.message || 'Failed to fetch hotel details' });
    }
  });

  // ── Live Rates Search (Nuitée / LiteAPI /hotels/rates) ──
  app.post('/api/nuitee/rates', authMiddleware, async (req, res) => {
    const { hotelIds, checkin, checkout, occupancies, guestNationality, currency, maxRatesPerHotel } = req.body || {};
    if ((!Array.isArray(hotelIds) || !hotelIds.length) && !req.body?.hotelId) {
      return res.status(400).json({ error: 'hotelIds array (or hotelId) is required' });
    }
    const ids = hotelIds || [req.body.hotelId];
    if (!checkin || !checkout) {
      return res.status(400).json({ error: 'checkin and checkout dates are required' });
    }
    try {
      const data = await searchRates({
        hotelIds: ids,
        checkin,
        checkout,
        occupancies: occupancies || [{ adults: 2 }],
        guestNationality: guestNationality || 'US',
        currency: currency || 'USD',
        maxRatesPerHotel: maxRatesPerHotel || 5,
      });
      res.json({ success: true, data });
    } catch (e) {
      console.error('[nuitee] Error searching rates:', e.message);
      res.status(e.status || 500).json({ error: e.message || 'Failed to search hotel rates' });
    }
  });

  // ── Hotel Catalog Search (Nuitée / LiteAPI /data/hotels) ──
  app.get('/api/nuitee/hotels', authMiddleware, adminMiddleware, async (req, res) => {
    const { countryCode, cityName, limit, offset } = req.query;
    try {
      const hotelsList = await getHotels({
        countryCode,
        cityName,
        limit: limit ? parseInt(limit, 10) : 100,
        offset: offset ? parseInt(offset, 10) : 0,
      });
      res.json({ success: true, count: hotelsList.length, hotels: hotelsList });
    } catch (e) {
      console.error('[nuitee] Error fetching hotels:', e.message);
      res.status(e.status || 500).json({ error: e.message || 'Failed to fetch hotels' });
    }
  });

  // ── Cities List ──
  app.get('/api/nuitee/cities', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const cities = await getCities(req.query.countryCode);
      res.json({ success: true, cities });
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message || 'Failed to fetch cities' });
    }
  });

  // ── Countries List ──
  app.get('/api/nuitee/countries', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const countries = await getCountries();
      res.json({ success: true, countries });
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message || 'Failed to fetch countries' });
    }
  });
  // ── Paid "Price Trends" — entitlement + quota + cost cap enforced server-side ──
  app.post('/api/price-trends', authMiddleware, async (req, res) => {
    const { hotelIds, checkin, checkout, currency } = req.body || {};
    if (!Array.isArray(hotelIds) || !hotelIds.length || !checkin || !checkout) {
      return res.status(400).json({ error: 'hotelIds, checkin and checkout are required' });
    }
    try {
      const svc = await service();
      const r = await svc.getPriceTrends({ user: req.user, hotelIds, checkin, checkout, currency });
      if (r.status === 'ok' || r.status === 'cached') {
        return res.json({ status: r.status, data: r.data, disclaimer: DISCLAIMER, userViews: r.userViews, cap: PER_USER_MONTHLY_CAP });
      }
      const http = r.status === 'locked' ? 403 : r.status === 'disabled' ? 503 : 429;
      return res.status(http).json({ status: r.status, message: MESSAGES[r.status] || MESSAGES.error });
    } catch (e) {
      console.error('[price-trends]', e.message); // sanitized by the client
      return res.status(502).json({ status: 'error', message: MESSAGES.error });
    }
  });

  // ── Admin: Nuitée status, cost visibility and controls ──
  app.get('/api/admin/nuitee', authMiddleware, adminMiddleware, async (req, res) => {
    const month = monthKey();
    const cfg = readConfig();
    try {
      const [usage] = await sql`SELECT external_calls, estimated_cost_usd FROM nuitee_price_index_usage WHERE calendar_month = ${month}`;
      const [rate] = await sql`SELECT rate_searches, cache_hits FROM nuitee_rate_search_usage WHERE calendar_month = ${month}`;
      const [settings] = await sql`SELECT monitoring_enabled, price_index_enabled, price_index_cap FROM nuitee_settings WHERE id = 1`;
      const mapping = await sql`SELECT mapping_status, count(*)::int AS n FROM nuitee_hotel_mapping GROUP BY mapping_status`;
      const cap = effectiveCap(cfg.envCap, settings?.price_index_cap ?? null);
      const external = usage?.external_calls || 0;
      const searches = rate?.rate_searches || 0;
      const hits = rate?.cache_hits || 0;
      res.json({
        environment: nuiteeEnv(),
        configured: nuiteeConfigured(),
        priceIndexEnabledEnv: cfg.enabled,
        priceIndexEnabledEffective: cfg.enabled && settings?.price_index_enabled !== false,
        monitoringEnabled: settings?.monitoring_enabled !== false,
        globalCapEnv: cfg.envCap,
        globalCapEffective: cap,
        priceIndexExternalCalls: external,
        priceIndexRemaining: Math.max(0, cap - external),
        estimatedCostUsd: Number(usage?.estimated_cost_usd || 0),
        maxMonthlyCostUsd: +(cap * cfg.costUsd).toFixed(2),
        rateSearches: searches,
        cacheHitPct: searches + hits > 0 ? Math.round((hits / (searches + hits)) * 100) : 0,
        mappingByStatus: Object.fromEntries(mapping.map(m => [m.mapping_status, m.n])),
        circuit: circuitState(),
        month,
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed to load Nuitée status', detail: e.message });
    }
  });

  // ── Admin: run/retry a hotel mapping for a reservation ──
  app.post('/api/admin/nuitee/map/:reservationId', authMiddleware, adminMiddleware, async (req, res) => {
    const { hotelName, city, countryCode } = req.body || {};
    if (!hotelName) return res.status(400).json({ error: 'hotelName required' });
    try {
      const { mapReservation } = await import('./hotelMapping.js');
      const result = await mapReservation({ reservationId: req.params.reservationId, hotelName, city, countryCode });
      res.json(result);
    } catch (e) { res.status(500).json({ error: 'Mapping failed', detail: e.message }); }
  });

  // ── Admin: approve an uncertain mapping ──
  app.post('/api/admin/nuitee/mapping/:reservationId/approve', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      await sql`UPDATE nuitee_hotel_mapping SET mapping_status = 'approved', reviewed = true, mapped_at = now() WHERE reservation_id = ${req.params.reservationId}`;
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: 'Approve failed', detail: e.message }); }
  });

  app.post('/api/admin/nuitee/settings', authMiddleware, adminMiddleware, async (req, res) => {
    const cfg = readConfig();
    const { monitoringEnabled, priceIndexEnabled, priceIndexCap } = req.body || {};
    // Admin may only lower the cap — clamp to the env limit.
    const cap = priceIndexCap == null ? null : Math.min(cfg.envCap, Math.max(0, parseInt(priceIndexCap, 10) || 0));
    try {
      await sql`
        UPDATE nuitee_settings SET
          monitoring_enabled  = COALESCE(${monitoringEnabled ?? null}, monitoring_enabled),
          price_index_enabled = COALESCE(${priceIndexEnabled ?? null}, price_index_enabled),
          price_index_cap     = ${cap},
          updated_at = now()
        WHERE id = 1
      `;
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to update settings', detail: e.message });
    }
  });
}
