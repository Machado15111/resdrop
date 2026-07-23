// Shared currency helpers so every surface renders a booking in the currency it
// was actually saved in — never a hardcoded "R$".
export const CURRENCY_SYMBOLS = { BRL: 'R$', USD: '$', EUR: '€', GBP: '£' };

export function currencySymbol(currencyCode) {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode || '$';
}

export function formatCurrency(amount, currencyCode) {
  const symbol = currencySymbol(currencyCode);
  const locale = currencyCode === 'BRL' ? 'pt-BR' : 'en-US';
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${symbol}0`;
  return `${symbol}${n.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
