import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import {
  BCRYPT_COST, MIN_PASSWORD_LENGTH,
  hashPassword, verifyPassword, costOf, needsRehash, rehashIfWeak,
  burnCompare, validatePassword, messageFor,
} from './passwords.js';

// ─── Cost factor ────────────────────────────────────────────

test('the configured cost factor is 12', () => {
  assert.equal(BCRYPT_COST, 12);
});

test('new hashes are produced at the configured cost', async () => {
  const hash = await hashPassword('a-perfectly-fine-password');
  assert.equal(costOf(hash), BCRYPT_COST);
});

test('costOf reads the factor out of a hash, and tolerates junk', async () => {
  assert.equal(costOf(await bcrypt.hash('x', 10)), 10);
  assert.equal(costOf(await bcrypt.hash('x', 12)), 12);
  assert.equal(costOf('not-a-hash'), null);
  assert.equal(costOf(''), null);
  assert.equal(costOf(null), null);
  assert.equal(costOf(undefined), null);
});

test('a round-trip verifies, and a wrong password does not', async () => {
  const hash = await hashPassword('correct-horse-battery');
  assert.equal(await verifyPassword('correct-horse-battery', hash), true);
  assert.equal(await verifyPassword('correct-horse-batteryX', hash), false);
  assert.equal(await verifyPassword('', hash), false);
});

// ─── Transparent rehash on login ────────────────────────────

test('needsRehash: only hashes below the current cost', async () => {
  assert.equal(needsRehash(await bcrypt.hash('x', 10)), true, 'legacy cost-10 hash');
  assert.equal(needsRehash(await bcrypt.hash('x', 12)), false, 'already current');
  assert.equal(needsRehash(await bcrypt.hash('x', 13)), false, 'stronger than current is fine');
  assert.equal(needsRehash('garbage'), false, 'unreadable hashes are left alone');
});

test('rehashIfWeak upgrades a legacy hash and the new one still verifies', async () => {
  const password = 'legacy-account-password';
  const legacy = await bcrypt.hash(password, 10);

  const upgraded = await rehashIfWeak(password, legacy);
  assert.ok(upgraded, 'an upgrade was produced');
  assert.equal(costOf(upgraded), BCRYPT_COST);
  assert.notEqual(upgraded, legacy);
  assert.equal(await verifyPassword(password, upgraded), true,
    'the user can still log in with the same password');
});

test('rehashIfWeak returns null when no upgrade is needed', async () => {
  const current = await hashPassword('already-strong-enough');
  assert.equal(await rehashIfWeak('already-strong-enough', current), null);
});

// ─── Login timing (user enumeration) ────────────────────────

test('burnCompare always resolves false', async () => {
  assert.equal(await burnCompare('anything'), false);
  assert.equal(await burnCompare(''), false);
  assert.equal(await burnCompare(undefined), false);
});

test('a miss costs comparable time to a hit, so timing does not leak existence', async () => {
  const hash = await hashPassword('the-real-password');

  const time = async (fn) => {
    const t0 = process.hrtime.bigint();
    await fn();
    return Number(process.hrtime.bigint() - t0) / 1e6; // ms
  };

  // Median of a few runs — bcrypt timing is noisy on a loaded machine.
  const median = (xs) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const hits = [];
  const misses = [];
  for (let i = 0; i < 3; i++) {
    hits.push(await time(() => verifyPassword('wrong-but-account-exists', hash)));
    misses.push(await time(() => burnCompare('wrong-and-no-account')));
  }

  const hit = median(hits);
  const miss = median(misses);
  assert.ok(miss > 1, `the miss path must do real work, took ${miss.toFixed(1)}ms`);
  const ratio = Math.max(hit, miss) / Math.min(hit, miss);
  assert.ok(ratio < 3, `hit ${hit.toFixed(1)}ms vs miss ${miss.toFixed(1)}ms — ratio ${ratio.toFixed(2)} too wide`);
});

// ─── Length policy ──────────────────────────────────────────

test('the minimum length is 10', () => {
  assert.equal(MIN_PASSWORD_LENGTH, 10);
});

test('passwords shorter than the minimum are rejected', () => {
  for (const pw of ['', 'a', 'short', '123456', '123456789']) {
    const r = validatePassword(pw);
    assert.equal(r.ok, false, `${JSON.stringify(pw)} must be rejected`);
  }
});

test('a password at exactly the minimum is accepted', () => {
  assert.equal(validatePassword('a'.repeat(MIN_PASSWORD_LENGTH)).ok, true);
});

test('the old 6-character minimum no longer passes', () => {
  assert.equal(validatePassword('abc123').ok, false);
});

test('non-string input is rejected rather than coerced', () => {
  for (const v of [undefined, null, 12345678901, {}, []]) {
    assert.equal(validatePassword(v).ok, false);
  }
});

test('passwords beyond bcrypt\'s 72-byte limit are rejected, not silently truncated', () => {
  const r = validatePassword('a'.repeat(73));
  assert.equal(r.ok, false);
  assert.equal(r.code, 'PASSWORD_TOO_LONG');
  // Multi-byte characters count as bytes, which is what bcrypt truncates on.
  assert.equal(validatePassword('é'.repeat(37)).ok, false, '74 bytes');
  assert.equal(validatePassword('é'.repeat(36)).ok, true, '72 bytes');
});

// ─── Bilingual messages (EN/PT is mandatory in this app) ────

test('every rejection carries both an EN and a PT message', () => {
  for (const pw of ['', 'short', 'a'.repeat(73)]) {
    const r = validatePassword(pw);
    assert.equal(r.ok, false);
    assert.equal(typeof r.error.en, 'string');
    assert.equal(typeof r.error.pt, 'string');
    assert.ok(r.error.en.length > 0 && r.error.pt.length > 0);
    assert.notEqual(r.error.en, r.error.pt, 'the two languages must actually differ');
  }
});

test('messages state the real minimum, in both languages', () => {
  const r = validatePassword('short');
  assert.ok(r.error.en.includes(String(MIN_PASSWORD_LENGTH)));
  assert.ok(r.error.pt.includes(String(MIN_PASSWORD_LENGTH)));
});

test('messageFor picks the language, defaulting to pt as the app does', () => {
  const r = validatePassword('short');
  assert.equal(messageFor(r, 'en'), r.error.en);
  assert.equal(messageFor(r, 'pt'), r.error.pt);
  assert.equal(messageFor(r, undefined), r.error.pt, 'default is pt');
  assert.equal(messageFor({ ok: true }), null);
});
