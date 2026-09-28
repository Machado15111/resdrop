import test from 'node:test';
import assert from 'node:assert/strict';
import { runLifecycleCycle } from './scheduler.js';
import { DORMANT_DAYS, NO_BOOKING_DAYS } from './lifecycle.js';

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

function makeDeps(overrides = {}) {
  const sent = { dormant: [], noBooking: [] };
  const logged = [];
  const activityCalls = [];
  return {
    deps: {
      loadUsers: async () => [],
      loadBookings: async () => [],
      getActivity: async (user) => { activityCalls.push(user); return []; },
      sendDormant: async (user, booking) => { sent.dormant.push({ user, booking }); },
      sendNoBooking: async (user, days) => { sent.noBooking.push({ user, days }); },
      logSent: async (user, nudgeKind) => { logged.push({ user, nudgeKind }); },
      ...overrides,
    },
    sent,
    logged,
    activityCalls,
  };
}

test('runLifecycleCycle: sends the dormant nudge for a dormant user with an active booking', async () => {
  const user = { email: 'a@x.com', lastActive: daysAgo(DORMANT_DAYS + 1) };
  const booking = { email: 'a@x.com', status: 'monitoring', hotelName: 'Hotel A', checkinDate: daysAgo(-10) };
  const { deps, sent, logged } = makeDeps({
    loadUsers: async () => [user],
    loadBookings: async () => [booking],
  });
  const result = await runLifecycleCycle(deps);
  assert.equal(result.sent, 1);
  assert.equal(sent.dormant.length, 1);
  assert.equal(sent.noBooking.length, 0);
  assert.equal(logged[0].nudgeKind, 'dormant_active_bookings');
});

test('runLifecycleCycle: passes the full user object (with .id) to getActivity/logSent, never a bare email string', async () => {
  // Regression test for a real incident: activity_log.entity_id is a UUID
  // column. Passing an email string there makes the insert fail silently
  // (Postgres rejects it, the caller swallowed the error), so the cooldown
  // always read an empty log and re-sent on every cycle — a live user got 3
  // duplicate emails in ~20 minutes before this was caught.
  const user = { id: 'e500f4a1-941d-4e05-ae83-cfd591880d9a', email: 'a@x.com', joinedAt: daysAgo(NO_BOOKING_DAYS + 2) };
  const { deps, logged, activityCalls } = makeDeps({ loadUsers: async () => [user] });
  await runLifecycleCycle(deps);
  assert.equal(activityCalls[0]?.id, user.id);
  assert.equal(typeof activityCalls[0], 'object');
  assert.equal(logged[0]?.user?.id, user.id);
  assert.equal(typeof logged[0]?.user, 'object');
});

test('runLifecycleCycle: sends the no-booking nudge for an old account with zero bookings', async () => {
  const user = { email: 'b@x.com', joinedAt: daysAgo(NO_BOOKING_DAYS + 2) };
  const { deps, sent } = makeDeps({ loadUsers: async () => [user] });
  const result = await runLifecycleCycle(deps);
  assert.equal(result.sent, 1);
  assert.equal(sent.noBooking.length, 1);
  assert.equal(sent.noBooking[0].days, NO_BOOKING_DAYS + 2);
});

test('runLifecycleCycle: skips a user emailed anything within the last 7 days', async () => {
  const user = { email: 'c@x.com', joinedAt: daysAgo(NO_BOOKING_DAYS + 5) };
  const { deps, sent } = makeDeps({
    loadUsers: async () => [user],
    getActivity: async () => [{ action: 'email_sent', createdAt: daysAgo(1) }],
  });
  const result = await runLifecycleCycle(deps);
  assert.equal(result.sent, 0);
  assert.equal(sent.noBooking.length, 0);
});

test('runLifecycleCycle: skips a user who already got the SAME nudge within its cooldown', async () => {
  const user = { email: 'd@x.com', joinedAt: daysAgo(NO_BOOKING_DAYS + 5) };
  const { deps, sent } = makeDeps({
    loadUsers: async () => [user],
    getActivity: async () => [{ action: 'email_sent', details: { nudgeKind: 'no_booking_added' }, createdAt: daysAgo(10) }],
  });
  const result = await runLifecycleCycle(deps);
  assert.equal(result.sent, 0);
  assert.equal(sent.noBooking.length, 0);
});

test('runLifecycleCycle: dormant nudge takes priority over no-booking when a user somehow matches both shapes', async () => {
  // Not realistic (dormant requires an active booking, no-booking requires zero) but
  // guards the branch order explicitly.
  const user = { email: 'e@x.com', lastActive: daysAgo(DORMANT_DAYS + 1), joinedAt: daysAgo(100) };
  const booking = { email: 'e@x.com', status: 'savings_found', hotelName: 'Hotel E', checkinDate: daysAgo(-2) };
  const { deps, sent } = makeDeps({
    loadUsers: async () => [user],
    loadBookings: async () => [booking],
  });
  await runLifecycleCycle(deps);
  assert.equal(sent.dormant.length, 1);
  assert.equal(sent.noBooking.length, 0);
});

test('runLifecycleCycle: leaves an unrelated user (active, has a booking, not old enough) untouched', async () => {
  const user = { email: 'f@x.com', lastActive: daysAgo(1), joinedAt: daysAgo(1) };
  const booking = { email: 'f@x.com', status: 'monitoring', hotelName: 'Hotel F', checkinDate: daysAgo(-30) };
  const { deps, sent } = makeDeps({
    loadUsers: async () => [user],
    loadBookings: async () => [booking],
  });
  const result = await runLifecycleCycle(deps);
  assert.equal(result.sent, 0);
  assert.equal(sent.dormant.length, 0);
  assert.equal(sent.noBooking.length, 0);
});

test('runLifecycleCycle: a failed load reports load_failed without throwing', async () => {
  const { deps } = makeDeps({ loadUsers: async () => { throw new Error('boom'); } });
  const result = await runLifecycleCycle(deps);
  assert.equal(result.status, 'load_failed');
  assert.equal(result.errors, 1);
});

test('runLifecycleCycle: one user erroring does not stop the rest of the batch', async () => {
  const u1 = { email: 'g1@x.com', joinedAt: daysAgo(NO_BOOKING_DAYS + 1) };
  const u2 = { email: 'g2@x.com', joinedAt: daysAgo(NO_BOOKING_DAYS + 1) };
  const { deps, sent } = makeDeps({
    loadUsers: async () => [u1, u2],
    sendNoBooking: async (user) => {
      if (user.email === 'g1@x.com') throw new Error('send failed');
      sent.noBooking.push({ user });
    },
  });
  const result = await runLifecycleCycle(deps);
  assert.equal(result.errors, 1);
  assert.equal(result.sent, 1);
  assert.equal(sent.noBooking.length, 1);
});
