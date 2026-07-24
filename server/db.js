import postgres from 'postgres';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as supa from './supabase-rest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL || 'postgres://mock:mock@localhost:5432/mock';

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'test' && !process.execArgv.includes('--test')) {
  console.warn('[DB] No DATABASE_URL set; operating with mock DB client for offline/test mode.');
}

const sql = postgres(connectionString, {
  ssl: process.env.DATABASE_URL ? 'require' : false,
  max: 10,
  idle_timeout: 30,
  connect_timeout: 15,
  transform: { undefined: null },
});

console.log('[DB] Connected via postgres driver');

// ─── Camel ↔ Snake helpers ─────────────────────────────────

function toSnake(obj) {
  const map = {
    hotelName: 'hotel_name', checkinDate: 'checkin_date', checkoutDate: 'checkout_date',
    roomType: 'room_type', originalPrice: 'original_price', guestName: 'guest_name',
    confirmationNumber: 'confirmation_number', totalSavings: 'total_savings',
    bestPrice: 'best_price', bestSource: 'best_source', lastChecked: 'last_checked',
    createdAt: 'created_at', updatedAt: 'updated_at', rateType: 'rate_type',
    checkCount: 'check_count', apiMode: 'api_mode', priceHistory: 'price_history',
    changeHistory: 'change_history', latestResults: 'latest_results',
    joinedAt: 'joined_at', lastActive: 'last_active', bookingsCount: 'bookings_count',
    passwordHash: 'password_hash', onboardingCompleted: 'onboarding_completed',
    travelerType: 'traveler_type', preferredEmail: 'preferred_email', alertsEnabled: 'alerts_enabled',
    dateOfBirth: 'date_of_birth', preferredRoomType: 'preferred_room_type',
    loyaltyPrograms: 'loyalty_programs', roomTypeCustom: 'room_type_custom',
    potentialSavings: 'potential_savings', confirmedSavings: 'confirmed_savings',
    clientEmail: 'client_email', clientName: 'client_name', clientPhone: 'client_phone',
    bookingId: 'booking_id', userEmail: 'user_email', confirmationType: 'confirmation_type',
    confirmedSavingsAmount: 'confirmed_savings', finalPaidAmount: 'final_paid_amount',
    externalConfirmationNumber: 'external_confirmation_number', proofFileUrl: 'proof_file_url',
    entityType: 'entity_type', entityId: 'entity_id', actorEmail: 'actor_email',
    currentPrice: 'current_price', boardBasis: 'board_basis', originalSource: 'original_source',
    foundSource: 'found_source', paymentChoice: 'payment_choice', paymentStatus: 'payment_status',
    clientDecision: 'client_decision', bookingExecution: 'booking_execution',
    assignedAgent: 'assigned_agent', clientNotes: 'client_notes', internalNotes: 'internal_notes',
    finalAmount: 'final_amount', bookingConfirmationNumber: 'booking_confirmation_number',
    voucherUrl: 'voucher_url', realizedSavings: 'realized_savings', savingsAmount: 'savings_amount',
    offeredPrice: 'offered_price', cancellationDeadline: 'cancellation_deadline',
    offeredAt: 'offered_at', acceptedAt: 'accepted_at', confirmedAt: 'confirmed_at',
    cancelledAt: 'cancelled_at', fileType: 'file_type', fileSize: 'file_size',
    storagePath: 'storage_path', extractedData: 'extracted_data',
    confidenceScores: 'confidence_scores', processingStatus: 'processing_status',
    rawSource: 'raw_source', parseMethod: 'parse_method', missingFields: 'missing_fields',
    cancellationPolicy: 'cancellation_policy', fieldConfidence: 'field_confidence',
    messageId: 'message_id', mailboxUid: 'mailbox_uid', senderEmail: 'sender_email',
    receivedAt: 'received_at', processedAt: 'processed_at', failureReason: 'failure_reason',
    contentHash: 'content_hash', inboundEmailId: 'inbound_email_id', uploadId: 'upload_id',
    confidenceData: 'confidence_data', bookingImportId: 'booking_import_id',
    tokenHash: 'token_hash', expiresAt: 'expires_at', usedAt: 'used_at',
    deterministicSuccess: 'deterministic_success', ocrUsed: 'ocr_used', aiUsed: 'ai_used',
    inputTokenEstimate: 'input_token_estimate', outputTokens: 'output_tokens',
  };
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[map[k] || k] = v;
  }
  return out;
}

