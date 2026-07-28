/**
 * Centralized plan pricing. Prices are LOCALIZED per currency (not FX
 * conversions) and match what the UI shows (src/components/Account.jsx /
 * Pricing.jsx) and the server PLANS: Viajante = R$37 / $9, Premium = R$125 / $36.
 * Currency follows the user's selected ResDrop language: PT → BRL, EN → USD.
 * The server is the source of truth — never trust an amount from the client.
 */
export const PLAN_AMOUNTS = {
  free:     { BRL: 0,   USD: 0 },
  viajante: { BRL: 37,  USD: 9 },
  premium:  { BRL: 125, USD: 36 },
};

export function resolveBillingCurrency(lang) {
  return lang === 'pt' ? 'BRL' : 'USD';
}

export function planPrice(planId, lang) {
  const byCurrency = PLAN_AMOUNTS[planId];
  if (!byCurrency) return null;
  const currency = resolveBillingCurrency(lang);
  return { planId, currency, amount: byCurrency[currency] };
}

/** Reject a client currency that doesn't match the language's currency. */
export function currencyMatches(lang, clientCurrency) {
  if (clientCurrency == null) return true; // client may omit it
  return clientCurrency === resolveBillingCurrency(lang);
}
