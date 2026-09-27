/**
 * Running an availability check: the impure half of availability.js.
 *
 * The decisions live next door as pure functions; what happens here is the
 * rate search, the write, and the notification. Dependencies are injected so
 * the scheduler, the "check now" route and the tests all drive the same code
 * path — the price monitor's equivalent logic lived inline in two places and
 * drifted.
 */

import * as db from './db.js';
import { applyWatchResult, watchConfig, watchToSearchInput } from './availability.js';
import { sendAvailabilityAlert } from './email.js';
import { sendPushToUser } from './push.js';

/**
 * Tell the traveller a room opened. Email is the record; push is the nudge.
 * Neither may fail the check — the watch state is already saved by the time we
 * get here, and a bounced email must not make us re-alert on the next cycle.
 */
export async function notifyAvailability(watch, { email = sendAvailabilityAlert, push = sendPushToUser } = {}) {
  let user = null;
  try {
    user = await db.getUser(watch.email);
  } catch (e) {
    console.error('[Availability] could not load user for alert:', e.message);
  }

  const name = user?.name || '';
  const results = await Promise.allSettled([
    email(watch.email, name, watch, user || {}),
    push(watch.email, {
      title: user?.lang === 'en' ? 'A room opened up' : 'Abriu um quarto',
      body: `${watch.hotelName} — ${watch.checkinDate} → ${watch.checkoutDate}`,
      url: '/watches',
      tag: `watch-${watch.id}`,
    }),
  ]);

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[Availability] ${i === 0 ? 'email' : 'push'} failed for watch ${watch.id}: ${r.reason?.message || r.reason}`);
    }
  });

  return { emailed: results[0].status === 'fulfilled', pushed: results[1].status === 'fulfilled' };
}

/**
 * One check of one watch: search, fold the result in, persist, and notify only
 * on the edge from sold out to available.
 *
 * The write happens BEFORE the notification on purpose. If sending throws, the
 * watch is already marked available and notified_at is already set, so the next
 * cycle sees "still_available" and stays quiet rather than retrying the alert
 * every two hours.
 */
export async function checkWatch(watch, {
  searchPrices,
  cfg = watchConfig(),
  now = Date.now(),
  notify = notifyAvailability,
  update = db.updateAvailabilityWatch,
} = {}) {
  let results = [];
  let searchFailed = false;
  try {
    results = await searchPrices(watchToSearchInput(watch), { currency: watch.currency });
  } catch (err) {
    searchFailed = true;
    console.error(`[Availability] search failed for "${watch.hotelName}": ${err.message}`);
  }

  // A failed search is not evidence of a sold-out hotel. Record the attempt so
  // the cadence still advances, but leave the availability state and the
  // empty-streak counter untouched — otherwise an API outage would quietly
  // flag every watch as "we cannot find this hotel".
  if (searchFailed) {
    const updates = { lastChecked: new Date(now).toISOString(), checkCount: (watch.checkCount || 0) + 1 };
    const saved = await update(watch.id, updates);
    return { watch: saved || { ...watch, ...updates }, alert: false, transition: 'search_failed', offerCount: 0 };
  }

  const { updates, alert, transition } = applyWatchResult(watch, results, { cfg, now });
  const saved = await update(watch.id, updates);
  const current = saved || { ...watch, ...updates };

  if (alert) {
    await notify(current);
  }

  return { watch: current, alert, transition, offerCount: updates.lastOfferCount || 0 };
}