function toCamel(row) {
  if (!row) return null;
  const map = {
    hotel_name: 'hotelName', checkin_date: 'checkinDate', checkout_date: 'checkoutDate',
    room_type: 'roomType', original_price: 'originalPrice', guest_name: 'guestName',
    confirmation_number: 'confirmationNumber', total_savings: 'totalSavings',
    best_price: 'bestPrice', best_source: 'bestSource', last_checked: 'lastChecked',
    created_at: 'createdAt', updated_at: 'updatedAt', rate_type: 'rateType',
    check_count: 'checkCount', api_mode: 'apiMode', price_history: 'priceHistory',
    change_history: 'changeHistory', latest_results: 'latestResults',
    joined_at: 'joinedAt', last_active: 'lastActive', bookings_count: 'bookingsCount',
    password_hash: 'passwordHash', onboarding_completed: 'onboardingCompleted',
    traveler_type: 'travelerType', preferred_email: 'preferredEmail', alerts_enabled: 'alertsEnabled',
    date_of_birth: 'dateOfBirth', preferred_room_type: 'preferredRoomType',
    loyalty_programs: 'loyaltyPrograms', room_type_custom: 'roomTypeCustom',
    potential_savings: 'potentialSavings', confirmed_savings: 'confirmedSavings',
    client_email: 'clientEmail', client_name: 'clientName', client_phone: 'clientPhone',
    booking_id: 'bookingId', user_email: 'userEmail', confirmation_type: 'confirmationType',
    final_paid_amount: 'finalPaidAmount', external_confirmation_number: 'externalConfirmationNumber',
    proof_file_url: 'proofFileUrl', entity_type: 'entityType', entity_id: 'entityId',
    actor_email: 'actorEmail', current_price: 'currentPrice', board_basis: 'boardBasis',
    original_source: 'originalSource', found_source: 'foundSource',
    payment_choice: 'paymentChoice', payment_status: 'paymentStatus',
    client_decision: 'clientDecision', booking_execution: 'bookingExecution',
    assigned_agent: 'assignedAgent', client_notes: 'clientNotes', internal_notes: 'internalNotes',
    final_amount: 'finalAmount', booking_confirmation_number: 'bookingConfirmationNumber',
    voucher_url: 'voucherUrl', realized_savings: 'realizedSavings', savings_amount: 'savingsAmount',
    offered_price: 'offeredPrice', cancellation_deadline: 'cancellationDeadline',
    offered_at: 'offeredAt', accepted_at: 'acceptedAt', confirmed_at: 'confirmedAt',
    cancelled_at: 'cancelledAt', file_type: 'fileType', file_size: 'fileSize',
    storage_path: 'storagePath', extracted_data: 'extractedData',
    confidence_scores: 'confidenceScores', processing_status: 'processingStatus',
    raw_source: 'rawSource', parse_method: 'parseMethod', missing_fields: 'missingFields',
    cancellation_policy: 'cancellationPolicy', field_confidence: 'fieldConfidence',
    message_id: 'messageId', mailbox_uid: 'mailboxUid', sender_email: 'senderEmail',
    received_at: 'receivedAt', processed_at: 'processedAt', failure_reason: 'failureReason',
    content_hash: 'contentHash', inbound_email_id: 'inboundEmailId', upload_id: 'uploadId',
    confidence_data: 'confidenceData', booking_import_id: 'bookingImportId',
    token_hash: 'tokenHash', expires_at: 'expiresAt', used_at: 'usedAt',
    deterministic_success: 'deterministicSuccess', ocr_used: 'ocrUsed', ai_used: 'aiUsed',
    input_token_estimate: 'inputTokenEstimate', output_tokens: 'outputTokens',
  };
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[map[k] || k] = v;
  }
  if (out.bookingsCount !== undefined) out.bookings = out.bookingsCount;
  return out;
}

// ─── Helpers ─────────────────────────────────────────────────

// Build SET clause for UPDATE from a snake_case object
// Returns: { setClauses: string, values: array }
function buildSet(obj) {
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined);
  const parts = entries.map(([k], i) => `${k} = $${i + 1}`);
  return { clause: parts.join(', '), values: entries.map(([, v]) => v) };
}

// ─── Users ──────────────────────────────────────────────────

const inMemoryUsers = new Map();

export async function getUserWithPassword(email) {
  if (!email) return null;
  const key = email.toLowerCase();
  // Supabase REST is the source of truth for accounts (auth-critical). The sql
  // client points at a different database, so reading it first could return a
  // stale user record — or miss one created via REST.
  try {
    const rows = await supa.select('users', { email: key }, { limit: 1 });
    if (Array.isArray(rows) && rows[0]) return toCamel(rows[0]);
  } catch (e) {
    console.error('[DB] getUserWithPassword supa:', e.message);
  }
  if (inMemoryUsers.has(key)) {
    return { ...inMemoryUsers.get(key) };
  }
  return null;
}

const ADMIN_EMAILS = [
  (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
  'junior13machadojr@gmail.com',
  'machado1jr@gmail.com'
].filter(Boolean);

export function isAdminEmail(email) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function getUser(email) {
  const user = await getUserWithPassword(email);
  if (user) {
    delete user.passwordHash;
    if (isAdminEmail(user.email)) {
      user.plan = 'premium';
    }
  }
  return user;
}

export async function createUser(email, name) {
  const key = (email || '').toLowerCase();
  // REST is authoritative (see getUserWithPassword); sql is best-effort mirroring.
  try {
    const row = await supa.insert('users', { email: key, name: name || 'Guest' });
    if (row) {
      sql`INSERT INTO users (email, name) VALUES (${key}, ${name || 'Guest'})`.catch(() => {});
      return toCamel(row);
    }
  } catch (e) {
    console.error('[DB] createUser supa:', e.message);
  }

  const memUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    email: key,
    name: name || 'Guest',
    plan: isAdminEmail(key) ? 'premium' : 'free',
    joinedAt: new Date().toISOString(),
  };
  inMemoryUsers.set(key, memUser);
  return { ...memUser };
}

export async function getOrCreateUser(email, name) {
  if (!email) return null;
  let user = await getUser(email);
  if (user) {
    const now = new Date().toISOString();
    // Fire-and-forget: last_active must never block or fail a login.
    supa.update('users', { email: email.toLowerCase() }, { last_active: now }).catch(() => {});
    sql`UPDATE users SET last_active = NOW() WHERE email = ${email.toLowerCase()}`.catch(() => {});
    user.lastActive = now;
    return user;
  }
  return await createUser(email, name);
}

export async function updateUser(email, updates) {
  const key = email.toLowerCase();
  if (inMemoryUsers.has(key)) {
    const existing = inMemoryUsers.get(key);
    const updated = { ...existing, ...updates };
    inMemoryUsers.set(key, updated);
  }

  // REST is authoritative for accounts; sql is best-effort mirroring.
  const snake = toSnake(updates);
  const entries = Object.entries(snake).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return await getUser(email);
  const clean = Object.fromEntries(entries);
  try {
    const row = await supa.update('users', { email: key }, clean);
    if (row) {
      sql`UPDATE users SET ${sql(clean)} WHERE email = ${key}`.catch(() => {});
      return toCamel(row);
    }
  } catch (e) {
    console.error('[DB] updateUser supa:', e.message);
  }
  sql`UPDATE users SET ${sql(clean)} WHERE email = ${key}`.catch(() => {});
  return await getUser(email);
}

