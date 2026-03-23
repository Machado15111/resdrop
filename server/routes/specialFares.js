import { Router } from 'express';
import * as db from '../db.js';

export default function specialFaresRoutes(authMiddleware, adminMiddleware) {
  const router = Router();

  // All routes require admin
  router.use(authMiddleware, adminMiddleware);

  // ─── List all special fare cases ──────────────────────────
  router.get('/special-fares', async (req, res) => {
    try {
      const { status, priority, limit = 50, offset = 0 } = req.query;
      const filters = {};
      if (status) filters.status = status;
      if (priority) filters.priority = priority;
      const cases = await db.getAllSpecialFares(filters, parseInt(limit), parseInt(offset));
      res.json(cases);
    } catch (err) {
      console.error('[SpecialFares] List error:', err.message);
      res.status(500).json({ error: 'Failed to fetch special fares' });
    }
  });

  // ─── Get single case ──────────────────────────────────────
  router.get('/special-fares/:id', async (req, res) => {
    try {
      const sfCase = await db.getSpecialFare(req.params.id);
      if (!sfCase) return res.status(404).json({ error: 'Not found' });
      res.json(sfCase);
    } catch (err) {
      console.error('[SpecialFares] Get error:', err.message);
      res.status(500).json({ error: 'Failed to fetch case' });
    }
  });

  // ─── Create new case ─────────────────────────────────────
  router.post('/special-fares', async (req, res) => {
    try {
      const {
        clientEmail, clientName, clientPhone,
        bookingId, hotelName, destination,
        checkinDate, checkoutDate, roomType,
        occupancy, boardBasis,
        originalPrice, offeredPrice, currency,
        rateType, refundable, cancellationDeadline,
        originalSource, foundSource, supplier,
        assignedAgent, priority, internalNotes,
      } = req.body;

      if (!hotelName) {
        return res.status(400).json({ error: 'hotelName is required' });
      }

      const savingsAmount = originalPrice && offeredPrice
        ? Math.max(0, originalPrice - offeredPrice)
        : null;

      const created = await db.createSpecialFare({
        clientEmail, clientName, clientPhone,
        bookingId, hotelName, destination,
        checkinDate, checkoutDate, roomType,
        occupancy, boardBasis,
        originalPrice, offeredPrice, savingsAmount, currency,
        rateType, refundable, cancellationDeadline,
        originalSource, foundSource, supplier,
        assignedAgent: assignedAgent || req.userEmail,
        priority: priority || 'normal',
        internalNotes,
        status: 'new',
      });

      await db.logActivity({
        entityType: 'special_fare',
        entityId: created.id,
        action: 'created',
        actorEmail: req.userEmail,
        details: { hotelName, clientEmail },
      });

      res.status(201).json(created);
    } catch (err) {
      console.error('[SpecialFares] Create error:', err.message);
      res.status(500).json({ error: 'Failed to create case' });
    }
  });

  // ─── Update case ──────────────────────────────────────────
  router.put('/special-fares/:id', async (req, res) => {
    try {
      const existing = await db.getSpecialFare(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Not found' });

      const updates = { ...req.body, updatedAt: new Date().toISOString() };

      // Auto-calculate savings if prices change
      if (updates.originalPrice && updates.offeredPrice) {
        updates.savingsAmount = Math.max(0, updates.originalPrice - updates.offeredPrice);
      }

      // Set timestamps on status transitions
      if (updates.status === 'offered' && !existing.offeredAt) {
        updates.offeredAt = new Date().toISOString();
      }
      if (updates.status === 'accepted' && !existing.acceptedAt) {
        updates.acceptedAt = new Date().toISOString();
      }
      if (updates.status === 'confirmed' && !existing.confirmedAt) {
        updates.confirmedAt = new Date().toISOString();
      }
      if (updates.status === 'cancelled' && !existing.cancelledAt) {
        updates.cancelledAt = new Date().toISOString();
      }

      const updated = await db.updateSpecialFare(req.params.id, updates);

      await db.logActivity({
        entityType: 'special_fare',
        entityId: req.params.id,
        action: updates.status ? `status_changed_to_${updates.status}` : 'updated',
        actorEmail: req.userEmail,
        details: updates,
      });

      res.json(updated);
    } catch (err) {
      console.error('[SpecialFares] Update error:', err.message);
      res.status(500).json({ error: 'Failed to update case' });
    }
  });

  // ─── Analytics ────────────────────────────────────────────
  router.get('/special-fares-analytics', async (req, res) => {
    try {
      const all = await db.getAllSpecialFares({}, 1000, 0);
      const totalCases = all.length;
      const confirmed = all.filter(c => c.status === 'confirmed');
      const totalSavings = confirmed.reduce((sum, c) => sum + (parseFloat(c.realizedSavings) || parseFloat(c.savingsAmount) || 0), 0);
      const avgSavings = confirmed.length > 0 ? totalSavings / confirmed.length : 0;
      const byStatus = {};
      all.forEach(c => { byStatus[c.status] = (byStatus[c.status] || 0) + 1; });

      res.json({
        totalCases,
        confirmedCases: confirmed.length,
        totalSavings: Math.round(totalSavings * 100) / 100,
        avgSavings: Math.round(avgSavings * 100) / 100,
        byStatus,
      });
    } catch (err) {
      console.error('[SpecialFares] Analytics error:', err.message);
      res.status(500).json({ error: 'Failed to compute analytics' });
    }
  });

  return router;
}
