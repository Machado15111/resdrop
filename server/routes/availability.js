import { Router } from 'express';
import * as db from '../db.js';
import { validateWatch, watchConfig, cadenceHoursFor, TERMINAL_STATUSES } from '../availability.js';
import { checkWatch } from '../availabilityRunner.js';
import { watchLimitFor } from '../planAuthz.js';

/**
 * Availability watches — "tell me when a room opens up".
 *
 * Every route is scoped to req.userEmail. A watch has no shareable identifier
 * and no public view, so ownership is checked on every read as well as every
 * write, the same way bookings are handled.
 */
export default function availabilityRoutes({ authMiddleware, bookingRateLimit, costlyApiRateLimit, searchPrices }) {
  const router = Router();

  const publicShape = (w) => ({
    id: w.id,
    hotelName: w.hotelName,
    destination: w.destination || null,
    checkinDate: w.checkinDate,
    checkoutDate: w.checkoutDate,
    guests: w.guests ?? 2,
    currency: w.currency || 'USD',
    note: w.note || null,
    status: w.status,
    lastChecked: w.lastChecked || null,
    checkCount: w.checkCount || 0,
    needsReview: Boolean(w.needsReview),
    foundAt: w.foundAt || null,
    foundPrice: w.foundPrice ?? null,
    foundCurrency: w.foundCurrency || null,
    foundSource: w.foundSource || null,
    foundRoomType: w.foundRoomType || null,
    foundLink: w.foundLink || null,
    createdAt: w.createdAt || null,
    // So the UI can say "next check in ~2h" instead of leaving the user
    // wondering whether anything is happening at all.
    cadenceHours: cadenceHoursFor(w, watchConfig()),
  });

  // ─── List ─────────────────────────────────────────────────
  router.get('/availability-watches', authMiddleware, async (req, res) => {
    const watches = await db.getAvailabilityWatchesByEmail(req.userEmail);
    const plan = req.user?.plan || 'free';
    const limit = watchLimitFor(plan);
    const active = watches.filter(w => !TERMINAL_STATUSES.includes(w.status)).length;
    res.json({
      watches: watches.map(publicShape),
      limit,
      active,
      canCreate: active < limit,
    });
  });

  // ─── Create ───────────────────────────────────────────────
  router.post('/availability-watches', authMiddleware, bookingRateLimit, async (req, res) => {
    const { hotelName, destination, checkinDate, checkoutDate, guests, currency, note } = req.body || {};

    const validation = validateWatch({ hotelName, checkinDate, checkoutDate, guests });
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', errors: validation.errors });
    }

    // Duplicate first: it is the more specific answer, and telling a user on
    // the free plan "you have reached your limit" when the thing they are
    // adding is the watch they already have would be actively confusing.
    const existing = await db.getAvailabilityWatchesByEmail(req.userEmail);
    const plan = req.user?.plan || 'free';
    const limit = watchLimitFor(plan);
    const active = existing.filter(w => !TERMINAL_STATUSES.includes(w.status));
    // Two watches for the same hotel and dates would double the API spend and
    // send two identical emails.
    const duplicate = active.find(w =>
      (w.hotelName || '').trim().toLowerCase() === hotelName.trim().toLowerCase()
      && String(w.checkinDate).slice(0, 10) === String(checkinDate).slice(0, 10)
      && String(w.checkoutDate).slice(0, 10) === String(checkoutDate).slice(0, 10));
    if (duplicate) {
      return res.status(409).json({
        error: 'duplicate_watch',
        message: 'You are already watching this hotel for these dates.',
        existingWatchId: duplicate.id,
      });
    }

    // An active watch costs a rate search every 1-2 hours for as long as it
    // lives, so the ceiling is per plan rather than per month.
    if (active.length >= limit) {
      return res.status(403).json({
        error: 'watch_limit',
        message: `Your ${plan} plan allows ${limit} active availability watch${limit === 1 ? '' : 'es'}.`,
        limit,
        active: active.length,
      });
    }

    const created = await db.createAvailabilityWatch({
      email: req.userEmail,
      hotelName: hotelName.trim(),
      destination: (destination || '').trim() || null,
      checkinDate,
      checkoutDate,
      guests: validation.guests,
      currency: (currency || req.user?.currency || 'USD').toUpperCase(),
      note: (note || '').trim() || null,
    });

    if (!created) {
      return res.status(500).json({ error: 'Failed to create watch — database error. Check server logs.' });
    }

    db.logActivity({
      entityType: 'availability_watch',
      entityId: created.id,
      action: 'created',
      actorEmail: req.userEmail,
      details: { hotelName: created.hotelName, checkinDate: created.checkinDate },
    }).catch(() => {});

    res.status(201).json(publicShape(created));
  });

  // ─── Cancel ───────────────────────────────────────────────
  router.delete('/availability-watches/:id', authMiddleware, async (req, res) => {
    const watch = await db.getAvailabilityWatch(req.params.id);
    if (!watch) return res.status(404).json({ error: 'Watch not found' });
    if (watch.email !== req.userEmail) return res.status(403).json({ error: 'Access denied' });

    // Kept rather than deleted: the row is the record of what we watched and
    // what we told the traveller, and a cancelled watch costs nothing because
    // the scheduler only loads active ones.
    const updated = await db.updateAvailabilityWatch(req.params.id, { status: 'cancelled' });
    db.logActivity({
      entityType: 'availability_watch',
      entityId: req.params.id,
      action: 'cancelled',
      actorEmail: req.userEmail,
      details: { hotelName: watch.hotelName },
    }).catch(() => {});

    res.json(publicShape(updated || { ...watch, status: 'cancelled' }));
  });

  // ─── Check now ────────────────────────────────────────────
  //
  // Rate-limited with the costly-API limiter: this is a real paid search, and
  // it deliberately ignores the watch's cadence because the user asked.
  router.post('/availability-watches/:id/check', authMiddleware, costlyApiRateLimit, async (req, res) => {
    const watch = await db.getAvailabilityWatch(req.params.id);
    if (!watch) return res.status(404).json({ error: 'Watch not found' });
    if (watch.email !== req.userEmail) return res.status(403).json({ error: 'Access denied' });
    if (TERMINAL_STATUSES.includes(watch.status)) {
      return res.status(409).json({ error: 'watch_inactive', status: watch.status });
    }

    try {
      const outcome = await checkWatch(watch, { searchPrices });
      res.json({ ...publicShape(outcome.watch), transition: outcome.transition, offerCount: outcome.offerCount });
    } catch (err) {
      console.error(`[Availability] manual check failed for ${req.params.id}: ${err.message}`);
      res.status(500).json({ error: 'Check failed', message: err.message });
    }
  });

  return router;
}