export async function updateUserStats(email) {
  if (!email) return;
  try {
    const key = email.toLowerCase();
    // Count via REST (source of truth), not the stale sql/DATABASE_URL path.
    const rows = await supa.select('bookings', { email: key }, { select: 'total_savings' });
    const list = Array.isArray(rows) ? rows : [];
    const count = list.length;
    const savings = list.reduce((sum, b) => sum + (parseFloat(b.total_savings) || 0), 0);
    await supa.update('users', { email: key }, { bookings_count: count, total_savings: Math.round(savings * 100) / 100 });
  } catch (e) {
    console.error('[DB] updateUserStats:', e.message);
  }
}

export async function getAllUsers(limit = 50) {
  let list = [];
  // Source of truth only (REST) — the sql DB holds a divergent user set.
  try {
    const rows = await supa.select('users', {}, { order: 'joined_at.desc', limit });
    if (Array.isArray(rows)) list = rows.map(r => { const u = toCamel(r); delete u.passwordHash; return u; });
  } catch (e) {
    console.error('[DB] getAllUsers supa:', e.message);
  }
  for (const u of inMemoryUsers.values()) {
    if (!list.some(x => x.email === u.email)) {
      const c = { ...u };
      delete c.passwordHash;
      list.push(c);
    }
  }
  return list.slice(0, limit);
}

export async function getUserCount() {
  // Count from the source of truth (Supabase REST), not the divergent sql DB.
  const rows = await supa.select('users', {}, { select: 'email', limit: 10000 });
  if (Array.isArray(rows)) return rows.length;
  return inMemoryUsers.size;
}

// ─── Bookings ───────────────────────────────────────────────

const inMemoryBookings = new Map();

export async function getBooking(id) {
  if (!id) return null;
  // Read the source of truth (Supabase REST) only — the sql/DATABASE_URL client
  // points at a different database and returned stale/phantom rows.
  try {
    const rows = await supa.select('bookings', { id }, { limit: 1 });
    if (Array.isArray(rows) && rows[0]) return toCamel(rows[0]);
  } catch (e) {
    console.error('[DB] getBooking:', e.message);
  }
  return inMemoryBookings.get(id) || null;
}

export async function getBookingsByEmail(email) {
  const normalizedEmail = (email || '').toLowerCase();
  // Supabase REST is authoritative in this deployment. The direct sql/DATABASE_URL
  // client can read a stale/other database (returning phantom counts), so read via
  // REST only — no sql, no in-memory merge (both produced ghost bookings).
  const rows = await supa.select('bookings', { email: normalizedEmail }, { order: 'created_at.desc' });
  return Array.isArray(rows) ? rows.map(toCamel) : [];
}

export async function getAllBookings() {
  // Authoritative via Supabase REST (see getBookingsByEmail).
  const rows = await supa.select('bookings', {}, { order: 'created_at.desc', limit: 500 });
  return Array.isArray(rows) ? rows.map(toCamel) : [];
}

