import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveBillingCurrency, planPrice, currencyMatches, PLAN_AMOUNTS } from './billing.js';

test('PT resolves BRL, EN resolves USD', () => {
  assert.equal(resolveBillingCurrency('pt'), 'BRL');
  assert.equal(resolveBillingCurrency('en'), 'USD');
});

test('planPrice returns the localized amount per language', () => {
  assert.deepEqual(planPrice('viajante', 'pt'), { planId: 'viajante', currency: 'BRL', amount: 37 });
  assert.deepEqual(planPrice('viajante', 'en'), { planId: 'viajante', currency: 'USD', amount: 9 });
  assert.deepEqual(planPrice('premium', 'pt'), { planId: 'premium', currency: 'BRL', amount: 125 });
  assert.deepEqual(planPrice('premium', 'en'), { planId: 'premium', currency: 'USD', amount: 36 });
  assert.equal(planPrice('premium', 'en').amount, PLAN_AMOUNTS.premium.USD);
});

test('PT never USD, EN never BRL', () => {
  assert.notEqual(resolveBillingCurrency('pt'), 'USD');
  assert.notEqual(resolveBillingCurrency('en'), 'BRL');
});

test('backend rejects a mismatched currency', () => {
  assert.equal(currencyMatches('pt', 'USD'), false); // PT checkout must not be USD
  assert.equal(currencyMatches('en', 'BRL'), false); // EN checkout must not be BRL
  assert.equal(currencyMatches('pt', 'BRL'), true);
  assert.equal(currencyMatches('en', 'USD'), true);
  assert.equal(currencyMatches('en', null), true);  // omitted is allowed
});
