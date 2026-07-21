import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPriceIndexService, effectiveCap, monthKey, PER_USER_MONTHLY_CAP } from './priceIndex.js';

function makeStore() {
  const global = {};   // month -> { calls, cost }
  const userViews = {}; // `${month}:${email}` -> n
  const cache = {};     // key -> { response, expires }
  return {
    _global: global, _cache: cache, _userViews: userViews,
    async getFreshCache(key) { const c = cache[key]; return c && c.expires > Date.now() ? c.response : null; },
    async putCache(key, ids, resp, expiresAt) { cache[key] = { response: resp, expires: new Date(expiresAt).getTime() }; },
    async tryConsumeGlobal(month, cap, cost) {
      const g = global[month] || { calls: 0, cost: 0 };
      global[month] = g;
      if (g.calls >= cap) return null;      // atomic guard
      g.calls++; g.cost += cost; return g.calls;
    },
    async refundGlobal(month, cost) { const g = global[month]; if (g) { g.calls = Math.max(0, g.calls - 1); g.cost = Math.max(0, g.cost - cost); } },
    async getUserViews(month, email) { return userViews[`${month}:${email}`] || 0; },
    async bumpUserViews(month, email) { const k = `${month}:${email}`; userViews[k] = (userViews[k] || 0) + 1; return userViews[k]; },
  };
}

const cfg = (over = {}) => () => ({ enabled: true, envCap: 50, costUsd: 0.05, cacheHours: 24, ...over });
const paid = { email: 'a@b.com', plan: 'premium' };
const free = { email: 'f@b.com', plan: 'free' };
const req = { hotelIds: ['lp1', 'lp2'], checkin: '2027-01-20', checkout: '2027-01-23', currency: 'USD' };

function svc(store, over = {}, onCall = async () => ({ ok: true })) {
  let calls = 0;
  const callPriceIndex = async (a) => { calls++; return onCall(a); };
  const service = createPriceIndexService({ store, callPriceIndex, config: cfg(over.config), adminCap: over.adminCap || (() => null) });
  return { service, calls: () => calls };
}

test('disabled: no paid call, returns disabled', async () => {
  const store = makeStore();
  const { service, calls } = svc(store, { config: { enabled: false } });
  const r = await service.getPriceTrends({ user: paid, ...req });
  assert.equal(r.status, 'disabled');
  assert.equal(calls(), 0);
  assert.deepEqual(store._global, {});
});

test('free user: locked, never calls provider or consumes global', async () => {
  const store = makeStore();
  const { service, calls } = svc(store);
  const r = await service.getPriceTrends({ user: free, ...req });
  assert.equal(r.status, 'locked');
  assert.equal(calls(), 0);
  assert.deepEqual(store._global, {});
});

test('paid live call: ok, consumes exactly one global slot, caches', async () => {
  const store = makeStore();
  const { service, calls } = svc(store);
  const r = await service.getPriceTrends({ user: paid, ...req });
  assert.equal(r.status, 'ok');
  assert.equal(calls(), 1);
  assert.equal(store._global[monthKey()].calls, 1);
});

test('cache hit: no provider call, global unchanged', async () => {
  const store = makeStore();
  const { service, calls } = svc(store);
  await service.getPriceTrends({ user: paid, ...req });           // live -> caches
  const before = store._global[monthKey()].calls;
  const r = await service.getPriceTrends({ user: paid, ...req }); // identical -> cache
  assert.equal(r.status, 'cached');
  assert.equal(calls(), 1);                                       // still just the first
  assert.equal(store._global[monthKey()].calls, before);         // global not consumed
});

test('global cap: concurrent requests never exceed the cap', async () => {
  const store = makeStore();
  const { service, calls } = svc(store, { config: { enabled: true, envCap: 2, costUsd: 0.05, cacheHours: 24 } });
  // distinct cache keys so each attempt tries a real call
  const reqs = Array.from({ length: 6 }, (_, i) => ({ user: paid, hotelIds: [`h${i}`], checkin: '2027-01-20', checkout: '2027-01-23', currency: 'USD' }));
  const out = await Promise.all(reqs.map(r => service.getPriceTrends(r)));
  assert.equal(calls(), 2);                                       // hard cap honored
  assert.equal(out.filter(o => o.status === 'ok').length, 2);
  assert.equal(out.filter(o => o.status === 'global_quota').length, 4);
  assert.ok(store._global[monthKey()].calls <= 2);
});

test('per-user cap: blocks at 50 views without a provider call', async () => {
  const store = makeStore();
  const m = monthKey();
  store._userViews[`${m}:${paid.email}`] = PER_USER_MONTHLY_CAP;
  const { service, calls } = svc(store);
  const r = await service.getPriceTrends({ user: paid, ...req });
  assert.equal(r.status, 'user_quota');
  assert.equal(calls(), 0);
});

test('failure refunds the reserved global slot', async () => {
  const store = makeStore();
  const { service, calls } = svc(store, {}, async () => { throw new Error('provider down'); });
  await assert.rejects(() => service.getPriceTrends({ user: paid, ...req }));
  assert.equal(calls(), 1);
  assert.equal(store._global[monthKey()].calls, 0);              // slot given back
});

test('effectiveCap: admin can lower but not raise above env', () => {
  assert.equal(effectiveCap(50, 10), 10);
  assert.equal(effectiveCap(50, 200), 50);
  assert.equal(effectiveCap(50, null), 50);
});