export async function createBooking(booking) {
  const fallbackId = `bkg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const record = {
    id: fallbackId,
    email: booking.email ? booking.email.toLowerCase() : '',
    hotelName: booking.hotelName || '',
    destination: booking.destination || null,
    checkinDate: booking.checkinDate || '',
    checkoutDate: booking.checkoutDate || '',
    roomType: booking.roomType || 'Standard Room',
    originalPrice: parseFloat(booking.originalPrice) || 0,
    currency: (booking.currency || 'USD').toUpperCase(),
    guestName: booking.guestName || null,
    confirmationNumber: booking.confirmationNumber || null,
    status: booking.status || 'monitoring',
    totalSavings: 0,
    potentialSavings: 0,
    priceHistory: booking.priceHistory || [],
    latestResults: booking.latestResults || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const raw = toSnake(booking);
    const allowedColumns = [
      'id', 'email', 'hotel_name', 'destination', 'checkin_date', 'checkout_date',
      'room_type', 'original_price', 'currency', 'guest_name', 'confirmation_number',
      'total_savings', 'potential_savings', 'best_price', 'best_source', 'last_checked',
      'rate_type', 'check_count', 'api_mode', 'status', 'price_history', 'change_history',
      'latest_results', 'cancellation_policy', 'board_basis', 'parse_method',
      'created_at', 'updated_at'
    ];
    const row = {};
    for (const k of allowedColumns) {
      if (raw[k] !== undefined) row[k] = raw[k];
    }
    if (row.email) row.email = row.email.toLowerCase();

    // Idempotency / dedup — prevent duplicate rows from double submits, retries,
    // multiple tabs, or reprocessed imports. If an active booking already exists
    // for the same guest + hotel + stay, return it instead of inserting again.
    if (row.email && row.hotel_name && row.checkin_date && row.checkout_date) {
      try {
        const existing = await supa.select('bookings', {
          email: row.email,
          hotel_name: row.hotel_name,
          checkin_date: row.checkin_date,
          checkout_date: row.checkout_date,
        }, { limit: 1 });
        if (Array.isArray(existing) && existing.length > 0) {
          const dupe = toCamel(existing[0]);
          console.log(`[DB] createBooking: duplicate suppressed for "${row.hotel_name}" ${row.checkin_date}→${row.checkout_date} (${row.email})`);
          inMemoryBookings.set(dupe.id, dupe);
          return dupe;
        }
      } catch (e) { console.error('[DB] createBooking dedup check:', e.message); }
    }

    // Persist through the Supabase REST layer. The direct `sql` client is a dead
    // mock connection in this deployment (no DATABASE_URL), which silently sent
    // every booking to the in-memory fallback. Return the REAL persisted row.
    const inserted = await supa.insert('bookings', row);
    if (inserted) {
      const dbRecord = toCamel(inserted);
      inMemoryBookings.set(dbRecord.id, dbRecord);
      return dbRecord;
    }
  } catch (e) {
    console.error('[DB] createBooking DB error:', e.message);
  }

  inMemoryBookings.set(fallbackId, record);
  return record;
}

export async function updateBooking(id, updates) {
  const raw = toSnake(updates);
  const row = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined));
  if (Object.keys(row).length === 0) return await getBooking(id);
  // Supabase REST is authoritative — reads come from there, so writes must too.
  // (Previously sql-first: monitoring results landed in the other database and
  // never showed up in the app.) sql is best-effort mirroring only.
  try {
    const updated = await supa.update('bookings', { id }, row);
    if (updated) {
      const rec = toCamel(updated);
      inMemoryBookings.set(rec.id, rec);
      sql`UPDATE bookings SET ${sql(row)} WHERE id = ${id}`.catch(() => {});
      return rec;
    }
  } catch (e) {
    console.error('[DB] updateBooking rest:', e.message);
  }
  sql`UPDATE bookings SET ${sql(row)} WHERE id = ${id}`.catch(() => {});
  const existing = inMemoryBookings.get(id);
  if (existing) {
    const merged = { ...existing, ...updates };
    inMemoryBookings.set(id, merged);
    return merged;
  }
  return null;
}

export async function getBookingCount() {
  // Source of truth is Supabase REST (the sql/DATABASE_URL DB reports stale counts).
  const rows = await supa.select('bookings', {}, { select: 'id', limit: 10000 });
  return Array.isArray(rows) ? rows.length : 0;
}

export async function getStats(email) {
  const defaultStats = {
    totalBookings: 0,
    savingsFound: 0,
    confirmedSavings: 0,
    potentialSavings: 0,
    totalSavings: 0,
    avgSavings: 0,
    successRate: 0,
  };
  try {
    // Count via REST (source of truth) — never the stale sql/DATABASE_URL path.
    const allBookings = email ? await getBookingsByEmail(email) : await getAllBookings();
    const confirmedSavings = allBookings
      .filter(b => b.status === 'confirmed_savings')
      .reduce((sum, b) => sum + (parseFloat(b.totalSavings || b.total_savings) || 0), 0);
    const potentialSavings = allBookings
      .filter(b => ['lower_fare_found', 'savings_found'].includes(b.status))
      .reduce((sum, b) => sum + (parseFloat(b.potentialSavings || b.potential_savings || b.totalSavings || b.total_savings) || 0), 0);
    const dropsFound = allBookings.filter(b =>
      ['lower_fare_found', 'savings_found', 'confirmed_savings', 'pending_user_confirmation'].includes(b.status)
    ).length;
    const total = allBookings.length;
    return {
      totalBookings: total,
      savingsFound: dropsFound,
      confirmedSavings: Math.round(confirmedSavings * 100) / 100,
      potentialSavings: Math.round(potentialSavings * 100) / 100,
      totalSavings: Math.round(confirmedSavings * 100) / 100,
      avgSavings: dropsFound > 0 ? Math.round(((confirmedSavings + potentialSavings) / dropsFound) * 100) / 100 : 0,
      successRate: total > 0 ? Math.round((dropsFound / total) * 100) : 0,
    };
  } catch (e) {
    console.error('[DB] getStats:', e.message);
    return defaultStats;
  }
}

export async function deleteBooking(id) {
  // Supabase REST is the source of truth in production. Delete there FIRST and
  // treat ITS result as authoritative. The direct `sql` client is a dead mock in
  // serverless (no DATABASE_URL) and silently "succeeds" without throwing — the
  // old sql-first code set ok=true and skipped the REST delete, so the row stayed
  // in Supabase and reappeared on reload.
  let ok = false;
  try {
    // Child rows must go first. fare_alerts / savings_confirmations are
    // ON DELETE CASCADE, but document_uploads (v5) and special_fare_cases (v4)
    // reference bookings(id) with NO cascade — Postgres then REFUSES the delete
    // with a foreign-key violation, which is why imported bookings could not be
    // removed. Null out those references instead of deleting the records.
    await supa.remove('fare_alerts', { booking_id: id }).catch(() => {});
    await supa.remove('savings_confirmations', { booking_id: id }).catch(() => {});
    await supa.update('document_uploads', { booking_id: id }, { booking_id: null }).catch(() => {});
    await supa.update('special_fare_cases', { booking_id: id }, { booking_id: null }).catch(() => {});
    await supa.update('booking_imports', { booking_id: id }, { booking_id: null }).catch(() => {});

    ok = await supa.remove('bookings', { id });
    if (!ok) console.error(`[DB] deleteBooking: Supabase refused DELETE for booking ${id} (see REST log above)`);
  } catch (e) { console.error('[DB] deleteBooking rest:', e.message); }

  // Best-effort cleanup for installs that DO have a real DATABASE_URL. Never let
  // this flip `ok` — REST is authoritative.
  try {
    await sql`DELETE FROM fare_alerts WHERE booking_id = ${id}`;
    await sql`DELETE FROM savings_confirmations WHERE booking_id = ${id}`;
    await sql`DELETE FROM activity_log WHERE entity_id = ${id} AND entity_type = 'booking'`;
    await sql`DELETE FROM bookings WHERE id = ${id}`;
  } catch { /* ignore — REST already handled the authoritative delete */ }

  inMemoryBookings.delete(id);
  return ok;
}

export async function getAdminBookings({ status, search, sort = 'created_at', order = 'desc', page = 1, limit = 50 } = {}) {
  // Reads the source of truth (Supabase REST). The status filter is pushed to the
  // server; free-text search and sort are applied here because the REST helper
  // has no `or`. Bounded by a generous fetch cap — revisit with a server-side
  // full-text filter if the table grows past that.
  try {
    const validSorts = ['created_at', 'hotel_name', 'original_price', 'total_savings', 'checkin_date', 'status'];
    const sortCol = validSorts.includes(sort) ? sort : 'created_at';

    const filters = (status && status !== 'all') ? { status } : {};
    const rows = await supa.select('bookings', filters, { order: `${sortCol}.${order === 'asc' ? 'asc' : 'desc'}`, limit: 5000 });
    let list = Array.isArray(rows) ? rows.map(toCamel) : [];

    if (search) {
      const s = String(search).toLowerCase();
      list = list.filter(b =>
        (b.hotelName || '').toLowerCase().includes(s) ||
        (b.email || '').toLowerCase().includes(s) ||
        (b.destination || '').toLowerCase().includes(s)
      );
    }

    const total = list.length;
    const offset = (page - 1) * limit;
    return { bookings: list.slice(offset, offset + limit), total, page, limit };
  } catch (e) {
    console.error('[DB] getAdminBookings:', e.message);
    return { bookings: [], total: 0, page, limit };
  }
}

// ─── Fare Alerts ─────────────────────────────────────────────

export async function createFareAlert(alert) {
  const row = Object.fromEntries(Object.entries(toSnake(alert)).filter(([, v]) => v !== undefined));
  // Supabase REST is the single source of truth (see getBookingsByEmail). Write
  // there authoritatively; the direct sql client points at a different database
  // in this deployment, so it is best-effort mirroring only.
  let created = null;
  try {
    const inserted = await supa.insert('fare_alerts', row);
    if (inserted) created = toCamel(inserted);
  } catch (e) {
    console.error('[DB] createFareAlert rest:', e.message);
  }
  sql`INSERT INTO fare_alerts ${sql(row)}`.catch(() => {});
  return created;
}

export async function getAlertsByBooking(bookingId) {
  const rows = await supa.select('fare_alerts', { booking_id: bookingId }, { order: 'created_at.desc' });
  return Array.isArray(rows) ? rows.map(toCamel) : [];
}

export async function getAlertsByEmail(email) {
  const bookings = await getBookingsByEmail(email);
  const ids = bookings.map(b => b.id).filter(Boolean);
  if (ids.length === 0) return [];
  const rows = await supa.select(
    'fare_alerts',
    { booking_id: { op: 'in', value: `(${ids.join(',')})` } },
    { order: 'created_at.desc', limit: 100 }
  );
  return Array.isArray(rows) ? rows.map(toCamel) : [];
}

// ─── Savings Confirmations ───────────────────────────────────

export async function createSavingsConfirmation(confirmation) {
  const row = Object.fromEntries(Object.entries(toSnake(confirmation)).filter(([, v]) => v !== undefined));
  let created = null;
  try {
    const inserted = await supa.insert('savings_confirmations', row);
    if (inserted) created = toCamel(inserted);
  } catch (e) {
    console.error('[DB] createSavingsConfirmation rest:', e.message);
  }
  sql`INSERT INTO savings_confirmations ${sql(row)}`.catch(() => {});
  return created;
}

export async function getConfirmationByBooking(bookingId) {
  const rows = await supa.select('savings_confirmations', { booking_id: bookingId }, { order: 'created_at.desc', limit: 1 });
  return Array.isArray(rows) && rows[0] ? toCamel(rows[0]) : null;
}

export async function updateUserConfirmedSavings(email) {
  const key = email.toLowerCase();
  try {
    const rows = await supa.select('savings_confirmations', { user_email: key, status: 'confirmed' }, { select: 'confirmed_savings' });
    const total = (Array.isArray(rows) ? rows : [])
      .reduce((sum, c) => sum + (parseFloat(c.confirmed_savings) || 0), 0);
    await supa.update('users', { email: key }, { confirmed_savings: Math.round(total * 100) / 100 });
  } catch (e) {
    console.error('[DB] updateUserConfirmedSavings:', e.message);
  }
}

// ─── Activity Log ────────────────────────────────────────────

export async function logActivity(entityType, entityId, action, actorEmail, details = {}) {
  if (typeof entityType === 'object' && entityType !== null) {
    const obj = entityType;
    entityType = obj.entityType;
    entityId = obj.entityId;
    action = obj.action;
    actorEmail = obj.actorEmail;
    details = obj.details || {};
  }
  const row = {
    entity_type: entityType,
    entity_id: entityId,
    action,
    actor_email: actorEmail || null,
    details: details || {},
  };
  try {
    await supa.insert('activity_log', row);
  } catch (e) {
    console.error('[DB] logActivity rest:', e.message);
  }
  sql`
    INSERT INTO activity_log (entity_type, entity_id, action, actor_email, details)
    VALUES (${entityType}, ${entityId}, ${action}, ${actorEmail || null}, ${sql.json(details || {})})
  `.catch(() => {});
}

export async function getActivityLog(entityType, entityId) {
  const rows = await supa.select(
    'activity_log',
    { entity_type: entityType, entity_id: entityId },
    { order: 'created_at.desc', limit: 50 }
  );
  return Array.isArray(rows) ? rows.map(toCamel) : [];
}

export async function getGlobalActivityLog(limit = 200, filters = {}) {
  const f = {};
  if (filters.entityType) f.entity_type = filters.entityType;
  if (filters.action) f.action = filters.action;
  const rows = await supa.select('activity_log', f, { order: 'created_at.desc', limit });
  return Array.isArray(rows) ? rows.map(toCamel) : [];
}

// ─── Special Fare Cases ─────────────────────────────────────

export async function createSpecialFare(fareCase) {
  const row = Object.fromEntries(Object.entries(toSnake(fareCase)).filter(([, v]) => v !== undefined));
  let created = null;
  try {
    const inserted = await supa.insert('special_fare_cases', row);
    if (inserted) created = toCamel(inserted);
  } catch (e) {
    console.error('[DB] createSpecialFare rest:', e.message);
  }
  sql`INSERT INTO special_fare_cases ${sql(row)}`.catch(() => {});
  return created;
}

export async function getSpecialFare(id) {
  const rows = await supa.select('special_fare_cases', { id }, { limit: 1 });
  return (Array.isArray(rows) && rows[0]) ? toCamel(rows[0]) : null;
}

export async function getAllSpecialFares(filters = {}) {
  const f = {};
  if (filters.status) f.status = filters.status;
  if (filters.assignedAgent) f.assigned_agent = filters.assignedAgent;
  const rows = await supa.select('special_fare_cases', f, { order: 'created_at.desc', limit: 200 });
  return Array.isArray(rows) ? rows.map(toCamel) : [];
}

export async function updateSpecialFare(id, updates) {
  const raw = toSnake({ ...updates, updatedAt: new Date().toISOString() });
  const row = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined));
  let updated = null;
  try {
    const res = await supa.update('special_fare_cases', { id }, row);
    if (res) updated = toCamel(res);
  } catch (e) {
    console.error('[DB] updateSpecialFare rest:', e.message);
  }
  sql`UPDATE special_fare_cases SET ${sql(row)} WHERE id = ${id}`.catch(() => {});
  return updated;
}

// ─── Document Uploads ────────────────────────────────────────

const inMemoryDocuments = new Map();

export async function createDocumentUpload(doc) {
  const fallbackId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const row = Object.fromEntries(Object.entries(toSnake(doc)).filter(([, v]) => v !== undefined));
  // REST authoritative; sql best-effort mirroring.
  try {
    const inserted = await supa.insert('document_uploads', row);
    if (inserted) {
      const r = toCamel(inserted);
      inMemoryDocuments.set(r.id, r);
      sql`INSERT INTO document_uploads ${sql(row)}`.catch(() => {});
      return r;
    }
  } catch (e) { console.error('[DB] createDocumentUpload rest:', e.message); }
  // Never return null — the upload route dereferences .id. Keep the flow alive.
  const record = { id: fallbackId, ...doc, createdAt: new Date().toISOString() };
  inMemoryDocuments.set(fallbackId, record);
  return record;
}

export async function getDocumentUpload(id) {
  try {
    const rows = await supa.select('document_uploads', { id }, { limit: 1 });
    if (Array.isArray(rows) && rows[0]) return toCamel(rows[0]);
  } catch (e) { console.error('[DB] getDocumentUpload rest:', e.message); }
  return inMemoryDocuments.get(id) || null;
}

export async function updateDocumentUpload(id, updates) {
  const raw = toSnake(updates);
  const row = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined));
  if (Object.keys(row).length === 0) return await getDocumentUpload(id);
  try {
    const updated = await supa.update('document_uploads', { id }, row);
    if (updated) {
      sql`UPDATE document_uploads SET ${sql(row)} WHERE id = ${id}`.catch(() => {});
      return toCamel(updated);
    }
  } catch (e) { console.error('[DB] updateDocumentUpload rest:', e.message); }
  const existing = inMemoryDocuments.get(id);
  if (existing) { const merged = { ...existing, ...updates }; inMemoryDocuments.set(id, merged); return merged; }
  try {
    return null;
  } catch (e) {
    console.error('[DB] updateDocumentUpload:', e.message);
    return null;
  }
}

// ─── Sessions ─────────────────────────────────────────────

const inMemorySessions = new Map();

export async function createSession(email, token) {
  const sess = {
    id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    user_email: email.toLowerCase(),
    userEmail: email.toLowerCase(),
    token,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
  inMemorySessions.set(token, sess);

  try {
    // REST is authoritative for sessions (auth-critical): they must live in the
    // same database as the `users` rows they are validated against.
    const res = await supa.insert('sessions', { user_email: email.toLowerCase(), token });
    if (res) {
      sql`INSERT INTO sessions (user_email, token) VALUES (${email.toLowerCase()}, ${token})`.catch(() => {});
      return res;
    }
  } catch (e) {
    console.error('[DB] createSession supa:', e.message);
  }
  return sess;
}

export async function getSessionByToken(token) {
  if (!token) return null;
  try {
    const rows = await supa.select('sessions', { token }, { limit: 1 });
    if (Array.isArray(rows) && rows[0]) {
      const sess = rows[0];
      if (!sess.expires_at || new Date(sess.expires_at) > new Date()) {
        return sess;
      }
    }
  } catch (e) {
    console.error('[DB] getSession supa:', e.message);
  }
  if (inMemorySessions.has(token)) {
    const sess = inMemorySessions.get(token);
    if (!sess.expires_at || new Date(sess.expires_at) > new Date()) {
      return { ...sess };
    }
  }
  return null;
}

export async function deleteSession(token) {
  inMemorySessions.delete(token);
  // REST is authoritative (logout must invalidate the session that auth reads).
  try {
    await supa.remove('sessions', { token });
  } catch (e) {
    console.error('[DB] deleteSession rest:', e.message);
  }
  sql`DELETE FROM sessions WHERE token = ${token}`.catch(() => {});
}

export async function deleteUserSessions(email) {
  const key = email.toLowerCase();
  try {
    await supa.remove('sessions', { user_email: key });
  } catch (e) {
    console.error('[DB] deleteUserSessions rest:', e.message);
  }
  sql`DELETE FROM sessions WHERE user_email = ${key}`.catch(() => {});
}

// ─── Password Resets ──────────────────────────────────────
// Auth-critical: these live in the same source of truth as `users` (Supabase
// REST). Previously sql-only, which pointed at a different database than the one
// holding the user rows — reset tokens could never be validated against them.

export async function createPasswordReset(email, token) {
  const key = email.toLowerCase();
  try {
    // Invalidate any outstanding tokens, then issue the new one.
    await supa.update('password_resets', { user_email: key, used: false }, { used: true });
    const inserted = await supa.insert('password_resets', { user_email: key, token });
    sql`UPDATE password_resets SET used = true WHERE user_email = ${key} AND used = false`.catch(() => {});
    return inserted || null;
  } catch (e) {
    console.error('[DB] createPasswordReset rest:', e.message);
    return null;
  }
}

export async function getPasswordReset(token) {
  const rows = await supa.select('password_resets', {
    token,
    used: false,
    expires_at: { op: 'gt', value: new Date().toISOString() },
  }, { limit: 1 });
  return (Array.isArray(rows) && rows[0]) || null;
}

export async function markPasswordResetUsed(token) {
  try {
    await supa.update('password_resets', { token }, { used: true });
  } catch (e) {
    console.error('[DB] markPasswordResetUsed rest:', e.message);
  }
  sql`UPDATE password_resets SET used = true WHERE token = ${token}`.catch(() => {});
}

// ─── Inbound Emails ──────────────────────────────────────────
const inMemoryInboundEmails = new Map();

export async function createInboundEmail(data) {
  const id = `inb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const record = {
    id,
    messageId: data.messageId,
    senderEmail: data.senderEmail,
    subject: data.subject,
    status: data.status || 'received',
    contentHash: data.contentHash,
    createdAt: new Date().toISOString(),
  };
  inMemoryInboundEmails.set(id, record);

  try {
    const row = {};
    if (data.messageId !== undefined) row.message_id = data.messageId;
    if (data.senderEmail !== undefined) row.sender_email = data.senderEmail;
    if (data.subject !== undefined) row.subject = data.subject;
    if (data.status !== undefined) row.status = data.status;
    if (data.contentHash !== undefined) row.content_hash = data.contentHash;
    const result = await supa.insert('inbound_emails', row);
    if (result) return toCamel(result);
  } catch (e) {
    console.error('[DB] createInboundEmail:', e.message);
  }
  return record;
}

