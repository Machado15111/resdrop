/**
 * Price Monitoring Scheduler
 *
 * Runs automated price checks 2-3 times per day for all active bookings.
 * Schedule configurable via MONITOR_CHECK_HOURS in .env
 *
 * Default schedule: 06:00, 14:00, 22:00 (3x daily)
 */

function env(key, fallback = '') {
  return process.env[key] || fallback;
}

// Scheduler state
let schedulerInterval = null;
let lastCheckTime = null;
let totalChecksRun = 0;
let checkHistory = [];
const MAX_HISTORY = 100;

/**
 * Get configured check hours
 */
function getCheckHours() {
  const hoursStr = env('MONITOR_CHECK_HOURS', '06,14,22');
  return hoursStr.split(',').map(h => parseInt(h.trim(), 10)).filter(h => !isNaN(h));
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus() {
  const checkHours = getCheckHours();
  const now = new Date();
  const currentHour = now.getHours();

  // Find next check time
  let nextCheckHour = checkHours.find(h => h > currentHour);
  if (!nextCheckHour) nextCheckHour = checkHours[0]; // Wrap to next day

  const nextCheck = new Date(now);
  if (nextCheckHour <= currentHour) {
    nextCheck.setDate(nextCheck.getDate() + 1);
  }
  nextCheck.setHours(nextCheckHour, 0, 0, 0);

  return {
    running: !!schedulerInterval,
    checksPerDay: checkHours.length,
    checkHours: checkHours.map(h => `${String(h).padStart(2, '0')}:00`),
    lastCheck: lastCheckTime,
    nextCheck: nextCheck.toISOString(),
    totalChecksRun,
    recentHistory: checkHistory.slice(-20),
  };
}

/**
 * Run a price check cycle for all bookings
 */
async function runPriceCheckCycle(bookingsMap, searchPricesFn, applyBestResultFn) {
  const startTime = Date.now();
  const bookings = Array.from(bookingsMap.values()).filter(
    b => b.status === 'monitoring' || b.status === 'savings_found'
  );

  if (bookings.length === 0) {
    const entry = {
      timestamp: new Date().toISOString(),
      bookingsChecked: 0,
      savingsFound: 0,
      duration: 0,
      status: 'no_bookings',
    };
    checkHistory.push(entry);
    if (checkHistory.length > MAX_HISTORY) checkHistory.shift();
    return entry;
  }

  console.log(`\n[Scheduler] 🔄 Starting price check cycle for ${bookings.length} bookings...`);

  let savingsFoundCount = 0;
  let errorsCount = 0;
  let totalNewSavings = 0;

  for (const booking of bookings) {
    try {
      const previousBest = booking.bestPrice;
      const results = await searchPricesFn(booking);
      applyBestResultFn(booking, results);

      if (booking.bestPrice && (!previousBest || booking.bestPrice < previousBest)) {
        savingsFoundCount++;
        totalNewSavings += booking.totalSavings;
        console.log(`[Scheduler] 💰 New savings for "${booking.hotelName}": $${booking.totalSavings}`);
      }

      // Rate limiting: wait 500ms between checks
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      errorsCount++;
      console.error(`[Scheduler] Error checking "${booking.hotelName}": ${err.message}`);
    }
  }

  const duration = Date.now() - startTime;
  lastCheckTime = new Date().toISOString();
  totalChecksRun++;

  const entry = {
    timestamp: lastCheckTime,
    bookingsChecked: bookings.length,
    savingsFound: savingsFoundCount,
    totalNewSavings: Math.round(totalNewSavings * 100) / 100,
    errors: errorsCount,
    duration,
    status: 'completed',
  };

  checkHistory.push(entry);
  if (checkHistory.length > MAX_HISTORY) checkHistory.shift();

  console.log(`[Scheduler] ✅ Cycle complete: ${bookings.length} checked, ${savingsFoundCount} savings found, ${errorsCount} errors (${duration}ms)\n`);

  return entry;
}

/**
 * Start the automated price monitoring scheduler
 */
export function startScheduler(bookingsMap, searchPricesFn, applyBestResultFn) {
  if (schedulerInterval) {
    console.log('[Scheduler] Already running');
    return;
  }

  const checkHours = getCheckHours();
  console.log(`[Scheduler] 🕐 Starting scheduler — ${checkHours.length}x daily at: ${checkHours.map(h => `${String(h).padStart(2, '0')}:00`).join(', ')}`);

  // Check every minute if it's time to run
  let lastRunHour = -1;
  let lastRunDate = '';

  schedulerInterval = setInterval(async () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDate = now.toISOString().split('T')[0];

    // Only run if current hour matches a check hour AND we haven't run this hour today
    if (
      checkHours.includes(currentHour) &&
      (lastRunHour !== currentHour || lastRunDate !== currentDate)
    ) {
      lastRunHour = currentHour;
      lastRunDate = currentDate;
      await runPriceCheckCycle(bookingsMap, searchPricesFn, applyBestResultFn);
    }
  }, 60 * 1000); // Check every minute

  // Also run an initial check on startup (after 10 seconds)
  setTimeout(async () => {
    console.log('[Scheduler] Running initial price check...');
    await runPriceCheckCycle(bookingsMap, searchPricesFn, applyBestResultFn);
  }, 10000);
}

/**
 * Stop the scheduler
 */
export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Scheduler] Stopped');
  }
}

/**
 * Manually trigger a price check cycle
 */
export async function manualCheck(bookingsMap, searchPricesFn, applyBestResultFn) {
  return runPriceCheckCycle(bookingsMap, searchPricesFn, applyBestResultFn);
}

/**
 * Get check history for admin dashboard
 */
export function getCheckHistory() {
  return {
    history: [...checkHistory],
    totalChecks: totalChecksRun,
    lastCheck: lastCheckTime,
  };
}
