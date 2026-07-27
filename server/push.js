/**
 * Web Push (VAPID) sender. Gated on VAPID keys being configured; when they
 * aren't, every function is a safe no-op so the app runs unchanged. Keys live in
 * env only (VAPID_PRIVATE_KEY is secret); the public key is exposed via
 * /api/config so the browser can subscribe. See docs/PUSH_SETUP.md.
 */
import webpush from 'web-push';
import * as db from './db.js';

const PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:info@resdrop.app';

let configured = false;
if (PUBLIC && PRIVATE) {
  try {
    webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
    configured = true;
    console.log('[Push] Web Push configured ✓');
  } catch (e) {
    console.error('[Push] VAPID setup failed:', e.message);
  }
}

export function pushConfigured() { return configured; }
export function getVapidPublicKey() { return configured ? PUBLIC : null; }

/**
 * Send a Web Push notification to every device a user has subscribed. Prunes
 * subscriptions the push service reports as gone (404/410). Best-effort — never
 * throws into the caller.
 */
export async function sendPushToUser(email, payload) {
  if (!configured || !email) return;
  let subs = [];
  try {
    subs = await db.getPushSubscriptions(email);
  } catch {
    return;
  }
  if (!subs.length) return;
  const body = JSON.stringify(payload || {});
  await Promise.all(subs.map(async (s) => {
    const subscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
    try {
      await webpush.sendNotification(subscription, body);
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        db.deletePushSubscription(s.endpoint).catch(() => {});
      } else {
        console.error('[Push] send failed:', err.statusCode || err.message);
      }
    }
  }));
}