export async function getInboundEmailByMessageId(messageId) {
  if (!messageId) return null;
  for (const record of inMemoryInboundEmails.values()) {
    if (record.messageId === messageId) return record;
  }
  try {
    const rows = await supa.select('inbound_emails', { message_id: messageId }, { limit: 1 });
    if (rows && rows[0]) return toCamel(rows[0]);
  } catch (e) {
    console.error('[DB] getInboundEmailByMessageId:', e.message);
  }
  return null;
}

export async function getInboundEmailByHash(hash) {
  if (!hash) return null;
  for (const record of inMemoryInboundEmails.values()) {
    if (record.contentHash === hash) return record;
  }
  try {
    const rows = await supa.select('inbound_emails', { content_hash: hash }, { limit: 1 });
    if (rows && rows[0]) return toCamel(rows[0]);
  } catch (e) {
    console.error('[DB] getInboundEmailByHash:', e.message);
  }
  return null;
}

export async function updateInboundEmail(id, updates) {
  try {
    const row = {};
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.processedAt !== undefined) row.processed_at = updates.processedAt;
    if (updates.failureReason !== undefined) row.failure_reason = updates.failureReason;
    if (Object.keys(row).length === 0) return null;
    const result = await supa.update('inbound_emails', { id }, row);
    return result ? toCamel(result) : null;
  } catch (e) {
    console.error('[DB] updateInboundEmail:', e.message);
    return null;
  }
}

