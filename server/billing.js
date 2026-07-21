/**
 * Centralized plan pricing. Amounts are the SAME number per plan; only the
 * currency differs by the user's selected ResDrop language (no conversion).
 * PT → BRL, EN → USD. (EUR handled later.)
 * The server is the source of truth — never trust an amount from the client.
 */
export const PLAN_AMOUNTS = { free: 0, viajante: 25, premium: 100 };

export function resolveBillingCurrency(lang) {
  return lang === 'pt' ? 'BRL' : 'USD';
}

export function planPrice(planId, lang) {
  const amount = PLAN_AMOUNTS[planId];
  if (amount == null) return null;
  return { planId, currency: resolveBillingCurrency(lang), amount };
}

/** Reject a client currency that doesn't match the language's currency. */
export function currencyMatches(lang, clientCurrency) {
  if (clientCurrency == null) return true; // client may omit it
  return clientCurrency === resolveBillingCurrency(lang);
}
