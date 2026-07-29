import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveBillingCurrency, planPrice, isSupportedCurrency, yearlySavings } from './billing.js';

test('resolveBillingCurrency: PT -> BRL, EN -> USD', () => {
  assert.equal(resolveBillingCurrency('pt'), 'BRL');
  assert.equal(resolveBillingCurrency('en'), 'USD');
});

test('isSupportedCurrency: BRL/USD/EUR yes, others no', () => {
  assert.equal(isSupportedCurrency('BRL'), true);
  assert.equal(isSupportedCurrency('USD'), true);
  assert.equal(isSupportedCurrency('EUR'), true);
  assert.equal(isSupportedCurrency('GBP'), false);
});

test('planPrice: localized amount per currency + interval', () => {
  assert.deepEqual(planPrice('viajante', 'BRL', 'month'), { planId: 'viajante', currency: 'BRL', interval: 'month', amount: 23 });
  assert.deepEqual(planPrice('viajante', 'USD', 'year'),  { planId: 'viajante', currency: 'USD', interval: 'year',  amount: 80 });
  assert.deepEqual(planPrice('viajante', 'EUR', 'month'), { planId: 'viajante', currency: 'EUR', interval: 'month', amount: 7 });
  assert.deepEqual(planPrice('premium', 'BRL', 'year'),   { planId: 'premium', currency: 'BRL', interval: 'year',  amount: 1090 });
  assert.deepEqual(planPrice('premium', 'EUR', 'month'),  { planId: 'premium', currency: 'EUR', interval: 'month', amount: 23 });
});

test('planPrice: defaults interval to month, unknown currency to USD', () => {
  assert.equal(planPrice('premium', 'USD').interval, 'month');
  assert.equal(planPrice('premium', 'GBP', 'month').currency, 'USD');
});

test('yearlySavings: every paid plan/currency is 2 months free (~17%)', () => {
  for (const plan of ['viajante', 'premium']) {
    for (const cur of ['BRL', 'USD', 'EUR']) {
      const s = yearlySavings(plan, cur);
      assert.equal(s.monthsFree, 2, `${plan}/${cur} months free`);
      assert.equal(s.percent, 17, `${plan}/${cur} percent`);
    }
  }
});