// ─── Booking Imports ─────────────────────────────────────────
// Stored in memory & Supabase for maximum speed and 100% availability

const inMemoryBookingImports = new Map();

export async function createBookingImport(data) {
  const fallbackId = `imp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const record = {
    id: fallbackId,
    userEmail: data.userEmail || null,
    source: data.source || 'inbound_email',
    extractedData: data.extractedData || {},
    confidenceData: data.confidenceData || {},
    missingFields: data.missingFields || [],
    status: data.status || 'NEEDS_REVIEW',
    createdAt: new Date().toISOString(),
  };

  try {
    const row = {
      source: data.source || 'inbound_email',
      extracted_data: data.extractedData || {},
      confidence_data: data.confidenceData || {},
      missing_fields: Array.isArray(data.missingFields) ? data.missingFields : [],
      status: data.status || 'NEEDS_REVIEW',
    };
    if (data.userEmail) row.user_email = data.userEmail;
    if (data.inboundEmailId && typeof data.inboundEmailId === 'string' && /^[0-9a-f-]{36}$/i.test(data.inboundEmailId)) {
      row.inbound_email_id = data.inboundEmailId;
    }
    const result = await supa.insert('booking_imports', row);
    if (result) {
      const dbRec = toCamel(result);
      inMemoryBookingImports.set(dbRec.id, dbRec);
      return dbRec;
    }
  } catch (e) {
    console.error('[DB] createBookingImport error:', e.message);
  }

  inMemoryBookingImports.set(fallbackId, record);
  return record;
}

export async function getBookingImport(id) {
  if (!id) return null;
  if (inMemoryBookingImports.has(id)) {
    return inMemoryBookingImports.get(id);
  }
  try {
    const rows = await supa.select('booking_imports', { id }, { limit: 1 });
    if (rows && rows[0]) {
      const dbRec = toCamel(rows[0]);
      inMemoryBookingImports.set(dbRec.id, dbRec);
      return dbRec;
    }
  } catch (e) {
    console.error('[DB] getBookingImport error:', e.message);
  }
  return null;
}

export async function updateBookingImport(id, updates) {
  if (!id) return null;
  const existing = (await getBookingImport(id)) || { id };
  const updated = { ...existing, ...updates };
  inMemoryBookingImports.set(id, updated);

  try {
    const row = {};
    if (updates.userEmail !== undefined) row.user_email = updates.userEmail;
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.confirmedAt !== undefined) row.confirmed_at = updates.confirmedAt;
    if (updates.bookingId !== undefined) row.booking_id = updates.bookingId;
    if (updates.extractedData !== undefined) row.extracted_data = updates.extractedData;
    if (updates.confidenceData !== undefined) row.confidence_data = updates.confidenceData;
    if (updates.missingFields !== undefined) row.missing_fields = updates.missingFields;
    if (Object.keys(row).length > 0) {
      await supa.update('booking_imports', { id }, row);
    }
  } catch (e) {
    console.error('[DB] updateBookingImport error:', e.message);
  }
  return updated;
}

export async function getAllBookingImports(limit = 50) {
  let list = [];
  try {
    const rows = await supa.select('booking_imports', {}, { order: 'created_at.desc', limit });
    if (rows && rows.length > 0) list = rows.map(r => toCamel(r));
  } catch (e) {
    console.error('[DB] getAllBookingImports error:', e.message);
  }
  for (const imp of inMemoryBookingImports.values()) {
    if (!list.some(x => x.id === imp.id)) {
      list.push(imp);
    }
  }
  return list.slice(0, limit);
}

// ─── Pending Import Tokens ───────────────────────────────────
const inMemoryPendingTokens = new Map();

export async function createPendingImportToken(data) {
  const id = `tok-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const record = {
    id,
    bookingImportId: data.bookingImportId,
    email: data.email,
    tokenHash: data.tokenHash,
    expiresAt: data.expiresAt,
    createdAt: new Date().toISOString(),
  };
  inMemoryPendingTokens.set(data.tokenHash, record);

  try {
    const row = {
      booking_import_id: data.bookingImportId,
      email: data.email,
      token_hash: data.tokenHash,
      expires_at: data.expiresAt,
    };
    const result = await supa.insert('pending_import_tokens', row);
    if (result) return toCamel(result);
  } catch (e) {
    console.error('[DB] createPendingImportToken:', e.message);
  }
  return record;
}

