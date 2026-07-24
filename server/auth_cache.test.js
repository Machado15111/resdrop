import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getCachedAuth, setCachedAuth, invalidateToken, invalidateEmail, clearAuthCache,
} from './authCache.js';

test('caches a resolved session and returns it', () => {
  clearAuthCache();
  assert.equal(getCachedAuth('tok-a'), null, 'unknown token must miss');
  setCachedAuth('tok-a', 'user@example.com', { email: 'user@example.com', plan: 'free' });
  const hit = getCachedAuth('tok-a');
  assert.ok(hit);
  assert.equal(hit.email, 'user@example.com');
  assert.equal(hit.user.plan, 'free');
});

test('logout purges the token immediately (no TTL wait)', () => {
  clearAuthCache();
  setCachedAuth('tok-b', 'user@example.com', { email: 'user@example.com' });
  assert.ok(getCachedAuth('tok-b'));
  invalidateToken('tok-b');
  assert.equal(getCachedAuth('tok-b'), null, 'revoked session must not stay authenticated');
});

test('invalidateEmail purges every session for that user', () => {
  clearAuthCache();
  setCachedAuth('t1', 'a@example.com', { email: 'a@example.com' });
  setCachedAuth('t2', 'a@example.com', { email: 'a@example.com' });
  setCachedAuth('t3', 'b@example.com', { email: 'b@example.com' });
  invalidateEmail('A@Example.com'); // case-insensitive
  assert.equal(getCachedAuth('t1'), null);
  assert.equal(getCachedAuth('t2'), null);
  assert.ok(getCachedAuth('t3'), 'other users must be unaffected');
});

test('never invents an entry for a token that was not cached', () => {
  clearAuthCache();
  assert.equal(getCachedAuth('never-seen'), null);
});
