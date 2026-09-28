/**
 * Plan definitions and the authorization rules for changing a plan.
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * `PUT /api/users/:email/plan` used to accept any plan from any authenticated
 * user for their own account. Because the caller *is* the owner, the existing
 * self-ownership check passed, so anyone with a free account could POST
 * `{"plan":"premium"}` and grant themselves the 50-bookings/month tier without
 * ever touching Stripe. The only legitimate way for a tier to go UP is the
 * signature-verified Stripe webhook.
 *
 * The decision is a pure function so the rule can be unit-tested without HTTP.
 */

// price/priceBrl (USD/BRL monthly) exist only for planRank()'s ordering below —
// nothing here is shown to users. The real, displayed prices live in
// server/billing.js (mirrored in src/pricing.js), which is what Stripe
// actually charges; keep these two in sync with that, not the other way round.
export const PLANS = {
  free:     { bookingsPerMonth: 2,  searchesPerDay: 1,   activeWatches: 1,  price: 0,  priceBrl: 0 },
  viajante: { bookingsPerMonth: 10, searchesPerDay: 50,  activeWatches: 5,  price: 8,  priceBrl: 23 },
  premium:  { bookingsPerMonth: 50, searchesPerDay: 200, activeWatches: 20, price: 25, priceBrl: 109 },
};

/**
 * How many availability watches a plan may keep running at once.
 *
 * This is a cost limit, not a feature gate: an active watch costs a rate search
 * every 1-2 hours for as long as it lives, which is far more API spend per
 * month than a booking's daily price check. An unknown plan falls back to the
 * free allowance rather than to unlimited.
 */
export function watchLimitFor(plan) {
  return (PLANS[plan] || PLANS.free).activeWatches;
}

/**
 * Tier ordering. Derived from price so it can never drift out of sync with
 * PLANS: a higher price is a higher tier.
 */
export function planRank(plan) {
  const info = PLANS[plan];
  if (!info) return -1;
  return info.price;
}

export function isValidPlan(plan) {
  return Object.prototype.hasOwnProperty.call(PLANS, plan);
}

/**
 * Is self-service plan flipping allowed at all? Only when billing isn't wired
 * (local dev / preview) AND the operator has explicitly opted in. Defaults to
 * false so it can never be silently on in production.
 */
export function selfServiceEnabled(env = process.env) {
  return env.ALLOW_PLAN_SELF_SERVICE === 'true';
}

/**
 * Decide whether a plan change may be applied directly.
 *
 * @param {object}  args
 * @param {string}  args.currentPlan     the plan the account holds today
 * @param {string}  args.requestedPlan   the plan being asked for
 * @param {boolean} args.isAdmin         caller is an admin (ADMIN_EMAILS)
 * @param {boolean} args.stripeEnabled   stripeConfigured()
 * @param {boolean} args.selfService     selfServiceEnabled()
 * @returns {{allow: boolean, status?: number, code?: string, reason?: string}}
 */
export function planChangeDecision({
  currentPlan,
  requestedPlan,
  isAdmin = false,
  stripeEnabled = false,
  selfService = false,
}) {
  if (!isValidPlan(requestedPlan)) {
    return { allow: false, status: 400, code: 'INVALID_PLAN', reason: 'Unknown plan' };
  }

  // Admins can set any tier — support needs to comp, refund and fix accounts.
  if (isAdmin) return { allow: true };

  const from = planRank(isValidPlan(currentPlan) ? currentPlan : 'free');
  const to = planRank(requestedPlan);

  // Downgrades and no-ops are always the user's own call: they only ever reduce
  // what we owe them. (A real Stripe subscription is cancelled through the
  // billing portal; this just keeps the flag honest.)
  if (to <= from) return { allow: true };

  // Upgrade. With billing wired, money must move first — Checkout, then the
  // webhook raises the tier.
  if (stripeEnabled) {
    return {
      allow: false,
      status: 402,
      code: 'UPGRADE_REQUIRES_CHECKOUT',
      reason: 'Paid plans must be purchased through Stripe Checkout',
    };
  }

  // Billing not configured. Allow the legacy flag-flip ONLY behind an explicit
  // opt-in, so a production deploy that loses its Stripe keys does not silently
  // start handing out free upgrades.
  if (selfService) return { allow: true };

  return {
    allow: false,
    status: 402,
    code: 'UPGRADE_REQUIRES_CHECKOUT',
    reason: 'Billing is not enabled on this deployment',
  };
}
