/**
 * Plan pricing — localized per currency (not FX conversions), monthly + yearly.
 * Yearly is priced at 10x monthly (2 months free) across every plan/currency.
 * These are the DISPLAY amounts; the actual charge comes from the matching
 * Stripe Price (STRIPE_PRICE_{PLAN}_{CURRENCY}_{MONTH|YEAR}) created in the
 * Stripe dashboard. The server is the source of truth — never trust a
 * client-sent amount.
 */
export const SUPPORTED_CURRENCIES = ['BRL', 'USD', 'EUR'];
export const BILLING_INTERVALS = ['month', 'year'];
export const CURRENCY_SYMBOL = { BRL: 'R$', USD: '$', EUR: '€' };

export const PLAN_PRICES = {
  free: {
    BRL: { month: 0, year: 0 }, USD: { month: 0, year: 0 }, EUR: { month: 0, year: 0 },
  },
  viajante: {
    BRL: { month: 23, year: 230 }, USD: { month: 8, year: 80 }, EUR: { month: 7, year: 70 },
  },
  premium: {
    BRL: { month: 109, year: 1090 }, USD: { month: 25, year: 250 }, EUR: { month: 23, year: 230 },
  },
};

export function resolveBillingCurrency(lang) {
  return lang === 'pt' ? 'BRL' : 'USD';
}

export function isSupportedCurrency(c) {
  return SUPPORTED_CURRENCIES.includes(c);
}

export function normalizeInterval(interval) {
  return interval === 'year' ? 'year' : 'month';
}

export function planPrice(planId, currency, interval = 'month') {
  const byCur = PLAN_PRICES[planId];
  if (!byCur) return null;
  const cur = isSupportedCurrency(currency) ? currency : 'USD';
  const iv = normalizeInterval(interval);
  return { planId, currency: cur, interval: iv, amount: byCur[cur][iv] };
}

/** Yearly savings vs 12x monthly, for "2 months free" style messaging. */
export function yearlySavings(planId, currency) {
  const p = PLAN_PRICES[planId]?.[isSupportedCurrency(currency) ? currency : 'USD'];
  if (!p || !p.month) return null;
  const twelveMonths = p.month * 12;
  const saved = twelveMonths - p.year;
  const monthsFree = Math.round(saved / p.month);
  const percent = Math.round((saved / twelveMonths) * 100);
  return { saved, monthsFree, percent };
}
