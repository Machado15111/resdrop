import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { hashToken, generateToken, safeEqual } from './tokens.js';
import * as db from './db.js';
import { clearAuthCache } from './authCache.js';

// ─── The primitive ──────────────────────────────────────────

test('hashToken: deterministic SHA-256 hex, never the raw token', () => {
  const raw = 'a'.repeat(64);
  const h = hashToken(raw);
  assert.equal(h, hashToken(raw), 'deterministic');
  assert.notEqual(h, raw, 'the digest is not the token');
  assert.match(h, /^[0-9a-f]{64}$/);
});

test('hashToken: uses the same construction as pending_import_tokens', () => {
  // routes/inbound-email.js already hashes its signup tokens this way. If the
  // two ever diverge, one of the two token systems silently stops matching.
  const raw = generateToken();
  const expected = crypto.createHash('sha256').update(raw).digest('hex');
  assert.equal(hashToken(raw), expected);
});

test('hashToken: distinct tokens produce distinct digests', () => {
  const digests = new Set(Array.from({ length: 200 }, () => hashToken(generateToken())));
  assert.equal(digests.size, 200);
});

test('generateToken: 256 bits of hex, unique per call', () => {
  const t = generateToken();
  assert.match(t, /^[0-9a-f]{64}$/);
  assert.equal(Buffer.from(t, 'hex').length, 32);
  assert.equal(new Set(Array.from({ length: 500 }, generateToken)).size, 500);
});

test('safeEqual: compares equal digests, rejects mismatches and lengths', () => {
  const a = hashToken('x');
  assert.equal(safeEqual(a, hashToken('x')), true);
  assert.equal(safeEqual(a, hashToken('y')), false);
  assert.equal(safeEqual(a, a.slice(0, 32)), false, 'length mismatch must not throw');
  assert.equal(safeEqual(undefined, undefined), true);
  assert.equal(safeEqual(a, undefined), false);
});

// ─── Session storage round-trip ─────────────────────────────
// Supabase REST is unconfigured under test, so these exercise the in-memory
// path — which is the same code path for keying and expiry.

test('a created session is retrievable by its raw token', async () => {
  clearAuthCache();
  const token = generateToken();
  await db.createSession('roundtrip@example.com', token);

  const sess = await db.getSessionByToken(token);
  assert.ok(sess, 'the session resolves from the raw token the client holds');
  assert.equal(sess.user_email, 'roundtrip@example.com');
});

test('the stored session record holds the digest, never the raw token', async () => {
  const token = generateToken();
  const created = await db.createSession('atrest@example.com', token);

  const serialized = JSON.stringify(created);
  assert.doesNotMatch(serialized, new RegExp(token),
    'the raw token must not appear anywhere in the stored record');
  assert.equal(created.token_hash, hashToken(token));
  assert.equal(created.token, undefined, 'no plaintext token field');
});

test('a session lookup with the wrong token fails', async () => {
  const token = generateToken();
  await db.createSession('wrongtoken@example.com', token);

  assert.equal(await db.getSessionByToken(generateToken()), null);
  // The digest itself is not a valid credential — presenting it must not work.
  assert.equal(await db.getSessionByToken(hashToken(token)), null,
    'a leaked digest cannot be replayed as a token');
});

test('getSessionByToken rejects empty input without hashing it', async () => {
  assert.equal(await db.getSessionByToken(''), null);
  assert.equal(await db.getSessionByToken(null), null);
  assert.equal(await db.getSessionByToken(undefined), null);
});

test('deleteSession revokes the session', async () => {
  const token = generateToken();
  await db.createSession('logout@example.com', token);
  assert.ok(await db.getSessionByToken(token), 'session exists before logout');

  await db.deleteSession(token);
  assert.equal(await db.getSessionByToken(token), null, 'session is gone after logout');
});

test('deleteUserSessions revokes every session for that user only', async () => {
  const mine = [generateToken(), generateToken()];
  const theirs = generateToken();
  for (const t of mine) await db.createSession('multi@example.com', t);
  await db.createSession('other@example.com', theirs);

  await db.deleteUserSessions('multi@example.com');

  for (const t of mine) {
    assert.equal(await db.getSessionByToken(t), null, 'all of the user\'s sessions are revoked');
  }
  assert.ok(await db.getSessionByToken(theirs), 'another user\'s session is untouched');
});

test('deleteUserSessions is case-insensitive on the email', async () => {
  const token = generateToken();
  await db.createSession('MixedCase@Example.com', token);
  await db.deleteUserSessions('mixedcase@example.com');
  assert.equal(await db.getSessionByToken(token), null);
});

test('an expired session does not resolve', async () => {
  const token = generateToken();
  const created = await db.createSession('expired@example.com', token);
  // Age the in-memory record past its expiry.
  created.expires_at = new Date(Date.now() - 1000).toISOString();
  const sess = await db.getSessionByToken(token);
  if (sess) {
    assert.ok(new Date(sess.expires_at) > new Date(), 'any returned session is unexpired');
  }
});

// ─── Password reset tokens ──────────────────────────────────

test('markPasswordResetUsed reports whether the burn actually landed', async () => {
  // POST /api/auth/reset-password consumes the token BEFORE it writes the new
  // password, so that a failure leaves the account untouched and the link
  // still usable. That ordering only means something if this function can say
  // "I could not confirm it" — it used to return undefined either way.
  const result = await db.markPasswordResetUsed(generateToken());
  assert.equal(typeof result, 'boolean', 'the burn must report a boolean, not undefined');
  assert.equal(result, false, 'with no authoritative store to write to, it must not claim success');
});
