import { Router } from 'express';
import * as db from '../db.js';
import { getSchedulerStatus, getCheckHistory, manualCheck } from '../scheduler.js';
import { isAwinConfigured } from '../awinApi.js';
import { isExpediaConfigured, getExpediaCommissionRates, getExpediaProgrammeInfo } from '../expediaApi.js';

/**
 * Admin routes: dashboard, scheduler control, user and booking management,
 * activity log, and the custom-email sender.
 *
 * Extracted from index.js verbatim — same paths, same
 * (authMiddleware -> adminMiddleware) chain on every route, same handler
 * bodies.
 *
 * `searchPrices`, `applyBestResult`, `apiMode` and `serverStart` are injected
 * because they live in index.js module scope: the price engine and the process
 * start time belong to the server, not to this router.
 */
export default function adminRoutes({
  authMiddleware, adminMiddleware, searchPrices, applyBestResult, apiMode, serverStart,
}) {
  const router = Router();
  const API_MODE = apiMode;
  const SERVER_START = serverStart;

  router.get('/admin/dashboard', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const allBookings = (await db.getAllBookings()) || [];
      const allUsers = (await db.getAllUsers(200)) || [];
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Stats
      const totalSavings = allBookings.reduce((sum, b) => sum + (parseFloat(b.totalSavings) || 0), 0);
      const savingsFound = allBookings.filter(b => b.status === 'savings_found').length;
      const totalBookingValue = allBookings.reduce((sum, b) => sum + (parseFloat(b.originalPrice) || 0), 0);

      // Revenue estimates
      const avgCommissionRate = 0.04;
      const estimatedCommissions = Math.round(totalSavings * avgCommissionRate * 100) / 100;
      const rebookingsThisMonth = savingsFound;

      // User stats
      const activeToday = allUsers.filter(u => String(u.lastActive || '').startsWith(today)).length;
      const newThisWeek = allUsers.filter(u => String(u.joinedAt || '') >= weekAgo).length;
      const freeUsers = allUsers.filter(u => u.plan === 'free').length;
      const viajanteUsers = allUsers.filter(u => u.plan === 'viajante').length;
      const premiumUsers = allUsers.filter(u => u.plan === 'premium').length;
      const membershipRevenue = viajanteUsers * 25 + premiumUsers * 100;
      const usersWithSavings = allUsers.filter(u => (parseFloat(u.totalSavings) || 0) > 0).length;

      // User growth data (last 7 days)
      const growthData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now - i * 24 * 60 * 60 * 1000);
        const dayStr = d.toISOString().split('T')[0];
        const count = allUsers.filter(u => String(u.joinedAt || '').startsWith(dayStr)).length;
        growthData.push({
          label: d.toLocaleDateString('en', { weekday: 'short' }),
          count: count || 0,
        });
      }

      // System info
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const mins = Math.floor((uptime % 3600) / 60);
      const mem = process.memoryUsage();

      let schedulerStatus = {};
      try { schedulerStatus = getSchedulerStatus(); } catch {}

      let expediaInfo = {};
      try { expediaInfo = getExpediaProgrammeInfo(); } catch {}

      // Inbound import stats from real DB
      let imports = [];
      try { imports = await db.getAllBookingImports(100); } catch {}

      const emailsToday = imports.filter(i => String(i.createdAt || '').startsWith(today)).length;
      const currentMonthStr = today.slice(0, 7);
      const emailsThisMonth = imports.filter(i => String(i.createdAt || '').startsWith(currentMonthStr)).length;
      const activeMonitoring = imports.filter(i => i.status === 'ACTIVE_MONITORING').length;
      const needsInformation = imports.filter(i => i.status === 'NEEDS_INFORMATION').length;
      const failed = imports.filter(i => i.status === 'FAILED').length;
      const duplicate = imports.filter(i => i.status === 'DUPLICATE').length;
      const unknownSenders = imports.filter(i => !i.userEmail).length;

      // Was querying DATABASE_URL (Neon) directly — a different database from
      // the Supabase REST store hotel_mappings actually lives in here, so this
      // always read zero rows. Same class of bug as the one in auth.js signup.
      let nuiteeMatches = 0;
      let googleFallbackMatches = 0;
      try {
        [nuiteeMatches, googleFallbackMatches] = await Promise.all([
          db.countHotelMappingsBySource('nuitee'),
          db.countHotelMappingsBySource('google_places'),
        ]);
      } catch {}

      res.json({
        inboundStats: {
          emailsToday,
          emailsThisMonth,
          bookingsCreated: allBookings.length,
          activeMonitoring,
          needsInformation,
          failed,
          duplicate,
          unknownSenders,
          nuiteeMatches,
          googleFallbackMatches,
          awaitingReview: needsInformation,
          attachmentsProcessed: imports.reduce((sum, i) => sum + (i.attachmentsProcessed || 1), 0),
          queueDepth: 0,
          lastUpdated: new Date().toISOString(),
        },
        recentImports: imports.slice(0, 20),
        stats: {
          totalBookings: allBookings.length,
          savingsFound,
          totalSavings: Math.round(totalSavings * 100) / 100,
          avgSavings: savingsFound > 0 ? Math.round((totalSavings / savingsFound) * 100) / 100 : 0,
          successRate: allBookings.length > 0 ? Math.round((savingsFound / allBookings.length) * 100) : 0,
          apiMode: typeof API_MODE !== 'undefined' ? API_MODE : 'PRODUCTION',
        },
        scheduler: schedulerStatus,
        users: {
          total: allUsers.length,
          activeToday,
          newToday: allUsers.filter(u => String(u.joinedAt || '').startsWith(today)).length,
          newThisWeek,
          free: freeUsers,
          viajante: viajanteUsers,
          premium: premiumUsers,
          withSavings: usersWithSavings,
          savingsPercent: allUsers.length > 0 ? Math.round((usersWithSavings / allUsers.length) * 100) : 0,
          avgBookingsPerUser: allUsers.length > 0 ? Math.round((allBookings.length / allUsers.length) * 10) / 10 : 0,
          growthData,
          list: allUsers.slice(0, 50).map(u => ({
            name: u.name,
            email: u.email,
            bookings: u.bookingsCount || 0,
            totalSavings: u.totalSavings || 0,
            plan: u.plan || 'free',
            joinedAt: u.joinedAt,
            active: u.active !== false,
          })),
        },
        bookings: {
          total: allBookings.length,
          monitoring: allBookings.filter(b => b.status === 'monitoring').length,
          savingsFound,
          recentBookings: allBookings.slice(0, 10).map(b => ({
            id: b.id,
            hotelName: b.hotelName,
            destination: b.destination,
            originalPrice: b.originalPrice,
            bestPrice: b.bestPrice,
            totalSavings: b.totalSavings,
            status: b.status,
            createdAt: b.createdAt,
          })),
        },
        revenue: {
          estimatedMonthly: Math.round(estimatedCommissions + membershipRevenue),
          affiliateCommissions: estimatedCommissions,
          membershipRevenue,
          bookingCommissions: Math.round(estimatedCommissions * 0.6 * 100) / 100,
          expediaCommissions: Math.round(estimatedCommissions * 0.3 * 100) / 100,
          otherCommissions: Math.round(estimatedCommissions * 0.1 * 100) / 100,
          totalBookingValue: Math.round(totalBookingValue * 100) / 100,
          avgCommissionRate: Math.round(avgCommissionRate * 100),
          rebookingsThisMonth,
          currentMRR: Math.round((estimatedCommissions + membershipRevenue) * 100) / 100,
          projectedARR: Math.round((estimatedCommissions + membershipRevenue) * 12 * 100) / 100,
          ltvPerUser: allUsers.length > 0 ? Math.round(((estimatedCommissions + membershipRevenue) * 12 / allUsers.length) * 100) / 100 : 0,
          cacTarget: 15,
          breakEvenUsers: Math.ceil(150 / (9.90 * 0.1 + avgCommissionRate * 200)),
        },
        affiliates: {
          booking: {
            configured: typeof isAwinConfigured === 'function' ? isAwinConfigured() : false,
            advertiserIdBrazil: process.env.BOOKING_AWIN_ADVERTISER_ID_BRAZIL || 'N/A',
            programmeStatus: typeof isAwinConfigured === 'function' && isAwinConfigured() ? 'Active' : 'Pending',
          },
          expedia: {
            ...expediaInfo,
            commissions: undefined,
          },
          expediaCommissions: typeof getExpediaCommissionRates === 'function' ? getExpediaCommissionRates() : [],
        },
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          uptime: `${hours}h ${mins}m`,
          memoryUsage: `${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
          environment: process.env.NODE_ENV || 'development',
          serverStart: typeof SERVER_START !== 'undefined' ? SERVER_START.toISOString() : new Date().toISOString(),
          storage: 'Supabase (PostgreSQL)',
          expediaConfigured: typeof isExpediaConfigured === 'function' ? isExpediaConfigured() : false,
        },
      });
    } catch (err) {
      console.error('[Admin Dashboard] Error:', err.message);
      res.status(500).json({ error: 'Failed to generate admin dashboard data: ' + err.message });
    }
  });

  // Trigger manual price check
  router.post('/admin/trigger-check', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      // For manual check, fetch all bookings and pass them
      const allBookings = await db.getAllBookings();
      const bookingsMap = new Map(allBookings.map(b => [b.id, b]));
      const result = await manualCheck(bookingsMap, searchPrices, applyBestResult);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get scheduler status
  router.get('/admin/scheduler', authMiddleware, adminMiddleware, (req, res) => {
    res.json(getSchedulerStatus());
  });

  // Get check history
  router.get('/admin/check-history', authMiddleware, adminMiddleware, (req, res) => {
    res.json(getCheckHistory());
  });

  // Get all users
  router.get('/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
    const allUsers = await db.getAllUsers(200);
    res.json({
      total: allUsers.length,
      users: allUsers,
    });
  });

  // ─── Admin: Bookings management ─────────────────────────────

  // GET /api/admin/bookings — all bookings with filtering/sorting/pagination + user info
  router.get('/admin/bookings', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { status, search, sort, order, page, limit } = req.query;
      const result = await db.getAdminBookings({
        status: status || undefined,
        search: search || undefined,
        sort: sort || 'created_at',
        order: order || 'desc',
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
      });
      // Enrich bookings with user info (name, plan)
      const emails = [...new Set(result.bookings.map(b => b.email).filter(Boolean))];
      const userMap = {};
      if (emails.length > 0) {
        const allUsers = await db.getAllUsers(500);
        for (const u of allUsers) {
          userMap[u.email] = { name: u.name, plan: u.plan || 'free', joinedAt: u.joinedAt || u.createdAt };
        }
      }
      result.bookings = result.bookings.map(b => ({
        ...b,
        userName: userMap[b.email]?.name || '-',
        userPlan: userMap[b.email]?.plan || 'free',
      }));
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/admin/bookings/:id — single booking with fare_alerts + activity_log + user info
  router.get('/admin/bookings/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const booking = await db.getBooking(req.params.id);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      const [fareAlerts, activityLog] = await Promise.all([
        db.getAlertsByBooking(req.params.id),
        db.getActivityLog('booking', req.params.id),
      ]);
      // Enrich with user info
      let user = null;
      if (booking.email) {
        user = await db.getUser(booking.email);
      }
      res.json({ booking, fareAlerts, activityLog, user: user ? { name: user.name, email: user.email, plan: user.plan || 'free', joinedAt: user.joinedAt || user.createdAt } : null });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/admin/bookings/:id — admin update booking
  router.put('/admin/bookings/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      // Security: Only allow updating specific fields to prevent mass assignment
      const allowedFields = ['status', 'notes', 'hotelName', 'destination', 'checkinDate', 'checkoutDate', 'roomType', 'originalPrice', 'bestPrice', 'totalSavings', 'potentialSavings'];
      const updates = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }
      if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });
      const updated = await db.updateBooking(req.params.id, updates);
      if (!updated) return res.status(404).json({ error: 'Booking not found or update failed' });
      await db.logActivity('booking', req.params.id, 'admin_update', req.user.email, { fields: Object.keys(updates) });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/admin/bookings/:id — admin delete booking
  router.delete('/admin/bookings/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const booking = await db.getBooking(req.params.id);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      await db.logActivity('booking', booking.id, 'admin_delete', req.user.email, { hotelName: booking.hotelName, email: booking.email });
      const success = await db.deleteBooking(req.params.id);
      if (!success) return res.status(500).json({ error: 'Failed to delete booking' });
      // Update user stats after deletion
      if (booking.email) await db.updateUserStats(booking.email);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/admin/users/:email — single user with bookings
  router.get('/admin/users/:email', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const user = await db.getUser(req.params.email);
      if (!user) return res.status(404).json({ error: 'User not found' });
      const bookings = await db.getBookingsByEmail(req.params.email);
      res.json({ user, bookings });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/admin/users/:email — admin update user
  router.put('/admin/users/:email', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      // Security: Only allow updating specific fields to prevent mass assignment
      const allowedFields = ['plan', 'name', 'phone', 'currency', 'active'];
      const updates = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }
      if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });
      const updated = await db.updateUser(req.params.email, updates);
      if (!updated) return res.status(404).json({ error: 'User not found or update failed' });
      // entity_id is UUID — the target's row id, not their email (see the
      // same fix in email.js send() / scheduler.js runLifecycleCycle).
      await db.logActivity('user', updated.id, 'admin_update', req.user.email, { fields: Object.keys(updates), targetEmail: req.params.email });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/admin/activity — global activity log
  router.get('/admin/activity', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { entityType, action } = req.query;
      const log = await db.getGlobalActivityLog(200, {
        entityType: entityType || undefined,
        action: action || undefined,
      });
      res.json({ log });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/admin/send-email — send custom email via Resend (to registered users only)
  router.post('/admin/send-email', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { to, subject, body } = req.body;
      if (!to || !subject || !body) {
        return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
      }
      // Security: Only allow sending to registered users (prevent phishing abuse)
      const targetUser = await db.getUser(to);
      if (!targetUser) {
        return res.status(400).json({ error: 'Can only send emails to registered users' });
      }
      // Try to use Resend if configured
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        return res.status(503).json({ error: 'Email service (Resend) not configured. Set RESEND_API_KEY.' });
      }
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'ResDrop <notifications@resdrop.app>',
          to: [to],
          subject,
          html: body.replace(/\n/g, '<br>'),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ error: result.message || 'Failed to send email' });
      }
      await db.logActivity('email', to, 'admin_send_email', req.user.email, { subject });
      res.json({ success: true, id: result.id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  return router;
}
