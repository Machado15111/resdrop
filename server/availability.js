/**
 * Availability watches — "tell me when a room opens up".
 *
 * The price monitor answers "can my booking get cheaper?". This answers a
 * different question: the hotel I want is SOLD OUT for my dates, tell me the
 * moment anything opens. No booking exists yet, so a watch is its own entity:
 * hotel + dates + guests, and nothing else.
 *
 * The rate search is the same call the price monitor already makes. What
 * changes is the success criterion: for a watch, ANY rate coming back means
 * the hotel has inventory again. That is why this module never touches
 * applyBestResult — there is no original price to compare against and no
 * saving to claim.
 *
 * Everything here is pure. The scheduler and the routes supply the data and
 * perform the writes, so the decisions below can be tested without a database,
 * an HTTP server or an API key.
 */

export const WATCH_STATUSES = ['watching', 'available', 'expired', 'cancelled'];

/** A watch stops costing API calls once it reaches one of these. */
export const TERMINAL_STATUSES = ['expired', 'cancelled'];

function num(env, key, fallback) {
  const n = parseInt(env[key], 10);
  return Number.isFinite(n) ? n : fallback;
}

export function watchConfig(env = process.env) {
  return {
    // Normal cadence, in hours, between two checks of the SAME watch.
    minHours: num(env, 'AVAILABILITY_MIN_HOURS', 2),
    // Inside this window before check-in, a room that opens gets taken fast,
    // so the same watch is allowed to run twice as often.
    urgentDays: num(env, 'AVAILABILITY_URGENT_DAYS', 7),
    urgentMinHours: num(env, 'AVAILABILITY_URGENT_MIN_HOURS', 1),
    // Own budget, deliberately NOT shared with MONITOR_DAILY_BUDGET: a burst of
    // watches must never starve the price checks that paying users rely on.
    dailyBudget: num(env, 'AVAILABILITY_DAILY_BUDGET', 200),
    batch: num(env, 'AVAILABILITY_BATCH', 40),
    spacingMs: num(env, 'AVAILABILITY_SPACING_MS', 800),
    // After an alert, hold off this long before alerting the same watch again.
    // Inventory flaps — a room can appear and vanish within the hour — and an
    // alert the traveller cannot act on twice is just noise.
    alertCooldownHours: num(env, 'AVAILABILITY_ALERT_COOLDOWN_HOURS', 24),
    // Consecutive empty checks before we stop blaming the hotel and start
    // suspecting the search string. See needsReview below.
    emptyChecksBeforeReview: num(env, 'AVAILABILITY_EMPTY_BEFORE_REVIEW', 12),
  };
}

/**
 * How often may this watch be checked right now, in hours?
 *
 * Check-in inside the urgent window earns the tighter cadence; everything else
 * runs at the normal one.
 */
export function cadenceHoursFor(watch, cfg = watchConfig(), now = Date.now()) {
  const checkin = new Date(watch?.checkinDate || 0).getTime();
  if (!Number.isFinite(checkin) || checkin === 0) return cfg.minHours;
  const daysOut = (checkin - now) / 8.64e7;
  return daysOut <= cfg.urgentDays ? cfg.urgentMinHours : cfg.minHours;
}

/**
 * A watch is worth an API call when it is still active, its stay has not
 * started, and its cadence has elapsed.
 *
 * `available` watches keep being checked on purpose: the traveller has been
 * told a room opened, and if it sells out again before they book, the watch
 * goes back to `watching` and can alert them again later.
 */
export function isWatchEligible(watch, cfg = watchConfig(), now = Date.now()) {
  if (!watch) return false;
  if (!['watching', 'available'].includes(watch.status)) return false;

  const checkin = new Date(watch.checkinDate || 0).getTime();
  if (Number.isFinite(checkin) && checkin > 0 && checkin < now) return false;

  if (watch.lastChecked) {
    const hrs = (now - new Date(watch.lastChecked).getTime()) / 3.6e6;
    if (Number.isFinite(hrs) && hrs < cadenceHoursFor(watch, cfg, now)) return false;
  }
  return true;
}

