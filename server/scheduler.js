import { pollInboundEmails } from './routes/inbound-email.js';

/**
 * Price Monitoring Scheduler (cost-aware)
 *
 * Runs automated price checks on a fixed interval, but every cycle is bounded by
 * a DAILY SEARCH BUDGET and a per-booking CADENCE so it monitors 24/7 without
 * blowing the SerpApi quota. Each cycle loads bookings FRESH from the DB (so new
 * bookings are picked up and deleted ones drop out), checks only the ones that
 * are "due", prioritises the soonest check-ins, and stops when the budget runs
 * out. All knobs are env-tunable:
 *
 *   MONITOR_ENABLED          '=false' to disable (default: enabled)
 *   MONITOR_INTERVAL_MINUTES  cycle cadence            (default 120)
 *   MONITOR_MIN_HOURS         min hours between checks of the SAME booking (24)
 *   MONITOR_DAILY_BUDGET      max checks per calendar day, all bookings   (100)
 *   MONITOR_BATCH             max checks per single cycle                  (25)
 *   MONITOR_SPACING_MS        delay between checks within a cycle          (800)
 *   MONITOR_STARTUP_DELAY_MS  delay before the first cycle after boot   (15000)
 */

function num(key, fallback) {
  const n = parseInt(process.env[key], 10);
  return Number.isFinite(n) ? n : fallback;
}

// ── Scheduler state ──────────────────────────────────────────
let schedulerInterval = null;
let inboundEmailInterval = null;
let lastCheckTime = null;
let totalChecksRun = 0;
let checkHistory = [];
const MAX_HISTORY = 100;

// Daily budget, reset per calendar day.
let budgetDate = '';
let budgetUsed = 0;
function budgetRemaining() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== budgetDate) { budgetDate = today; budgetUsed = 0; }
  return Math.max(0, num('MONITOR_DAILY_BUDGET', 100) - budgetUsed);
}

// ── Selection logic (pure, unit-testable) ────────────────────

/**
 * Is a booking worth an automated check right now?
 *  - only actively-monitored, actionable statuses
 *  - skip stays that have already ended
 *  - respect the per-booking cadence (don't re-check within minHours)
 */
export function isEligible(b, minHours = 24, now = Date.now()) {
  if (!b) return false;
  if (!['monitoring', 'savings_found', 'lower_fare_found'].includes(b.status)) return false;
  if (b.checkoutDate) {
    const co = new Date(b.checkoutDate).getTime();
    if (Number.isFinite(co) && co < now) return false;
  }
  if (b.lastChecked) {
    const hrs = (now - new Date(b.lastChecked).getTime()) / 3.6e6;
    if (Number.isFinite(hrs) && hrs < minHours) return false;
  }
  return true;
}

/**
 * Pick which bookings to check this cycle: eligible only, soonest check-in
 * first (most time-sensitive), then least-recently checked, capped by the
 * cycle batch AND the remaining daily budget.
 */
export function selectBookingsToCheck(bookings, { minHours = 24, batch = 25, budgetRemaining: budget = Infinity, now = Date.now() } = {}) {
  const eligible = (Array.isArray(bookings) ? bookings : []).filter(b => isEligible(b, minHours, now));
  eligible.sort((a, b) => {
    const ca = new Date(a.checkinDate || 0).getTime();
    const cb = new Date(b.checkinDate || 0).getTime();
    if (ca !== cb) return ca - cb;
    return new Date(a.lastChecked || 0).getTime() - new Date(b.lastChecked || 0).getTime();
  });
  const cap = Math.max(0, Math.min(batch, budget));
  return eligible.slice(0, cap);
}

function recordHistory(entry) {
  const full = { timestamp: new Date().toISOString(), ...entry };
  lastCheckTime = full.timestamp;
  if (entry.status === 'completed') totalChecksRun++;
  checkHistory.push(full);
  if (checkHistory.length > MAX_HISTORY) checkHistory.shift();
  return full;
}

export function getSchedulerStatus() {
  return {
    running: !!schedulerInterval,
    intervalMinutes: num('MONITOR_INTERVAL_MINUTES', 120),
    minHoursPerBooking: num('MONITOR_MIN_HOURS', 24),
    dailyBudget: num('MONITOR_DAILY_BUDGET', 100),
    budgetUsedToday: budgetUsed,
    budgetRemaining: budgetRemaining(),
    lastCheck: lastCheckTime,
    totalChecksRun,
    recentHistory: checkHistory.slice(-20),
  };
}

