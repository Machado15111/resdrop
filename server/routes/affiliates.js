import { Router } from 'express';
import * as db from '../db.js';
import {
  isAwinConfigured,
  getBookingPromotions,
  parsePromotions,
  buildBookingSearchLink,
  getJoinedProgrammes,
  getTransactions,
  matchTransactionsToBookings,
} from '../awinApi.js';
import {
  isExpediaConfigured,
  buildExpediaSearchLink,
  calculateExpediaCommission,
  getExpediaCommissionRates,
  getExpediaProgrammeInfo,
} from '../expediaApi.js';

/**
 * Awin (Booking.com) and Expedia affiliate routes.
 *
 * Extracted from index.js verbatim — same paths, same middleware chains, same
 * bodies. scripts/route-table.js output is unchanged by this move.
 *
 * Status and transactions are admin-only (they expose the publisher account and
 * its earnings); the link builders and promotions are public because the
 * logged-out marketing pages use them.
 */
export default function affiliateRoutes(authMiddleware, adminMiddleware, publicRateLimit) {
  const router = Router();

  // ─── AWIN ROUTES ─────────────────────────────────────────────

  router.get('/awin/status', authMiddleware, adminMiddleware, async (req, res) => {
    if (!isAwinConfigured()) {
      return res.json({ connected: false, error: 'Awin not configured' });
    }
    try {
      const programmes = await getJoinedProgrammes();
      const bookingProgramme = Array.isArray(programmes)
        ? programmes.find(p =>
            (p.name || '').toLowerCase().includes('booking') ||
            String(p.id) === process.env.BOOKING_AWIN_ADVERTISER_ID_APAC ||
            String(p.id) === process.env.BOOKING_AWIN_ADVERTISER_ID_NA
          )
        : null;
      res.json({
        connected: true,
        publisherId: process.env.AWIN_AFFILIATE_ID,
        totalProgrammes: Array.isArray(programmes) ? programmes.length : 0,
        bookingComJoined: !!bookingProgramme,
        bookingProgramme: bookingProgramme || null,
      });
    } catch (err) {
      res.json({ connected: false, error: err.message });
    }
  });

  router.get('/awin/promotions', publicRateLimit, async (req, res) => {
    if (!isAwinConfigured()) {
      return res.status(400).json({ error: 'Awin not configured' });
    }
    try {
      const raw = await getBookingPromotions({ region: req.query.region || 'brazil' });
      const deals = parsePromotions(raw);
      res.json({ deals, raw, count: deals.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/awin/link', publicRateLimit, (req, res) => {
    const { destination, checkinDate, checkoutDate, adults, rooms } = req.body;
    if (!isAwinConfigured()) {
      return res.status(400).json({ error: 'Awin not configured' });
    }
    const link = buildBookingSearchLink({
      destination,
      checkinDate,
      checkoutDate,
      adults: adults || 2,
      rooms: rooms || 1,
      clickRef: `repricehq_${Date.now()}`,
    });
    res.json({ affiliateLink: link });
  });

  router.get('/awin/transactions', authMiddleware, adminMiddleware, async (req, res) => {
    if (!isAwinConfigured()) {
      return res.status(400).json({ error: 'Awin not configured' });
    }
    try {
      const [txns, bookings] = await Promise.all([
        getTransactions({ startDate: req.query.start, endDate: req.query.end }),
        db.getAllBookings({ columns: 'id,email,hotel_name' }),
      ]);
      const transactions = matchTransactionsToBookings(txns, bookings);
      const matched = transactions.filter(t => t.matchedBookingId).length;
      res.json({
        transactions,
        count: transactions.length,
        matched,
        unmatched: transactions.length - matched,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── EXPEDIA ROUTES ──────────────────────────────────────────

  router.get('/expedia/status', publicRateLimit, (req, res) => {
    res.json({
      configured: isExpediaConfigured(),
      programme: getExpediaProgrammeInfo(),
      commissions: getExpediaCommissionRates(),
    });
  });

  router.post('/expedia/link', publicRateLimit, (req, res) => {
    const { destination, checkinDate, checkoutDate, adults, rooms, currency } = req.body;
    const link = buildExpediaSearchLink({
      destination,
      checkinDate,
      checkoutDate,
      adults: adults || 2,
      rooms: rooms || 1,
      currency: currency || 'BRL',
      clickRef: `repricehq_${Date.now()}`,
    });
    res.json({ affiliateLink: link });
  });

  router.post('/expedia/commission', publicRateLimit, (req, res) => {
    const { amount, type } = req.body;
    const commission = calculateExpediaCommission(amount || 0, type || 'lodging');
    res.json(commission);
  });

  return router;
}
