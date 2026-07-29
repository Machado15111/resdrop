// Frontend mirror of server/billing.js (display only — the real charge comes
// from the matching Stripe Price). Monthly + yearly; yearly = 10x monthly
// (2 months free) across every plan/currency.
export const SUPPORTED_CURRENCIES = ['BRL', 'USD', 'EUR'];
export const CURRENCY_SYMBOL = { BRL: 'R$', USD: '$', EUR: '€' };

export const PLAN_PRICES = {
  free:     { BRL: { month: 0, year: 0 },   USD: { month: 0, year: 0 },   EUR: { month: 0, year: 0 } },
  viajante: { BRL: { month: 23, year: 230 }, USD: { month: 8, year: 80 },  EUR: { month: 7, year: 70 } },
  premium:  { BRL: { month: 109, year: 1090 }, USD: { month: 25, year: 250 }, EUR: { month: 23, year: 230 } },
};

export function defaultCurrency(lang) {
  return lang === 'pt' ? 'BRL' : 'USD';
}

export function planAmount(planId, currency, interval) {
  const p = PLAN_PRICES[planId]?.[currency];
  if (!p) return null;
  return p[interval === 'year' ? 'year' : 'month'];
}

// Yearly savings vs 12x monthly, for "2 months free" style messaging.
export function yearlySavings(planId, currency) {
  const p = PLAN_PRICES[planId]?.[currency];
  if (!p || !p.month) return null;
  const twelve = p.month * 12;
  return {
    monthsFree: Math.round((twelve - p.year) / p.month),
    percent: Math.round(((twelve - p.year) / twelve) * 100),
  };
}
