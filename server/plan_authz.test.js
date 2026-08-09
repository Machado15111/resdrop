import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLANS, planRank, isValidPlan, planChangeDecision, selfServiceEnabled } from './planAuthz.js';

// ─── Plan table sanity ───────────────────────────────────────

test('planRank: orders tiers by price, unknown plans rank below free', () => {
  assert.ok(planRank('premium') > planRank('viajante'));
  assert.ok(planRank('viajante') > planRank('free'));
  assert.equal(planRank('free'), 0);
  assert.equal(planRank('nonexistent'), -1);
  assert.equal(planRank(undefined), -1);
});

test('isValidPlan: only the three real tiers, and no prototype leakage', () => {
  assert.equal(isValidPlan('free'), true);
  assert.equal(isValidPlan('viajante'), true);
  assert.equal(isValidPlan('premium'), true);
  assert.equal(isValidPlan('enterprise'), false);
  // A plain `PLANS[plan]` check would have let these through.
  assert.equal(isValidPlan('constructor'), false);
  assert.equal(isValidPlan('toString'), false);
  assert.equal(isValidPlan('__proto__'), false);
});

// ─── The P0: a free user cannot buy themselves Premium ───────

test('self-upgrade is blocked with Stripe configured', () => {
  for (const target of ['viajante', 'premium']) {
    const d = planChangeDecision({
      currentPlan: 'free',
      requestedPlan: target,
      isAdmin: false,
      stripeEnabled: true,
      selfService: false,
    });
    assert.equal(d.allow, false, `${target} upgrade must be refused`);
    assert.equal(d.status, 402);
    assert.equal(d.code, 'UPGRADE_REQUIRES_CHECKOUT');
  }
});

test('mid-tier self-upgrade (viajante -> premium) is blocked too', () => {
  const d = planChangeDecision({
    currentPlan: 'viajante',
    requestedPlan: 'premium',
    stripeEnabled: true,
  });
  assert.equal(d.allow, false);
  assert.equal(d.code, 'UPGRADE_REQUIRES_CHECKOUT');
});

test('ALLOW_PLAN_SELF_SERVICE does NOT re-open the hole while Stripe is live', () => {
  const d = planChangeDecision({
    currentPlan: 'free',
    requestedPlan: 'premium',
    stripeEnabled: true,
    selfService: true, // dev flag left on by accident
  });
  assert.equal(d.allow, false, 'Stripe being wired must win over the dev flag');
  assert.equal(d.code, 'UPGRADE_REQUIRES_CHECKOUT');
});

test('upgrade is blocked by default even when Stripe is NOT configured', () => {
  const d = planChangeDecision({
    currentPlan: 'free',
    requestedPlan: 'premium',
    stripeEnabled: false,
    selfService: false,
  });
  assert.equal(d.allow, false);
  assert.equal(d.status, 402);
});

// ─── Downgrades and no-ops stay self-service ─────────────────

test('self-downgrade to free is allowed', () => {
  for (const from of ['viajante', 'premium']) {
    const d = planChangeDecision({ currentPlan: from, requestedPlan: 'free', stripeEnabled: true });
    assert.equal(d.allow, true, `${from} -> free must be allowed`);
  }
});

test('premium -> viajante downgrade is allowed', () => {
  const d = planChangeDecision({ currentPlan: 'premium', requestedPlan: 'viajante', stripeEnabled: true });
  assert.equal(d.allow, true);
});

test('no-op (same plan) is allowed', () => {
  const d = planChangeDecision({ currentPlan: 'premium', requestedPlan: 'premium', stripeEnabled: true });
  assert.equal(d.allow, true);
});

test('an unknown current plan is treated as free, so upgrades still need checkout', () => {
  const d = planChangeDecision({ currentPlan: undefined, requestedPlan: 'premium', stripeEnabled: true });
  assert.equal(d.allow, false);
  assert.equal(d.code, 'UPGRADE_REQUIRES_CHECKOUT');
});

// ─── Admin override ──────────────────────────────────────────

test('admin may set any tier (support comps and fixes)', () => {
  const d = planChangeDecision({
    currentPlan: 'free',
    requestedPlan: 'premium',
    isAdmin: true,
    stripeEnabled: true,
  });
  assert.equal(d.allow, true);
});

test('admin still cannot set a plan that does not exist', () => {
  const d = planChangeDecision({
    currentPlan: 'free',
    requestedPlan: 'unlimited',
    isAdmin: true,
    stripeEnabled: true,
  });
  assert.equal(d.allow, false);
  assert.equal(d.status, 400);
  assert.equal(d.code, 'INVALID_PLAN');
});

// ─── Dev escape hatch ────────────────────────────────────────

test('self-service flag allows a flag-flip only when billing is off', () => {
  const d = planChangeDecision({
    currentPlan: 'free',
    requestedPlan: 'premium',
    stripeEnabled: false,
    selfService: true,
  });
  assert.equal(d.allow, true);
});

test('selfServiceEnabled: strict "true" opt-in only', () => {
  assert.equal(selfServiceEnabled({ ALLOW_PLAN_SELF_SERVICE: 'true' }), true);
  assert.equal(selfServiceEnabled({ ALLOW_PLAN_SELF_SERVICE: 'True' }), false);
  assert.equal(selfServiceEnabled({ ALLOW_PLAN_SELF_SERVICE: '1' }), false);
  assert.equal(selfServiceEnabled({ ALLOW_PLAN_SELF_SERVICE: 'yes' }), false);
  assert.equal(selfServiceEnabled({}), false);
});

// ─── Plan table did not silently change ──────────────────────

test('plan limits are unchanged', () => {
  assert.equal(PLANS.free.bookingsPerMonth, 2);
  assert.equal(PLANS.viajante.bookingsPerMonth, 10);
  assert.equal(PLANS.premium.bookingsPerMonth, 50);
  assert.equal(PLANS.premium.price, 36);
  assert.equal(PLANS.premium.priceBrl, 125);
});