/**
 * Which watches to check this cycle: eligible only, soonest check-in first
 * (a room that opens for next week matters more than one for next year), then
 * least-recently checked, capped by the cycle batch and the day's budget.
 */
export function selectWatchesToCheck(watches, { cfg = watchConfig(), budgetRemaining = Infinity, now = Date.now() } = {}) {
  const eligible = (Array.isArray(watches) ? watches : []).filter(w => isWatchEligible(w, cfg, now));
  eligible.sort((a, b) => {
    const ca = new Date(a.checkinDate || 0).getTime();
    const cb = new Date(b.checkinDate || 0).getTime();
    if (ca !== cb) return ca - cb;
    return new Date(a.lastChecked || 0).getTime() - new Date(b.lastChecked || 0).getTime();
  });
  return eligible.slice(0, Math.max(0, Math.min(cfg.batch, budgetRemaining)));
}

/**
 * Read a rate-search result set as an availability answer.
 *
 * "Any room" is the agreed criterion, so a single quote is enough. The best
 * one for the alert is the cheapest that is actually THIS hotel — a quote for
 * a different property in the same city proves nothing about availability
 * here, which is the mistake the price path already learned to avoid.
 */
export function evaluateAvailability(results) {
  const list = Array.isArray(results) ? results : [];
  const exact = list.filter(r => r && r.isExactMatch !== false);
  const usable = exact.length > 0 ? exact : [];

  if (usable.length === 0) {
    return { available: false, offerCount: 0, best: null };
  }

  const sorted = [...usable].sort((a, b) => {
    const pa = Number(a.totalPrice); const pb = Number(b.totalPrice);
    if (Number.isFinite(pa) && Number.isFinite(pb) && pa !== pb) return pa - pb;
    // A refundable room is the one worth telling someone about first.
    if (a.freeCancellation !== b.freeCancellation) return a.freeCancellation ? -1 : 1;
    return 0;
  });
  const best = sorted[0];

  return {
    available: true,
    offerCount: usable.length,
    best: {
      price: Number.isFinite(Number(best.totalPrice)) ? Number(best.totalPrice) : null,
      currency: best.currency || null,
      source: best.source || null,
      roomType: best.roomType || null,
      freeCancellation: best.freeCancellation ?? null,
      link: best.affiliateLink || best.link || null,
    },
  };
}

/**
 * Fold one check into a watch: the fields to persist, and whether this is the
 * moment to notify.
 *
 * Returns { updates, alert, transition } and mutates nothing — the caller
 * decides what to write and what to send.
 *
 * An alert fires only on the edge from "nothing" to "something", never on a
 * watch that was already available, and never twice inside the cooldown. The
 * edge is what the traveller asked to be told about; repeating it every two
 * hours would train them to ignore us.
 */