export async function getPendingImportTokenByHash(tokenHash) {
  if (!tokenHash) return null;
  if (inMemoryPendingTokens.has(tokenHash)) {
    const record = inMemoryPendingTokens.get(tokenHash);
    if (!record.usedAt && new Date(record.expiresAt) > new Date()) {
      return record;
    }
  }
  try {
    const rows = await supa.select('pending_import_tokens', { token_hash: tokenHash, used_at: null }, { limit: 1 });
    if (rows && rows[0]) {
      const dbRec = toCamel(rows[0]);
      if (new Date(dbRec.expiresAt) > new Date()) return dbRec;
    }
  } catch (e) {
    console.error('[DB] getPendingImportTokenByHash:', e.message);
  }
  return null;
}

export async function markPendingImportTokenUsed(id) {
  try {
    await supa.update('pending_import_tokens', { id }, { used_at: new Date().toISOString() });
  } catch (e) {
    console.error('[DB] markPendingImportTokenUsed:', e.message);
  }
}

// ─── Extraction Usage ────────────────────────────────────────

export async function logExtractionUsage(data) {
  const row = Object.fromEntries(Object.entries(toSnake(data)).filter(([, v]) => v !== undefined));
  let created = null;
  try {
    const inserted = await supa.insert('extraction_usage', row);
    if (inserted) created = toCamel(inserted);
  } catch (e) {
    console.error('[DB] logExtractionUsage rest:', e.message);
  }
  sql`INSERT INTO extraction_usage ${sql(row)}`.catch(() => {});
  return created;
}

