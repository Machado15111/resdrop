/**
 * Stripe subscription billing. Gated on STRIPE_SECRET_KEY — every function is a
 * safe no-op / disabled when it's absent, so the app runs unchanged without it.
 *
 * The plan → recurring Price mapping comes from env (create the Prices in your
 * Stripe dashboard, set the ids). The server is the source of truth for what
 * gets charged; the client never sends an amount. See docs/STRIPE_SETUP.md.
 */
import Stripe from 'stripe';
import { resolveBillingCurrency } from './billing.js';

const SECRET = process.env.STRIPE_SECRET_KEY || '';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const PAID_PLANS = ['viajante', 'premium'];

let stripe = null;
if (SECRET) {
  stripe = new Stripe(SECRET);
  console.log('[Stripe] Billing configured ✓');
}

export function stripeConfigured() {
  return !!stripe;
}

/** plan + currency -> Stripe recurring Price id (from env), e.g. STRIPE_PRICE_PREMIUM_BRL */
export function priceIdFor(plan, currency) {
  const key = `STRIPE_PRICE_${String(plan).toUpperCase()}_${String(currency).toUpperCase()}`;
  return process.env[key] || null;
}

export async function createCheckoutSession({ email, plan, lang, origin }) {
  if (!stripe) throw new Error('Stripe not configured');
  if (!PAID_PLANS.includes(plan)) throw new Error('Not a paid plan');
  const currency = resolveBillingCurrency(lang);
  const price = priceIdFor(plan, currency);
  if (!price) throw new Error(`No Stripe price configured for ${plan}/${currency}`);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    customer_email: email,
    client_reference_id: email,
    allow_promotion_codes: true,
    // Email carried through so the webhook can map back to the account without a
    // stored customer id (avoids a Supabase schema change).
    metadata: { email, plan },
    subscription_data: { metadata: { email, plan } },
    success_url: `${origin}/account?billing=success`,
    cancel_url: `${origin}/account?billing=cancelled`,
  });
  return session.url;
}

export async function createPortalSession({ email, origin }) {
  if (!stripe) throw new Error('Stripe not configured');
  const customers = await stripe.customers.list({ email, limit: 1 });
  const customer = customers.data[0];
  if (!customer) throw new Error('No Stripe customer for this account');
  const session = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: `${origin}/account`,
  });
  return session.url;
}

/** Verify a webhook signature and return the parsed Stripe event (throws if invalid). */
export function constructWebhookEvent(rawBody, signature) {
  if (!stripe) throw new Error('Stripe not configured');
  if (!WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET not set');
  return stripe.webhooks.constructEvent(rawBody, signature, WEBHOOK_SECRET);
}

/**
 * Translate a Stripe event into a plan change: { email, plan } or null (pure —
 * unit-testable without hitting Stripe).
 *  - checkout completed / subscription active  -> set the paid plan
 *  - subscription canceled/unpaid/deleted       -> downgrade to 'free'
 */
export function planActionFromEvent(event) {
  if (!event || !event.type) return null;
  const obj = event.data?.object || {};
  switch (event.type) {
    case 'checkout.session.completed': {
      const email = obj.metadata?.email || obj.client_reference_id || obj.customer_email;
      const plan = obj.metadata?.plan;
      return email && plan ? { email, plan } : null;
    }
    case 'customer.subscription.updated': {
      const email = obj.metadata?.email;
      if (!email) return null;
      if (obj.status === 'active' || obj.status === 'trialing') {
        return obj.metadata?.plan ? { email, plan: obj.metadata.plan } : null;
      }
      if (obj.status === 'canceled' || obj.status === 'unpaid') {
        return { email, plan: 'free' };
      }
      return null;
    }
    case 'customer.subscription.deleted': {
      const email = obj.metadata?.email;
      return email ? { email, plan: 'free' } : null;
    }
    default:
      return null;
  }
}
