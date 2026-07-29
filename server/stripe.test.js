import test from 'node:test';
import assert from 'node:assert/strict';
import { planActionFromEvent, priceIdFor } from './stripe.js';

test('planActionFromEvent: checkout completed sets the paid plan', () => {
  const ev = { type: 'checkout.session.completed', data: { object: { metadata: { email: 'a@b.com', plan: 'premium' } } } };
  assert.deepEqual(planActionFromEvent(ev), { email: 'a@b.com', plan: 'premium' });
});

test('planActionFromEvent: falls back to client_reference_id / customer_email for email', () => {
  const ev = { type: 'checkout.session.completed', data: { object: { client_reference_id: 'c@d.com', metadata: { plan: 'viajante' } } } };
  assert.deepEqual(planActionFromEvent(ev), { email: 'c@d.com', plan: 'viajante' });
});

test('planActionFromEvent: subscription deleted downgrades to free', () => {
  const ev = { type: 'customer.subscription.deleted', data: { object: { metadata: { email: 'a@b.com', plan: 'premium' } } } };
  assert.deepEqual(planActionFromEvent(ev), { email: 'a@b.com', plan: 'free' });
});

test('planActionFromEvent: subscription updated — active keeps plan, canceled -> free, transient -> null', () => {
  const active = { type: 'customer.subscription.updated', data: { object: { status: 'active', metadata: { email: 'a@b.com', plan: 'premium' } } } };
  assert.deepEqual(planActionFromEvent(active), { email: 'a@b.com', plan: 'premium' });
  const canceled = { type: 'customer.subscription.updated', data: { object: { status: 'canceled', metadata: { email: 'a@b.com', plan: 'premium' } } } };
  assert.deepEqual(planActionFromEvent(canceled), { email: 'a@b.com', plan: 'free' });
  const pastDue = { type: 'customer.subscription.updated', data: { object: { status: 'past_due', metadata: { email: 'a@b.com', plan: 'premium' } } } };
  assert.equal(planActionFromEvent(pastDue), null);
});

test('planActionFromEvent: unknown / malformed events -> null', () => {
  assert.equal(planActionFromEvent({ type: 'invoice.paid', data: { object: {} } }), null);
  assert.equal(planActionFromEvent(null), null);
  assert.equal(planActionFromEvent({}), null);
});

test('priceIdFor: resolves env var by plan+currency+interval (defaults to month)', () => {
  process.env.STRIPE_PRICE_PREMIUM_BRL_MONTH = 'price_m';
  process.env.STRIPE_PRICE_PREMIUM_BRL_YEAR = 'price_y';
  assert.equal(priceIdFor('premium', 'BRL'), 'price_m');          // defaults to month
  assert.equal(priceIdFor('premium', 'brl', 'month'), 'price_m'); // case-insensitive
  assert.equal(priceIdFor('premium', 'BRL', 'year'), 'price_y');
  delete process.env.STRIPE_PRICE_PREMIUM_BRL_MONTH;
  delete process.env.STRIPE_PRICE_PREMIUM_BRL_YEAR;
  assert.equal(priceIdFor('viajante', 'USD', 'month'), null);
});
