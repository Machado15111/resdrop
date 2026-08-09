import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adminEmails, isAdminEmail } from './admins.js';

// adminEmails() takes an env object so parsing can be tested without touching
// the real process environment (isAdminEmail resolves its list once at import).

test('ADMIN_EMAILS: parses a comma-separated list', () => {
  const list = adminEmails({ ADMIN_EMAILS: 'a@example.com,b@example.com,c@example.com' });
  assert.deepEqual(list, ['a@example.com', 'b@example.com', 'c@example.com']);
});

test('ADMIN_EMAILS: trims whitespace around entries', () => {
  const list = adminEmails({ ADMIN_EMAILS: '  a@example.com ,\tb@example.com  ,\nc@example.com ' });
  assert.deepEqual(list, ['a@example.com', 'b@example.com', 'c@example.com']);
});

test('ADMIN_EMAILS: lowercases entries', () => {
  const list = adminEmails({ ADMIN_EMAILS: 'Admin@Example.COM,SECOND@Example.com' });
  assert.deepEqual(list, ['admin@example.com', 'second@example.com']);
});

test('ADMIN_EMAILS: drops empty entries from stray commas', () => {
  assert.deepEqual(adminEmails({ ADMIN_EMAILS: 'a@example.com,,  ,b@example.com,' }),
    ['a@example.com', 'b@example.com']);
});

test('ADMIN_EMAILS: de-duplicates, including across casing', () => {
  assert.deepEqual(adminEmails({ ADMIN_EMAILS: 'a@example.com,A@Example.com,a@example.com' }),
    ['a@example.com']);
});

test('legacy ADMIN_EMAIL is still honoured, and merges with ADMIN_EMAILS', () => {
  assert.deepEqual(adminEmails({ ADMIN_EMAIL: 'solo@example.com' }), ['solo@example.com']);
  assert.deepEqual(
    adminEmails({ ADMIN_EMAILS: 'new@example.com', ADMIN_EMAIL: 'legacy@example.com' }),
    ['new@example.com', 'legacy@example.com'],
  );
});

test('legacy ADMIN_EMAIL also accepts a comma-separated list', () => {
  assert.deepEqual(adminEmails({ ADMIN_EMAIL: 'a@example.com,b@example.com' }),
    ['a@example.com', 'b@example.com']);
});

test('an unset or blank environment yields no admins (fails closed)', () => {
  assert.deepEqual(adminEmails({}), []);
  assert.deepEqual(adminEmails({ ADMIN_EMAILS: '' }), []);
  assert.deepEqual(adminEmails({ ADMIN_EMAILS: '   ,  , ' }), []);
});

test('no personal addresses remain compiled into the module', async () => {
  // The whole point of the change: the list must come from the environment.
  const src = await import('node:fs').then(fs =>
    fs.promises.readFile(new URL('./admins.js', import.meta.url), 'utf8'));
  assert.doesNotMatch(src, /junior13machadojr|machado1jr/,
    'admin addresses must not be hardcoded in source');
  assert.doesNotMatch(src, /@gmail\.com/, 'no real address literals at all');
});

// ─── isAdminEmail contract (signature unchanged) ────────────

test('isAdminEmail: falsy and non-string input is safe', () => {
  assert.equal(isAdminEmail(undefined), false);
  assert.equal(isAdminEmail(null), false);
  assert.equal(isAdminEmail(''), false);
  assert.equal(isAdminEmail(0), false);
  assert.equal(isAdminEmail({}), false);
  assert.equal(isAdminEmail(['a@example.com']), false);
});

test('isAdminEmail: a non-admin address is never an admin', () => {
  assert.equal(isAdminEmail('definitely-not-an-admin@example.com'), false);
});

test('isAdminEmail: returns a boolean, not a truthy value', () => {
  assert.strictEqual(isAdminEmail('someone@example.com'), false);
});

test('index.js and db.js export the SAME isAdminEmail', async () => {
  // They used to each keep their own copy of the list, so the two could
  // disagree about who is an admin.
  const dbMod = await import('./db.js');
  const adminsMod = await import('./admins.js');
  assert.equal(dbMod.isAdminEmail, adminsMod.isAdminEmail,
    'db.js must re-export the single shared implementation');
});