// ─── Hotel Mappings & Provider Usage Caps ──────────────────────

const inMemoryHotelMappings = new Map();
const inMemoryProviderUsage = new Map();

export async function getHotelMappingByKey(normalizedHotelKey) {
  if (!normalizedHotelKey) return null;
  if (inMemoryHotelMappings.has(normalizedHotelKey)) {
    return inMemoryHotelMappings.get(normalizedHotelKey);
  }
  const rows = await supa.select('hotel_mappings', { normalized_hotel_key: normalizedHotelKey }, { limit: 1 });
  if (Array.isArray(rows) && rows[0]) {
    const rec = toCamel(rows[0]);
    inMemoryHotelMappings.set(normalizedHotelKey, rec);
    return rec;
  }
  return null;
}

export async function upsertHotelMapping(data) {
  if (!data || !data.normalizedHotelKey) return null;
  const key = data.normalizedHotelKey;
  const record = {
    normalizedHotelKey: key,
    nuiteeHotelId: data.nuiteeHotelId || null,
    googlePlaceId: data.googlePlaceId || null,
    source: data.source || 'nuitee',
    matchScore: data.matchScore || 0,
    status: data.status || 'VERIFIED',
    hotelData: data.hotelData || {},
    imageData: data.imageData || [],
    verifiedAt: data.verifiedAt || new Date().toISOString(),
    approvedBy: data.approvedBy || null,
  };

  inMemoryHotelMappings.set(key, record);

  // Upsert against the source of truth (Supabase REST): update if the key exists,
  // otherwise insert. The REST helper has no native upsert.
  const row = {
    normalized_hotel_key: key,
    nuitee_hotel_id: data.nuiteeHotelId || null,
    google_place_id: data.googlePlaceId || null,
    source: data.source || 'nuitee',
    match_score: data.matchScore || 0,
    status: data.status || 'VERIFIED',
    hotel_data: data.hotelData || {},
    image_data: data.imageData || [],
    verified_at: data.verifiedAt || new Date().toISOString(),
  };
  try {
    const existing = await supa.select('hotel_mappings', { normalized_hotel_key: key }, { limit: 1 });
    if (Array.isArray(existing) && existing.length > 0) {
      await supa.update('hotel_mappings', { normalized_hotel_key: key }, row);
    } else {
      await supa.insert('hotel_mappings', row);
    }
  } catch (e) {
    console.error('[DB] upsertHotelMapping rest:', e.message);
  }
  return record;
}

/**
 * Atomically reserve one paid provider call against the daily cap.
 *
 * NOTE (scale): this deliberately still uses the direct `sql` client. Its
 * INSERT ... ON CONFLICT ... WHERE external_calls < cap is a single atomic
 * statement — the only thing that makes the cost cap safe under concurrency.
 * A Supabase REST select-then-update would introduce a race where two instances
 * both read under the cap and both increment, overspending the budget.
 * The in-memory fallback below is per-instance and therefore NOT safe across
 * multiple Railway replicas.
 * TODO: move this to a Supabase RPC (postgres function) so the atomic guarantee
 * lives in the same database as the rest of the source of truth.
 */
export async function checkAndConsumeProviderCap(provider, operation, dailyCap = 10, monthlyCap = 100) {
  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);
  const memoryKey = `${provider}:${operation}:${today}`;

  const currentCount = inMemoryProviderUsage.get(memoryKey) || 0;
  if (currentCount >= dailyCap) return false;

  try {
    const rows = await sql`
      INSERT INTO provider_usage (provider, operation, usage_date, calendar_month, external_calls)
      VALUES (${provider}, ${operation}, ${today}, ${currentMonth}, 1)
      ON CONFLICT (provider, operation, usage_date) DO UPDATE SET
        external_calls = provider_usage.external_calls + 1
      WHERE provider_usage.external_calls < ${dailyCap}
      RETURNING external_calls
    `;
    if (rows && rows[0]) {
      inMemoryProviderUsage.set(memoryKey, rows[0].external_calls);
      return true;
    } else {
      return false; // Cap hit
    }
  } catch (e) {
    console.error('[DB] checkAndConsumeProviderCap fallback to memory:', e.message);
    if (currentCount < dailyCap) {
      inMemoryProviderUsage.set(memoryKey, currentCount + 1);
      return true;
    }
    return false;
  }
}

// ─── Compat: expose sql client for index.js direct queries ────
export { sql as supabase };

