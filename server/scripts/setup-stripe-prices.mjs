/**
 * One-shot Stripe setup for ResDrop plans. YOU run this with YOUR key — it never
 * leaves your machine and no secret is printed. It creates 2 products + 12
 * recurring Prices (Viajante/Premium x BRL/USD/EUR x monthly/yearly) and prints
 * the STRIPE_PRICE_* env lines to paste into Railway. Safe to re-run (idempotent:
 * it reuses a product/price that already matches).
 *
 * Usage (from the server/ folder):
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe-prices.mjs
 * Use sk_test_ first to verify, then sk_live_ for real.
 */
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('Set STRIPE_SECRET_KEY (sk_test_… or sk_live_…) and re-run.');
  process.exit(1);
}
const mode = key.startsWith('sk_live') ? 'LIVE' : 'TEST';
console.log(`\nStripe mode: ${mode}\n`);
const stripe = new Stripe(key);

// Amounts in major units (the script multiplies by 100). Yearly = 10x monthly.
const PLANS = {
  viajante: { name: 'ResDrop Viajante', prices: { BRL: { month: 23, year: 230 }, USD: { month: 8, year: 80 }, EUR: { month: 7, year: 70 } } },
  premium:  { name: 'ResDrop Premium',  prices: { BRL: { month: 109, year: 1090 }, USD: { month: 25, year: 250 }, EUR: { month: 23, year: 230 } } },
};

async function findOrCreateProduct(name) {
  const existing = await stripe.products.list({ active: true, limit: 100 });
  const match = existing.data.find(p => p.name === name);
  if (match) return match;
  return stripe.products.create({ name });
}

async function findOrCreatePrice(productId, currency, interval, amountMajor) {
  const unit = Math.round(amountMajor * 100);
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const match = prices.data.find(p =>
    p.currency === currency.toLowerCase() &&
    p.unit_amount === unit &&
    p.recurring?.interval === interval
  );
  if (match) return match;
  return stripe.prices.create({
    product: productId,
    currency: currency.toLowerCase(),
    unit_amount: unit,
    recurring: { interval },
  });
}

const envLines = [];
for (const [planId, plan] of Object.entries(PLANS)) {
  const product = await findOrCreateProduct(plan.name);
  for (const [currency, byInterval] of Object.entries(plan.prices)) {
    for (const [interval, amount] of Object.entries(byInterval)) {
      const price = await findOrCreatePrice(product.id, currency, interval, amount);
      const envName = `STRIPE_PRICE_${planId.toUpperCase()}_${currency}_${interval.toUpperCase()}`;
      envLines.push(`${envName}=${price.id}`);
      console.log(`✓ ${envName}  (${currency} ${amount}/${interval})`);
    }
  }
}

console.log('\n=== Paste these 12 lines into Railway → Variables ===\n');
console.log(envLines.join('\n'));
console.log('\nThen add the webhook (docs/STRIPE_SETUP.md §3) and set STRIPE_WEBHOOK_SECRET.\n');