export function applyWatchResult(watch, results, { cfg = watchConfig(), now = Date.now() } = {}) {
  const nowIso = new Date(now).toISOString();
  const evaluation = evaluateAvailability(results);
  const wasAvailable = watch?.status === 'available';

  const updates = {
    lastChecked: nowIso,
    checkCount: (watch?.checkCount || 0) + 1,
    lastOfferCount: evaluation.offerCount,
  };

  if (!evaluation.available) {
    const consecutiveEmpty = (watch?.consecutiveEmpty || 0) + 1;
    updates.consecutiveEmpty = consecutiveEmpty;
    // Sold out and "we cannot find this hotel at all" look identical from here:
    // both come back empty. After enough fruitless checks, say so instead of
    // leaving the watch looking busy forever.
    updates.needsReview = consecutiveEmpty >= cfg.emptyChecksBeforeReview;
    if (wasAvailable) updates.status = 'watching'; // it sold out again
    return { updates, alert: false, transition: wasAvailable ? 'became_unavailable' : 'still_unavailable' };
  }

  updates.consecutiveEmpty = 0;
  updates.needsReview = false;
  updates.status = 'available';
  updates.foundAt = nowIso;
  updates.foundPrice = evaluation.best.price;
  updates.foundCurrency = evaluation.best.currency;
  updates.foundSource = evaluation.best.source;
  updates.foundRoomType = evaluation.best.roomType;
  updates.foundLink = evaluation.best.link;

  if (wasAvailable) {
    return { updates, alert: false, transition: 'still_available' };
  }

  const lastAlert = watch?.notifiedAt ? new Date(watch.notifiedAt).getTime() : 0;
  const hoursSinceAlert = lastAlert ? (now - lastAlert) / 3.6e6 : Infinity;
  if (hoursSinceAlert < cfg.alertCooldownHours) {
    return { updates, alert: false, transition: 'became_available_muted' };
  }

  updates.notifiedAt = nowIso;
  return { updates, alert: true, transition: 'became_available', best: evaluation.best };
}

/**
 * Watches whose stay has started are dead weight — they cost an API call per
 * cycle and can never pay off. The scheduler retires them before selecting.
 */
export function findExpiredWatches(watches, now = Date.now()) {
  return (Array.isArray(watches) ? watches : []).filter(w => {
    if (!w || TERMINAL_STATUSES.includes(w.status)) return false;
    const checkin = new Date(w.checkinDate || 0).getTime();
    return Number.isFinite(checkin) && checkin > 0 && checkin < now;
  });
}

/**
 * A watch is only useful while the stay is in the future and the dates make
 * sense. Rejected here rather than at the database, so the API can explain why.
 */
export function validateWatch(input, now = Date.now()) {
  const errors = [];
  const hotelName = (input?.hotelName || '').trim();
  const checkinDate = (input?.checkinDate || '').trim();
  const checkoutDate = (input?.checkoutDate || '').trim();

  if (!hotelName) errors.push('hotelName is required');
  if (!checkinDate) errors.push('checkinDate is required');
  if (!checkoutDate) errors.push('checkoutDate is required');

  const ci = new Date(checkinDate).getTime();
  const co = new Date(checkoutDate).getTime();
  if (checkinDate && !Number.isFinite(ci)) errors.push('checkinDate is not a valid date');
  if (checkoutDate && !Number.isFinite(co)) errors.push('checkoutDate is not a valid date');
  if (Number.isFinite(ci) && Number.isFinite(co) && co <= ci) {
    errors.push('checkoutDate must be after checkinDate');
  }
  // Compare against the start of today so a stay beginning today still counts.
  const startOfToday = new Date(new Date(now).toISOString().slice(0, 10)).getTime();
  if (Number.isFinite(ci) && ci < startOfToday) errors.push('checkinDate is in the past');

  const guests = input?.guests === undefined || input?.guests === null || input.guests === ''
    ? 2
    : parseInt(input.guests, 10);
  if (!Number.isFinite(guests) || guests < 1 || guests > 16) errors.push('guests must be between 1 and 16');

  return { valid: errors.length === 0, errors, guests: Number.isFinite(guests) ? guests : 2 };
}

/**
 * The shape searchPrices expects. A watch has no booking id, no original price
 * and no room type to match against — and that is exactly right: passing a
 * room type would make the rate parser filter quotes down to a compatible
 * room, when the question here is whether ANY room exists.
 */
export function watchToSearchInput(watch) {
  return {
    id: `watch-${watch.id}`,
    hotelName: watch.hotelName,
    destination: watch.destination || '',
    checkinDate: watch.checkinDate,
    checkoutDate: watch.checkoutDate,
    currency: watch.currency || 'USD',
    roomType: null,
    originalPrice: 0,
    email: watch.email,
  };
}
