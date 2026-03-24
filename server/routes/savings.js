import { Router } from 'express';
import * as db from '../db.js';

export default function savingsRoutes(authMiddleware) {
  const router = Router();

  // ─── Get alerts for a booking ─────────────────────────────
  router.get('/bookings/:id/alerts', authMiddleware, async (req, res) => {
    try {
      // Security: Verify ownership before returning alerts
      const booking = await db.getBooking(req.params.id);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      if (booking.email !== req.userEmail) return res.status(403).json({ error: 'Access denied' });

      const alerts = await db.getAlertsByBooking(req.params.id);
      res.json(alerts);
    } catch (err) {
      console.error('[Savings] Get alerts error:', err.message);
      res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  });

  // ─── Confirm savings ─────────────────────────────────────
  router.post('/bookings/:id/confirm-savings', authMiddleware, async (req, res) => {
    try {
      const booking = await db.getBooking(req.params.id);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      if (booking.email !== req.userEmail) {
        return res.status(403).json({ error: 'Not your booking' });
      }

      const {
        confirmationType, // 'rebooked' | 'hotel_matched' | 'agent_handled' | 'not_completed'
        finalPaidAmount,
        notes,
        externalConfirmationNumber,
      } = req.body;

      if (!confirmationType) {
        return res.status(400).json({ error: 'confirmationType is required' });
      }

      const potentialSavings = booking.potentialSavings || booking.totalSavings || 0;

      // Calculate confirmed savings based on type
      let confirmedSavings = 0;
      if (confirmationType === 'not_completed') {
        confirmedSavings = 0;
      } else if (finalPaidAmount != null) {
        confirmedSavings = Math.max(0, booking.originalPrice - finalPaidAmount);
      } else {
        confirmedSavings = potentialSavings;
      }

      // Create confirmation record
      const confirmation = await db.createSavingsConfirmation({
        bookingId: booking.id,
        userEmail: req.userEmail,
        confirmationType,
        potentialSavings,
        confirmedSavings,
        finalPaidAmount: finalPaidAmount || null,
        externalConfirmationNumber: externalConfirmationNumber || null,
        notes: notes || null,
      });

      // Update booking status
      const newStatus = confirmationType === 'not_completed' ? 'dismissed' : 'confirmed_savings';
      await db.updateBooking(booking.id, {
        status: newStatus,
        totalSavings: confirmedSavings,
      });

      // Update user's confirmed savings total
      await db.updateUserConfirmedSavings(req.userEmail);

      // Log activity
      await db.logActivity({
        entityType: 'booking',
        entityId: booking.id,
        action: newStatus === 'confirmed_savings' ? 'savings_confirmed' : 'savings_dismissed',
        actorEmail: req.userEmail,
        details: { confirmationType, confirmedSavings, potentialSavings },
      });

      res.json({
        status: 'ok',
        confirmation,
        bookingStatus: newStatus,
        confirmedSavings,
      });
    } catch (err) {
      console.error('[Savings] Confirm error:', err.message);
      res.status(500).json({ error: 'Failed to confirm savings' });
    }
  });

  // ─── Dismiss savings ──────────────────────────────────────
  router.post('/bookings/:id/dismiss-savings', authMiddleware, async (req, res) => {
    try {
      const booking = await db.getBooking(req.params.id);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      if (booking.email !== req.userEmail) {
        return res.status(403).json({ error: 'Not your booking' });
      }

      const { notes } = req.body;
      const potentialSavings = booking.potentialSavings || booking.totalSavings || 0;

      await db.createSavingsConfirmation({
        bookingId: booking.id,
        userEmail: req.userEmail,
        confirmationType: 'not_completed',
        potentialSavings,
        confirmedSavings: 0,
        notes: notes || 'User dismissed savings',
      });

      await db.updateBooking(booking.id, {
        status: 'dismissed',
        totalSavings: 0,
      });

      await db.logActivity({
        entityType: 'booking',
        entityId: booking.id,
        action: 'savings_dismissed',
        actorEmail: req.userEmail,
        details: { potentialSavings, reason: notes || 'User dismissed' },
      });

      res.json({ status: 'ok', bookingStatus: 'dismissed' });
    } catch (err) {
      console.error('[Savings] Dismiss error:', err.message);
      res.status(500).json({ error: 'Failed to dismiss savings' });
    }
  });

  // ─── Get activity log for a booking ───────────────────────
  router.get('/bookings/:id/activity', authMiddleware, async (req, res) => {
    try {
      // Security: Verify ownership before returning activity log
      const booking = await db.getBooking(req.params.id);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      if (booking.email !== req.userEmail) return res.status(403).json({ error: 'Access denied' });

      const log = await db.getActivityLog('booking', req.params.id);
      res.json(log);
    } catch (err) {
      console.error('[Savings] Activity log error:', err.message);
      res.status(500).json({ error: 'Failed to fetch activity log' });
    }
  });

  // ─── Get confirmation for a booking ───────────────────────
  router.get('/bookings/:id/confirmation', authMiddleware, async (req, res) => {
    try {
      // Security: Verify ownership before returning confirmation
      const booking = await db.getBooking(req.params.id);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      if (booking.email !== req.userEmail) return res.status(403).json({ error: 'Access denied' });

      const confirmation = await db.getConfirmationByBooking(req.params.id);
      res.json(confirmation || null);
    } catch (err) {
      console.error('[Savings] Get confirmation error:', err.message);
      res.status(500).json({ error: 'Failed to fetch confirmation' });
    }
  });

  return router;
}