// ── Automated cost-aware cycle ───────────────────────────────
async function runMonitorCycle(loadBookingsFn, searchPricesFn, applyBestResultFn) {
  const startTime = Date.now();
  let bookings = [];
  try {
    bookings = await loadBookingsFn();
  } catch (e) {
    console.error('[Monitor] load bookings failed:', e.message);
    return recordHistory({ bookingsChecked: 0, savingsFound: 0, errors: 1, duration: Date.now() - startTime, status: 'load_failed' });
  }

  const todo = selectBookingsToCheck(bookings, {
    minHours: num('MONITOR_MIN_HOURS', 24),
    batch: num('MONITOR_BATCH', 25),
    budgetRemaining: budgetRemaining(),
  });

  if (todo.length === 0) {
    return recordHistory({ bookingsChecked: 0, savingsFound: 0, errors: 0, duration: Date.now() - startTime, status: 'nothing_due' });
  }

  console.log(`[Monitor] 🔄 cycle: checking ${todo.length} due booking(s) — budget left today: ${budgetRemaining()}`);
  let savingsFound = 0;
  let errors = 0;
  const spacing = num('MONITOR_SPACING_MS', 800);

  for (const booking of todo) {
    try {
      const previousBest = booking.bestPrice;
      const results = await searchPricesFn(booking);
      await applyBestResultFn(booking, results);
      budgetUsed++;
      if (booking.bestPrice && (!previousBest || booking.bestPrice < previousBest)) {
        savingsFound++;
        console.log(`[Monitor] 💰 lower rate for "${booking.hotelName}"`);
      }
      if (spacing > 0) await new Promise(r => setTimeout(r, spacing));
    } catch (err) {
      errors++;
      console.error(`[Monitor] error checking "${booking.hotelName}": ${err.message}`);
    }
  }

  const entry = recordHistory({ bookingsChecked: todo.length, savingsFound, errors, duration: Date.now() - startTime, status: 'completed' });
  console.log(`[Monitor] ✅ cycle done: ${todo.length} checked, ${savingsFound} lower rate(s), ${errors} error(s) (${entry.duration}ms)`);
  return entry;
}

/**
 * Start automated monitoring. `loadBookingsFn` returns a fresh array of bookings
 * each call (source of truth), so the loop always reflects current data.
 */
export function startScheduler(loadBookingsFn, searchPricesFn, applyBestResultFn) {
  if (schedulerInterval) {
    console.log('[Monitor] already running');
    return;
  }
  const intervalMin = num('MONITOR_INTERVAL_MINUTES', 120);
  console.log(`[Monitor] 🕐 Automated monitoring ON — cycle every ${intervalMin}min · ≤${num('MONITOR_DAILY_BUDGET', 100)} checks/day · each booking ≤1×/${num('MONITOR_MIN_HOURS', 24)}h`);

  schedulerInterval = setInterval(() => {
    runMonitorCycle(loadBookingsFn, searchPricesFn, applyBestResultFn)
      .catch(e => console.error('[Monitor] cycle error:', e.message));
  }, intervalMin * 60 * 1000);

  // Inbound email poller (independent opt-in)
  const pollMinutes = parseInt(process.env.INBOUND_EMAIL_POLL_MINUTES || '2', 10);
  if (process.env.INBOUND_EMAIL_ENABLED === 'true') {
    console.log(`[Monitor] 📧 inbound email poller (every ${pollMinutes} minute(s))`);
    inboundEmailInterval = setInterval(async () => {
      try { await pollInboundEmails(); } catch (e) { console.error('[Monitor] inbound poller:', e.message); }
    }, pollMinutes * 60 * 1000);
  }

  // First cycle shortly after boot (let the server settle first).
  setTimeout(() => {
    runMonitorCycle(loadBookingsFn, searchPricesFn, applyBestResultFn).catch(() => {});
    if (process.env.INBOUND_EMAIL_ENABLED === 'true') pollInboundEmails().catch(() => {});
  }, num('MONITOR_STARTUP_DELAY_MS', 15000));
}

export function stopScheduler() {
  if (schedulerInterval) { clearInterval(schedulerInterval); schedulerInterval = null; }
  if (inboundEmailInterval) { clearInterval(inboundEmailInterval); inboundEmailInterval = null; }
  console.log('[Monitor] stopped');
}

/**
 * Manual check (admin "trigger-check") — checks ALL passed bookings that are
 * actively monitored, ignoring the daily budget (it's an explicit, one-off run).
 */
export async function manualCheck(bookingsMap, searchPricesFn, applyBestResultFn) {
  const startTime = Date.now();
  const bookings = Array.from(bookingsMap.values()).filter(
    b => b.status === 'monitoring' || b.status === 'savings_found' || b.status === 'lower_fare_found'
  );
  if (bookings.length === 0) {
    return recordHistory({ bookingsChecked: 0, savingsFound: 0, errors: 0, duration: 0, status: 'no_bookings' });
  }
  let savingsFound = 0;
  let errors = 0;
  for (const booking of bookings) {
    try {
      const previousBest = booking.bestPrice;
      const results = await searchPricesFn(booking);
      await applyBestResultFn(booking, results);
      if (booking.bestPrice && (!previousBest || booking.bestPrice < previousBest)) savingsFound++;
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      errors++;
      console.error(`[Monitor] manual check error "${booking.hotelName}": ${err.message}`);
    }
  }
  return recordHistory({ bookingsChecked: bookings.length, savingsFound, errors, duration: Date.now() - startTime, status: 'completed' });
}

export function getCheckHistory() {
  return { history: [...checkHistory], totalChecks: totalChecksRun, lastCheck: lastCheckTime };
}
