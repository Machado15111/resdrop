import { Router } from 'express';
import * as db from '../db.js';
import { PLANS } from '../planAuthz.js';
import { sendBookingCreated } from '../email.js';
import { createImportResult } from '../importResult.js';
import { extractBookingFromSource } from '../extractors/index.js';

/**
 * Booking CRUD, price checks, import, export, email parsing and stats.
 *
 * Extracted from index.js verbatim — same paths, same middleware chains, same
 * handler bodies, and critically the same REGISTRATION ORDER (see the note on
 * /bookings/export below).
 *
 * The `deps` object carries what still lives in index.js module scope: the
 * price engine (searchPrices/applyBestResult), the hotel-data resolution and
 * result-filtering helpers, and the extraction/validation helpers. These are
 * injected rather than imported because they are defined in index.js itself —
 * moving them too would make this more than a pure move. Splitting the
 * extraction engine into its own module is the natural next step.
 */
export default function bookingRoutes({
  authMiddleware, bookingRateLimit, parseRateLimit, costlyApiRateLimit,
  searchPrices, applyBestResult, attachHotelData, filterBookingResults,
  resolveBookingHotel, generateId, detectOTA, validateBookingData,
  findDuplicateBooking, parseEmailContent,
  VALID_BOOKING_STATUSES, SUPPORTED_CURRENCIES,
}) {
  const router = Router();

  router.post('/bookings', authMiddleware, bookingRateLimit, async (req, res) => {
    try {
      const {
        hotelName, destination, checkinDate, checkoutDate,
        roomType, originalPrice,
        guestName, confirmationNumber,
        rateType, roomTypeCustom,
        preferences, taxesIncluded,
        rawSource, parseMethod, cancellationPolicy
      } = req.body;

      // Validate booking data
      const validation = validateBookingData({ hotelName, checkinDate, checkoutDate, originalPrice, confirmationNumber, roomType, guestName, destination });
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Validation failed',
          errors: validation.errors,
          warnings: validation.warnings,
          missingFields: validation.missingFields,
        });
      }

      // Duplicate detection
      const duplicate = await findDuplicateBooking(req.userEmail, hotelName, checkinDate, checkoutDate);
      if (duplicate) {
        return res.status(409).json({
          error: 'duplicate_booking',
          message: 'A booking with the same hotel, check-in, and check-out dates already exists.',
          existingBookingId: duplicate.id,
        });
      }

      // Validate plan limit using authenticated user
      const plan = PLANS[req.user.plan] || PLANS.free;
      if ((req.user.bookingsCount || 0) >= plan.bookingsPerMonth) {
        return res.status(403).json({
          error: 'plan_limit',
          message: `Limite do plano atingido (${plan.bookingsPerMonth} reservas/mes). Faca upgrade para continuar.`,
          limit: plan.bookingsPerMonth,
          plan: req.user.plan,
        });
      }

      // Determine status based on completeness — NEVER auto-generate confirmation or room type
      const optionalMissing = validation.missingFields.filter(f => !['hotelName', 'checkinDate', 'checkoutDate', 'originalPrice'].includes(f));
      const status = optionalMissing.length > 0 ? 'needs_review' : 'monitoring';

      const id = generateId();
      const originalPriceFloat = parseFloat(originalPrice);

      // Issue 7: Validate price is reasonable
      const priceWarnings = [];
      if (originalPriceFloat < 10) priceWarnings.push('price_too_low');
      if (originalPriceFloat > 50000) priceWarnings.push('price_unusually_high');

      const booking = {
        id,
        hotelName,
        destination: destination || '',
        checkinDate,
        checkoutDate,
        roomType: roomType || null,
        originalPrice: originalPriceFloat,
        guestName: guestName || req.user.name || null,
        confirmationNumber: confirmationNumber || null,
        // Issue 13: Multi-guest support
        guests: req.body.guests || [{ name: guestName || req.user.name || 'Guest', email: req.userEmail, role: 'primary' }],
        // Issue 12: Multi-room support
        rooms: req.body.rooms || [{ type: roomType || 'Standard', count: 1, occupants: req.body.occupants || 1 }],
        // Issue 16: Document attachments
        attachments: [],
        email: req.userEmail,
        cancellationPolicy: cancellationPolicy || 'free_cancellation',
        status,
        missingFields: optionalMissing.length > 0 ? optionalMissing : null,
        createdAt: new Date().toISOString(),
        lastChecked: null,
        bestPrice: null,
        bestSource: null,
        totalSavings: 0,
        notes: [
          preferences?.length ? `Preferências: ${preferences.join(', ')}` : '',
          taxesIncluded ? 'Impostos incluídos' : '',
        ].filter(Boolean).join(' | '),
        rateType: rateType || 'total',
        roomTypeCustom: roomTypeCustom || null,
        rawSource: rawSource || null,
        parseMethod: parseMethod || 'manual',
        currency: req.body.currency || 'USD',
        bookingSource: req.body.bookingSource || detectOTA(req.body),
        bookingUrl: req.body.bookingUrl || null,
        cancellationDeadlineAlert: req.body.cancellationDeadlineAlert || '48_hours_before',
        cancellationDeadline: req.body.cancellationDeadline || null,
        // Issue 22: Timezone awareness
        timezone: req.body.timezone || 'UTC',
        // Issue 23: Currency conversion (store original + user currency)
        originalCurrency: req.body.currency || 'USD',
        userCurrency: req.user.currency || 'USD',
        priceInUserCurrency: null,  // calculated based on exchange rate
        exchangeRate: 1.0,  // to be set by scheduler
        priceValidationWarnings: priceWarnings,
        alertPreferences: {
          email: true,
          push: false,
          sms: false,
          minSavings: 0,
        },
        rejectedOffers: [],
        priceHistory: [
          {
            date: new Date().toISOString(),
            price: originalPriceFloat,
            source: 'Reserva Original',
          },
        ],
        alerts: [],
        changeHistory: [],
        bookingHistory: [
          {
            date: new Date().toISOString(),
            action: 'created',
            details: { source: parseMethod || 'manual', parseMethod },
          },
        ],
        apiMode: API_MODE,
      };

      const created = await db.createBooking(booking);
      if (!created) {
        return res.status(500).json({ error: 'Failed to create booking — database error. Check server logs.' });
      }

      // Fire-and-forget: booking created email
      sendBookingCreated(req.userEmail, req.user.name || 'Traveler', created, req.user).catch(() => {});

      // Fire-and-forget: immediate first price check (don't wait for scheduled checks)
      (async () => {
        try {
          const user = await db.getUser(req.userEmail);
          const results = await searchPrices(created, { currency: user?.currency });
          await applyBestResult(created, results);
        } catch (err) {
          console.warn(`[Check] First check for ${created.id} (${created.hotelName}): ${err.message}`);
        }
      })().catch(() => {});

      res.status(201).json(created);
    } catch (err) {
      console.error('[API] POST /bookings error:', err);
      res.status(500).json({ error: `Server error: ${err.message}` });
    }
  });

  // Get bookings with filtering & search (Issue 20)
  router.get('/bookings', authMiddleware, async (req, res) => {
    // List view never renders latest_results/price_history (~86% of row bytes).
    const results = await db.getBookingsByEmail(req.userEmail, { columns: db.BOOKING_LIST_COLUMNS });

    // Filter by status
    let filtered = results;
    if (req.query.status) {
      const statuses = req.query.status.split(',');
      filtered = filtered.filter(b => statuses.includes(b.status));
    }

    // Filter by min savings
    if (req.query.minSavings) {
      const min = parseFloat(req.query.minSavings);
      filtered = filtered.filter(b => (b.totalSavings || 0) >= min);
    }

    // Search by hotel name or destination
    if (req.query.search) {
      const q = req.query.search.toLowerCase();
      filtered = filtered.filter(b =>
        b.hotelName.toLowerCase().includes(q) ||
        b.destination.toLowerCase().includes(q)
      );
    }

    // Filter by date range
    if (req.query.checkinAfter) {
      filtered = filtered.filter(b => b.checkinDate >= req.query.checkinAfter);
    }
    if (req.query.checkinBefore) {
      filtered = filtered.filter(b => b.checkinDate <= req.query.checkinBefore);
    }

    // Sort
    const sort = req.query.sort || 'createdAt_desc';
    const [field, direction] = sort.split('_');
    filtered.sort((a, b) => {
      const aVal = a[field] || 0;
      const bVal = b[field] || 0;
      return direction === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // Exclude archived by default
    if (req.query.includeArchived !== 'true') {
      filtered = filtered.filter(b => b.status !== 'archived');
    }

    res.json(filtered.map(filterBookingResults));
  });

  // Bulk import bookings (Issue 10)
  router.post('/bookings/bulk-import', authMiddleware, bookingRateLimit, async (req, res) => {
    const { bookings } = req.body;
    if (!Array.isArray(bookings) || bookings.length === 0) {
      return res.status(400).json({ error: 'bookings array required' });
    }

    const plan = PLANS[req.user.plan] || PLANS.free;
    const currentCount = req.user.bookingsCount || 0;
    const remainingSlots = plan.bookingsPerMonth - currentCount;

    if (bookings.length > remainingSlots) {
      return res.status(403).json({
        error: 'plan_limit',
        message: `Plan limit exceeded. Can create ${remainingSlots} more bookings this month.`,
        limit: plan.bookingsPerMonth,
        current: currentCount,
        requested: bookings.length,
      });
    }

    const results = { created: [], failed: [] };

    for (let i = 0; i < bookings.length; i++) {
      const bookingData = bookings[i];
      try {
        const validation = validateBookingData(bookingData);
        if (!validation.valid) {
          results.failed.push({ index: i, errors: validation.errors });
          continue;
        }

        const duplicate = await findDuplicateBooking(req.userEmail, bookingData.hotelName, bookingData.checkinDate, bookingData.checkoutDate);
        if (duplicate) {
          results.failed.push({ index: i, error: 'Duplicate booking' });
          continue;
        }

        const id = generateId();
        const booking = {
          id,
          hotelName: bookingData.hotelName,
          destination: bookingData.destination || '',
          checkinDate: bookingData.checkinDate,
          checkoutDate: bookingData.checkoutDate,
          roomType: bookingData.roomType || null,
          originalPrice: parseFloat(bookingData.originalPrice),
          guestName: bookingData.guestName || req.user.name || null,
          confirmationNumber: bookingData.confirmationNumber || null,
          email: req.userEmail,
          cancellationPolicy: bookingData.cancellationPolicy || 'free_cancellation',
          status: 'monitoring',
          createdAt: new Date().toISOString(),
          lastChecked: null,
          bestPrice: null,
          bestSource: null,
          totalSavings: 0,
          currency: bookingData.currency || 'USD',
          bookingSource: bookingData.bookingSource || detectOTA(bookingData),
          priceHistory: [{ date: new Date().toISOString(), price: parseFloat(bookingData.originalPrice), source: 'Bulk Import' }],
          alerts: [],
          changeHistory: [],
          bookingHistory: [{ date: new Date().toISOString(), action: 'created', details: { source: 'bulk_import' } }],
          apiMode: API_MODE,
        };

        const created = await db.createBooking(booking);
        if (created) {
          results.created.push(created);
        } else {
          results.failed.push({ index: i, error: 'Database error' });
        }
      } catch (err) {
        results.failed.push({ index: i, error: err.message });
      }
    }

    res.status(201).json({
      ...results,
      summary: { total: bookings.length, created: results.created.length, failed: results.failed.length },
    });
  });

  // Get a single booking (ownership check)
  // ─────────────────────────────────────────────────────────────
  // ORDER MATTERS: these two literal paths MUST stay above
  // '/bookings/:id'. Express matches in registration order, so while
  // they sat below it, GET /bookings/export and
  // GET /bookings/upcoming-deadlines were both swallowed by the ':id'
  // handler, which looked up a booking whose id was the literal string
  // "export" and answered 404 "Booking not found". The dashboard's CSV
  // export button had been dead in production as a result.
  // ─────────────────────────────────────────────────────────────
  // Export bookings as CSV or JSON (Issue 10)
  router.get('/bookings/export', authMiddleware, async (req, res) => {
    const format = req.query.format || 'json'; // 'csv' or 'json'
    const bookings = await db.getBookingsByEmail(req.userEmail);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="resdrop-bookings.json"');
      return res.json(bookings.map(b => ({
        id: b.id,
        hotelName: b.hotelName,
        destination: b.destination,
        checkinDate: b.checkinDate,
        checkoutDate: b.checkoutDate,
        roomType: b.roomType,
        originalPrice: b.originalPrice,
        currency: b.currency,
        confirmationNumber: b.confirmationNumber,
        bookingSource: b.bookingSource,
        bookingUrl: b.bookingUrl,
        bestPrice: b.bestPrice,
        totalSavings: b.totalSavings,
        status: b.status,
        createdAt: b.createdAt,
      })));
    } else if (format === 'csv') {
      const headers = ['ID', 'Hotel', 'Destination', 'Check-in', 'Check-out', 'Room Type', 'Original Price', 'Currency', 'Best Price', 'Savings', 'Status', 'Created'];
      const rows = bookings.map(b => [
        b.id,
        b.hotelName,
        b.destination,
        b.checkinDate,
        b.checkoutDate,
        b.roomType || '',
        b.originalPrice,
        b.currency,
        b.bestPrice || '',
        b.totalSavings || '',
        b.status,
        b.createdAt,
      ]).map(row => row.map(cell => `"${cell}"`).join(','));

      const csv = [headers.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="resdrop-bookings.csv"');
      return res.send(csv);
    } else {
      return res.status(400).json({ error: 'format must be json or csv' });
    }
  });

  // Get bookings with upcoming cancellation deadlines (Issue 11)
  router.get('/bookings/upcoming-deadlines', authMiddleware, async (req, res) => {
    const bookings = await db.getBookingsByEmail(req.userEmail);
    const now = new Date();
    const hoursAhead = 72; // Check deadlines within 72 hours
    const deadline = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    const upcoming = bookings.filter(b => {
      if (!b.cancellationDeadline || !['monitoring', 'lower_fare_found'].includes(b.status)) return false;
      const dl = new Date(b.cancellationDeadline);
      return dl > now && dl <= deadline;
    }).map(b => ({
      ...b,
      hoursUntilDeadline: Math.round((new Date(b.cancellationDeadline) - now) / (1000 * 60 * 60)),
    })).sort((a, b) => a.hoursUntilDeadline - b.hoursUntilDeadline);

    res.json(upcoming);
  });

  router.get('/bookings/:id', authMiddleware, async (req, res) => {
    const booking = await db.getBooking(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.email !== req.userEmail) return res.status(403).json({ error: 'Access denied' });
    const enriched = await attachHotelData(filterBookingResults(booking));
    res.json(enriched);
  });

  // Progressive hotel data (images, star, address, coords + nuiteeHotelId) for the
  // detail view. Runs the full resolution (may hit Nuitée) OUT of the critical
  // booking-load path, so the reservation renders instantly and images fill in.
  router.get('/bookings/:id/hotel', authMiddleware, async (req, res) => {
    const booking = await db.getBooking(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.email !== req.userEmail) return res.status(403).json({ error: 'Access denied' });
    try {
      const match = await resolveBookingHotel(booking, { cacheOnly: false });
      if (match?.hotel) {
        return res.json({ status: 'ok', hotelData: match.hotel, nuiteeHotelId: match.hotel.nuiteeHotelId || null });
      }
      return res.json({ status: match ? 'ok' : 'unmatched', hotelData: null, nuiteeHotelId: null });
    } catch (e) {
      console.error('[bookings/:id/hotel]', e.message);
      return res.status(502).json({ status: 'error', hotelData: null });
    }
  });

  // DELETE /api/bookings/:id — user deletes their own booking
  router.delete('/bookings/:id', authMiddleware, async (req, res) => {
    try {
      const booking = await db.getBooking(req.params.id);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      if (booking.email !== req.userEmail) return res.status(403).json({ error: 'Access denied' });
      const ok = await db.deleteBooking(req.params.id);
      if (!ok) return res.status(500).json({ error: 'Failed to delete booking' });
      if (booking.email) await db.updateUserStats(booking.email).catch(() => {});
      res.json({ success: true });
    } catch (err) {
      console.error('[Bookings] delete error:', err.message);
      res.status(500).json({ error: 'Failed to delete booking' });
    }
  });

  // Upload attachment to booking (Issue 16: confirmation email, screenshots, etc)
  router.post('/bookings/:id/attachments', authMiddleware, async (req, res) => {
    const booking = await db.getBooking(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.email !== req.userEmail) return res.status(403).json({ error: 'Access denied' });

    const { type, url, fileName } = req.body;
    if (!type || !url) {
      return res.status(400).json({ error: 'type and url required' });
    }

    const attachments = booking.attachments || [];
    attachments.push({
      id: generateId(),
      type, // confirmation_email, screenshot, booking_confirmation, boarding_pass
      url,
      fileName: fileName || 'document',
      uploadedAt: new Date().toISOString(),
    });

    const updated = await db.updateBooking(req.params.id, { attachments });
    res.json(updated);
  });

  // Refresh price check (ownership check)
  router.post('/bookings/:id/check', authMiddleware, costlyApiRateLimit, async (req, res) => {
    const booking = await db.getBooking(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.email !== req.userEmail) return res.status(403).json({ error: 'Access denied' });

    try {
      const user = await db.getUser(req.userEmail);
      const results = await searchPrices(booking, { currency: user?.currency });
      await applyBestResult(booking, results);
      // Re-fetch to get the updated version from DB
      const updated = await db.getBooking(req.params.id);
      res.json(filterBookingResults(updated));
    } catch (err) {
      console.error(`[Check] Failed for ${booking.hotelName}: ${err.message}`);
      res.status(500).json({ error: 'Price check failed', message: err.message });
    }
  });

  // Reject offer (Issue 9: track rejected offers with reason)
  router.post('/bookings/:id/reject-offer', authMiddleware, async (req, res) => {
    const booking = await db.getBooking(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.email !== req.userEmail) return res.status(403).json({ error: 'Access denied' });

    const { offeredPrice, source, reason } = req.body;
    if (!offeredPrice || !source) {
      return res.status(400).json({ error: 'offeredPrice and source required' });
    }

    const rejectedOffers = booking.rejectedOffers || [];
    rejectedOffers.push({
      date: new Date().toISOString(),
      offeredPrice: parseFloat(offeredPrice),
      source,
      reason: reason || 'user_decision',
    });

    // Issue 14: Add booking history entry
    const bookingHistory = booking.bookingHistory || [];
    bookingHistory.push({
      date: new Date().toISOString(),
      action: 'offer_rejected',
      details: { price: parseFloat(offeredPrice), source, reason: reason || 'user_decision' },
    });

    const updated = await db.updateBooking(req.params.id, { rejectedOffers, bookingHistory });
    res.json(updated);
  });

  // Edit a booking (ownership check)
  router.put('/bookings/:id', authMiddleware, async (req, res) => {
    const booking = await db.getBooking(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.email !== req.userEmail) return res.status(403).json({ error: 'Access denied' });

    // Validate status if provided
    if (req.body.status && !VALID_BOOKING_STATUSES.includes(req.body.status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_BOOKING_STATUSES.join(', ')}` });
    }

    // The booking's currency drives which currency every rate is quoted in, so a
    // junk value would silently corrupt every future price check.
    if (req.body.currency !== undefined) {
      const cur = String(req.body.currency).toUpperCase();
      if (!SUPPORTED_CURRENCIES.includes(cur)) {
        return res.status(400).json({ error: `Invalid currency. Must be one of: ${SUPPORTED_CURRENCIES.join(', ')}` });
      }
      req.body.currency = cur;
    }

    const editable = ['hotelName', 'destination', 'checkinDate', 'checkoutDate', 'roomType', 'roomTypeCustom', 'originalPrice', 'confirmationNumber', 'guestName', 'notes', 'rateType', 'status', 'cancellationPolicy', 'bookingSource', 'currency', 'bookingUrl', 'alertPreferences'];
    const changes = [];
    const updates = {};

    for (const field of editable) {
      if (req.body[field] !== undefined && req.body[field] !== booking[field]) {
        changes.push({ field, from: booking[field], to: req.body[field], at: new Date().toISOString() });
        updates[field] = field === 'originalPrice' ? parseFloat(req.body[field]) : req.body[field];
      }
    }

    if (changes.length > 0) {
      const changeHistory = [...(booking.changeHistory || []), ...changes];
      updates.changeHistory = changeHistory;
      updates.updatedAt = new Date().toISOString();

      // If previously needs_review and key fields are being filled in, recalculate missingFields
      if (booking.status === 'needs_review') {
        const merged = { ...booking, ...updates };
        const recheck = validateBookingData(merged);
        const optionalMissing = recheck.missingFields.filter(f => !['hotelName', 'checkinDate', 'checkoutDate', 'originalPrice'].includes(f));
        updates.missingFields = optionalMissing.length > 0 ? optionalMissing : null;
        // Auto-promote to monitoring if all fields filled and no explicit status change
        if (optionalMissing.length === 0 && !req.body.status) {
          updates.status = 'monitoring';
        }
      }

      // Recalculate savings if originalPrice changed
      if (changes.some(c => c.field === 'originalPrice')) {
        const newOriginal = updates.originalPrice || booking.originalPrice;
        if (booking.bestPrice) {
          const newSavings = Math.round((newOriginal - booking.bestPrice) * 100) / 100;
          updates.totalSavings = newSavings > 0 ? newSavings : 0;
          updates.status = newSavings > 0 ? 'savings_found' : 'monitoring';
        }
        // Update first priceHistory entry
        const priceHistory = [...(booking.priceHistory || [])];
        if (priceHistory.length > 0) {
          priceHistory[0].price = newOriginal;
          updates.priceHistory = priceHistory;
        }
        await db.updateUserStats(booking.email);
      }

      const updated = await db.updateBooking(req.params.id, updates);
      return res.json(updated);
    }

    res.json(booking);
  });

  router.post('/parse-email', authMiddleware, parseRateLimit, async (req, res) => {
    const { emailContent } = req.body;
    if (!emailContent) return res.status(400).json({ error: 'emailContent is required' });

    const { extractBookingFromSource } = await import('./extractors/index.js');
    const { createImportResult } = await import('./importResult.js');

    const extraction = await extractBookingFromSource({ text: emailContent });
    const essentialFields = ['hotelName', 'checkIn', 'checkOut', 'totalPrice', 'currency'];
    const missingFields = essentialFields.filter(f => !extraction.fields[f] && !extraction.fields[f === 'checkIn' ? 'checkinDate' : f === 'checkOut' ? 'checkoutDate' : f === 'totalPrice' ? 'originalPrice' : f]);

    const result = createImportResult({
      success: true,
      source: 'manual_text',
      booking: extraction.fields,
      hotel: null,
      missingFields,
      warnings: extraction.warnings || [],
      attachmentsProcessed: 0,
      status: missingFields.length === 0 ? 'ACTIVE_MONITORING' : 'NEEDS_INFORMATION',
    });

    res.json(result);
  });

  // Email-to-booking workflow: forward email → auto-create booking
  router.post('/bookings/from-email', authMiddleware, parseRateLimit, async (req, res) => {
    const { rawEmail } = req.body;
    if (!rawEmail) return res.status(400).json({ error: 'rawEmail is required' });

    const { parsed, fieldConfidence } = parseEmailContent(rawEmail);

    // Validate required fields
    const validation = validateBookingData(parsed);

    if (!validation.valid) {
      return res.status(422).json({
        status: 'incomplete',
        parsed,
        fieldConfidence,
        errors: validation.errors,
        missingFields: validation.missingFields,
        warnings: validation.warnings,
        message: `Could not extract: ${validation.missingFields.filter(f => ['hotelName', 'checkinDate', 'checkoutDate', 'originalPrice'].includes(f)).join(', ')}. Please review and complete manually.`,
      });
    }

    // Duplicate detection
    const duplicate = await findDuplicateBooking(req.userEmail, parsed.hotelName, parsed.checkinDate, parsed.checkoutDate);
    if (duplicate) {
      return res.status(409).json({
        error: 'duplicate_booking',
        message: 'A booking with the same hotel, check-in, and check-out dates already exists.',
        existingBookingId: duplicate.id,
        parsed,
        fieldConfidence,
      });
    }

    // Validate plan limit
    const plan = PLANS[req.user.plan] || PLANS.free;
    if ((req.user.bookingsCount || 0) >= plan.bookingsPerMonth) {
      return res.status(403).json({ error: 'plan_limit', parsed });
    }

    // Determine status — NEVER auto-generate confirmation or room type
    const optionalMissing = validation.missingFields.filter(f => !['hotelName', 'checkinDate', 'checkoutDate', 'originalPrice'].includes(f));
    const status = optionalMissing.length > 0 ? 'needs_review' : 'monitoring';

    const id = generateId();
    const booking = {
      id,
      hotelName: parsed.hotelName,
      destination: parsed.destination || '',
      checkinDate: parsed.checkinDate,
      checkoutDate: parsed.checkoutDate,
      roomType: parsed.roomType || null,
      originalPrice: parseFloat(parsed.originalPrice),
      guestName: parsed.guestName || null,
      confirmationNumber: parsed.confirmationNumber || null,
      cancellationPolicy: parsed.cancellationPolicy || null,
      email: req.userEmail,
      status,
      missingFields: optionalMissing.length > 0 ? optionalMissing : null,
      fieldConfidence,
      rawSource: rawEmail,
      parseMethod: 'email_paste',
      createdAt: new Date().toISOString(),
      source: 'email_forward',
      lastChecked: null,
      bestPrice: null,
      bestSource: null,
      totalSavings: 0,
      priceHistory: [{ date: new Date().toISOString(), price: parseFloat(parsed.originalPrice), source: 'Reserva Original' }],
      alerts: [],
      changeHistory: [],
      apiMode: API_MODE,
    };

    const created = await db.createBooking(booking);
    if (!created) {
      return res.status(500).json({ error: 'Failed to create booking — database error. Check server logs.' });
    }

    const { createImportResult } = await import('./importResult.js');
    const resultPayload = createImportResult({
      success: true,
      source: 'email_paste',
      booking: created,
      hotel: null,
      missingFields: optionalMissing.length > 0 ? optionalMissing : [],
      warnings: validation.warnings || [],
      attachmentsProcessed: 0,
      status: status === 'monitoring' ? 'ACTIVE_MONITORING' : 'NEEDS_INFORMATION',
    });

    res.status(201).json(resultPayload);
  });

  // Get stats summary (always filtered by authenticated user)
  router.get('/stats', authMiddleware, async (req, res) => {
    const stats = await db.getStats(req.userEmail);
    // stats now returns potentialSavings + totalSavings (confirmed only)
    res.json({ ...stats, apiMode: API_MODE });
  });

  // API config status endpoint — public info only (no secrets/IDs)

  return router;
}
