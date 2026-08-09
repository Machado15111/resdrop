import { Router } from 'express';
import * as db from '../db.js';
import {
  stripeConfigured, createCheckoutSession, createPortalSession,
  constructWebhookEvent, planActionFromEvent,
} from '../stripe.js';
import { PLANS, planChangeDecision, selfServiceEnabled } from '../planAuthz.js';
import { isAdminEmail } from '../admins.js';

/**
 * Stripe checkout, the billing portal, the webhook, and plan changes.
 *
 * Extracted from index.js verbatim — same paths, same middleware chains, same
 * handler bodies.
 *
 * The webhook is deliberately unauthenticated: it is verified by its Stripe
 * signature over the RAW body, which index.js stashes as req.rawBody in the
 * express.json verify hook. It is also the ONLY path that may raise a user's
 * tier — see planAuthz.js.
 */
export default function billingRoutes(authMiddleware) {
  const router = Router();

  // ─── Billing (Stripe subscriptions) ─────────────────────────
  router.post('/billing/checkout', authMiddleware, async (req, res) => {
    if (!stripeConfigured()) return res.status(503).json({ error: 'Billing not enabled' });
    try {
      const { plan, currency, interval } = req.body || {};
      const origin = process.env.PUBLIC_ORIGIN || req.headers.origin || 'https://resdrop.app';
      const url = await createCheckoutSession({
        email: req.userEmail,
        plan,
        currency: currency || 'USD',
        interval: interval || 'month',
        origin,
      });
      res.json({ url });
    } catch (err) {
      console.error('[Billing] checkout:', err.message);
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/billing/portal', authMiddleware, async (req, res) => {
    if (!stripeConfigured()) return res.status(503).json({ error: 'Billing not enabled' });
    try {
      const origin = process.env.PUBLIC_ORIGIN || req.headers.origin || 'https://resdrop.app';
      const url = await createPortalSession({ email: req.userEmail, origin });
      res.json({ url });
    } catch (err) {
      console.error('[Billing] portal:', err.message);
      res.status(400).json({ error: err.message });
    }
  });

  // Stripe webhook (public — verified by signature, not auth). Uses the raw body.
  router.post('/stripe/webhook', async (req, res) => {
    if (!stripeConfigured()) return res.status(503).end();
    let event;
    try {
      event = constructWebhookEvent(req.rawBody, req.headers['stripe-signature']);
    } catch (err) {
      console.error('[Stripe] webhook signature failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    try {
      const action = planActionFromEvent(event);
      if (action?.email && action.plan) {
        await db.updateUser(action.email, { plan: action.plan });
        console.log(`[Stripe] ${event.type} → ${action.email} plan=${action.plan}`);
      }
    } catch (err) {
      console.error('[Stripe] webhook handling error:', err.message);
      // Still 200 so Stripe doesn't retry a non-signature error forever.
    }
    res.json({ received: true });
  });

  /**
   * Change the caller's own plan.
   *
   * This route can only ever LOWER a tier (or leave it unchanged). Raising a tier
   * requires money to move first: POST /api/billing/checkout → Stripe Checkout →
   * the signature-verified webhook at /api/stripe/webhook writes the new plan.
   * Without that rule any authenticated user could grant themselves Premium for
   * free, since the self-ownership check below passes for one's own account.
   * See planAuthz.js for the decision table.
   */
  router.put('/users/:email/plan', authMiddleware, async (req, res) => {
    if (req.params.email.toLowerCase() !== req.userEmail) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { plan, lang, currency } = req.body;

    const decision = planChangeDecision({
      currentPlan: req.user?.plan,
      requestedPlan: plan,
      isAdmin: isAdminEmail(req.userEmail),
      stripeEnabled: stripeConfigured(),
      selfService: selfServiceEnabled(),
    });

    if (!decision.allow) {
      if (decision.code === 'INVALID_PLAN') {
        return res.status(400).json({ error: 'Plano invalido', code: decision.code });
      }
      return res.status(decision.status).json({
        error: decision.reason,
        code: decision.code,
        checkoutUrl: '/api/billing/checkout',
      });
    }

    // Currency is resolved server-side from the account language; never trust an amount.
    const billingCurrency = lang === 'pt' ? 'BRL' : 'USD';
    if (currency && currency !== billingCurrency) {
      return res.status(400).json({ error: 'Currency mismatch', expected: billingCurrency });
    }
    const planInfo = PLANS[plan];
    const updated = await db.updateUser(req.userEmail, { plan, billingCurrency });
    res.json({ ...updated, planLimit: planInfo.bookingsPerMonth, currency: billingCurrency, amount: planInfo.price });
  });

  return router;
}
