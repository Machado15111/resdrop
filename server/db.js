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
  try {
    const rows = await sql`SELECT * FROM users WHERE email = ${key} LIMIT 1`;
    if (rows && rows[0]) return toCamel(rows[0]);
  } catch (e) {
    console.error('[DB] getUserWithPassword sql:', e.message);
  }
  try {
    const rows = await supa.select('users', { email: key }, { limit: 1 });
    if (rows && rows[0]) return toCamel(rows[0]);
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
  try {
    const rows = await sql`
      INSERT INTO users (email, name)
      VALUES (${key}, ${name || 'Guest'})
      RETURNING *
    `;
    if (rows && rows[0]) return toCamel(rows[0]);
  } catch (e) {
    console.error('[DB] createUser sql:', e.message);
  }
  try {
    const row = await supa.insert('users', { email: key, name: name || 'Guest' });
    if (row) return toCamel(row);
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
    try {
      await sql`UPDATE users SET last_active = NOW() WHERE email = ${email.toLowerCase()}`;
    } catch {}
    user.lastActive = new Date().toISOString();
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

  try {
    const snake = toSnake(updates);
    const entries = Object.entries(snake).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return await getUser(email);
    const rows = await sql`
      UPDATE users SET ${sql(Object.fromEntries(entries))}
      WHERE email = ${key}
      RETURNING *
    `;
    if (rows && rows[0]) return toCamel(rows[0]);
  } catch (e) {
    console.error('[DB] updateUser sql:', e.message);
  }
  try {
    const snake = toSnake(updates);
    const row = await supa.update('users', { email: key }, snake);
    if (row) return toCamel(row);
  } catch (e) {
    console.error('[DB] updateUser supa:', e.message);
  }
  return await getUser(email);
}

export async function updateUserStats(email) {
  if (!email) return;
  try {
    const key = email.toLowerCase();
    let rows = [];
    try {
      rows = await sql`SELECT total_savings FROM bookings WHERE email = ${key}`;
    } catch {
      rows = await supa.select('bookings', { email: key }, { select: 'total_savings' });
    }
    const count = rows ? rows.length : 0;
    const savings = (rows || []).reduce((sum, b) => sum + (parseFloat(b.total_savings) || 0), 0);
    try {
      await sql`
        UPDATE users SET bookings_count = ${count}, total_savings = ${Math.round(savings * 100) / 100}
        WHERE email = ${key}
      `;
    } catch {
      await supa.update('users', { email: key }, { bookings_count: count, total_savings: Math.round(savings * 100) / 100 });
    }
  } catch (e) {
    console.error('[DB] updateUserStats:', e.message);
  }
}

export async function getAllUsers(limit = 50) {
  let list = [];
  try {
    const rows = await sql`SELECT * FROM users ORDER BY joined_at DESC LIMIT ${limit}`;
    if (rows && rows.length > 0) list = rows.map(r => { const u = toCamel(r); delete u.passwordHash; return u; });
  } catch (e) {
    console.error('[DB] getAllUsers sql:', e.message);
  }
  if (list.length === 0) {
    try {
      const rows = await supa.select('users', {}, { order: 'joined_at.desc', limit });
      if (rows && rows.length > 0) list = rows.map(r => { const u = toCamel(r); delete u.passwordHash; return u; });
    } catch (e) {
      console.error('[DB] getAllUsers supa:', e.message);
    }
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
  try {
    const rows = await sql`SELECT COUNT(*)::int AS count FROM users`;
    if (rows && rows[0] && rows[0].count > 0) return rows[0].count;
  } catch (e) {
    console.error('[DB] getUserCount:', e.message);
  }
  return inMemoryUsers.size;
}

// ─── Bookings ───────────────────────────────────────────────

const inMemoryBookings = new Map();

export async function getBooking(id) {
  if (!id) return null;
  try {
    if (typeof id === 'string' && id.length === 36 && !id.startsWith('bkg-')) {
      const rows = await sql`SELECT * FROM bookings WHERE id = ${id} LIMIT 1`;
      if (rows && rows[0]) return toCamel(rows[0]);
      const sRows = await supa.select('bookings', { id }, { limit: 1 });
      if (sRows && sRows[0]) return toCamel(sRows[0]);
    }
  } catch (e) {
    console.error('[DB] getBooking:', e.message);
  }
  return inMemoryBookings.get(id) || null;
}

export async function getBookingsByEmail(email) {
  const normalizedEmail = (email || '').toLowerCase();
  let list = [];
  try {
    const rows = await sql`SELECT * FROM bookings WHERE email = ${normalizedEmail} ORDER BY created_at DESC`;
    if (rows && rows.length > 0) list = rows.map(toCamel);
  } catch (e) {
    console.error('[DB] getBookingsByEmail sql:', e.message);
  }
  if (list.length === 0) {
    try {
      const rows = await supa.select('bookings', { email: normalizedEmail }, { order: 'created_at.desc' });
      if (rows && rows.length > 0) list = rows.map(toCamel);
    } catch (e) {}
  }
  for (const b of inMemoryBookings.values()) {
    if (b.email === normalizedEmail && !list.some(x => x.id === b.id)) {
      list.unshift(b);
    }
  }
  return list;
}

export async function getAllBookings() {
  let list = [];
  try {
    const rows = await sql`SELECT * FROM bookings ORDER BY created_at DESC`;
    if (rows && rows.length > 0) list = rows.map(toCamel);
  } catch (e) {
    console.error('[DB] getAllBookings sql:', e.message);
  }
  if (list.length === 0) {
    try {
      const rows = await supa.select('bookings', {}, { order: 'created_at.desc', limit: 200 });
      if (rows && rows.length > 0) list = rows.map(toCamel);
    } catch (e) {}
  }
  for (const b of inMemoryBookings.values()) {
    if (!list.some(x => x.id === b.id)) {
      list.unshift(b);
    }
  }
  return list;
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
  // Try direct sql; if the connection is unavailable (no valid DATABASE_URL),
  // fall back to the Supabase REST layer so monitoring updates still persist.
  try {
    const rows = await sql`UPDATE bookings SET ${sql(row)} WHERE id = ${id} RETURNING *`;
    if (rows && rows[0]) {
      const rec = toCamel(rows[0]);
      inMemoryBookings.set(rec.id, rec);
      return rec;
    }
  } catch (e) {
    console.error('[DB] updateBooking sql:', e.message);
  }
  try {
    const updated = await supa.update('bookings', { id }, row);
    if (updated) {
      const rec = toCamel(updated);
      inMemoryBookings.set(rec.id, rec);
      return rec;
    }
  } catch (e) {
    console.error('[DB] updateBooking rest:', e.message);
  }
  const existing = inMemoryBookings.get(id);
  if (existing) {
    const merged = { ...existing, ...updates };
    inMemoryBookings.set(id, merged);
    return merged;
  }
  return null;
}

export async function getBookingCount() {
  try {
    const rows = await sql`SELECT COUNT(*)::int AS count FROM bookings`;
    return rows[0]?.count || 0;
  } catch (e) {
    console.error('[DB] getBookingCount:', e.message);
    return 0;
  }
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
    let allBookings = [];
    if (process.env.DATABASE_URL) {
      const key = email ? email.toLowerCase() : null;
      allBookings = key
        ? await sql`SELECT total_savings, potential_savings, status FROM bookings WHERE email = ${key}`
        : await sql`SELECT total_savings, potential_savings, status FROM bookings`;
    } else {
      allBookings = await getBookings(email);
    }
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
  let ok = false;
  try {
    await sql`DELETE FROM fare_alerts WHERE booking_id = ${id}`;
    await sql`DELETE FROM savings_confirmations WHERE booking_id = ${id}`;
    await sql`DELETE FROM activity_log WHERE entity_id = ${id} AND entity_type = 'booking'`;
    await sql`DELETE FROM bookings WHERE id = ${id}`;
    ok = true;
  } catch (e) { console.error('[DB] deleteBooking sql:', e.message); }
  if (!ok) {
    // sql client unavailable → delete via REST (child rows cascade or are best-effort).
    try {
      await supa.remove('fare_alerts', { booking_id: id }).catch(() => {});
      await supa.remove('bookings', { id });
      ok = true;
    } catch (e) { console.error('[DB] deleteBooking rest:', e.message); }
  }
  inMemoryBookings.delete(id);
  return ok;
}

export async function getAdminBookings({ status, search, sort = 'created_at', order = 'desc', page = 1, limit = 50 } = {}) {
  try {
    const validSorts = ['created_at', 'hotel_name', 'original_price', 'total_savings', 'checkin_date', 'status'];
    const sortCol = validSorts.includes(sort) ? sort : 'created_at';
    const dir = order === 'asc' ? sql`ASC` : sql`DESC`;
    const offset = (page - 1) * limit;

    let rows, countRows;
    if (status && status !== 'all' && search) {
      const s = `%${search.replace(/[%_\\]/g, '')}%`;
      rows = await sql`SELECT * FROM bookings WHERE status = ${status} AND (hotel_name ILIKE ${s} OR email ILIKE ${s} OR destination ILIKE ${s}) ORDER BY ${sql(sortCol)} ${dir} LIMIT ${limit} OFFSET ${offset}`;
      countRows = await sql`SELECT COUNT(*)::int AS count FROM bookings WHERE status = ${status} AND (hotel_name ILIKE ${s} OR email ILIKE ${s} OR destination ILIKE ${s})`;
    } else if (status && status !== 'all') {
      rows = await sql`SELECT * FROM bookings WHERE status = ${status} ORDER BY ${sql(sortCol)} ${dir} LIMIT ${limit} OFFSET ${offset}`;
      countRows = await sql`SELECT COUNT(*)::int AS count FROM bookings WHERE status = ${status}`;
    } else if (search) {
      const s = `%${search.replace(/[%_\\]/g, '')}%`;
      rows = await sql`SELECT * FROM bookings WHERE hotel_name ILIKE ${s} OR email ILIKE ${s} OR destination ILIKE ${s} ORDER BY ${sql(sortCol)} ${dir} LIMIT ${limit} OFFSET ${offset}`;
      countRows = await sql`SELECT COUNT(*)::int AS count FROM bookings WHERE hotel_name ILIKE ${s} OR email ILIKE ${s} OR destination ILIKE ${s}`;
    } else {
      rows = await sql`SELECT * FROM bookings ORDER BY ${sql(sortCol)} ${dir} LIMIT ${limit} OFFSET ${offset}`;
      countRows = await sql`SELECT COUNT(*)::int AS count FROM bookings`;
    }
    return { bookings: rows.map(toCamel), total: countRows[0]?.count || 0, page, limit };
  } catch (e) {
    console.error('[DB] getAdminBookings:', e.message);
    return { bookings: [], total: 0, page, limit };
  }
}

// ─── Fare Alerts ─────────────────────────────────────────────

export async function createFareAlert(alert) {
  const row = Object.fromEntries(Object.entries(toSnake(alert)).filter(([, v]) => v !== undefined));
  try {
    const rows = await sql`INSERT INTO fare_alerts ${sql(row)} RETURNING *`;
    if (rows && rows[0]) return toCamel(rows[0]);
  } catch (e) {
    console.error('[DB] createFareAlert sql:', e.message);
  }
  try {
    const inserted = await supa.insert('fare_alerts', row);
    if (inserted) return toCamel(inserted);
  } catch (e) {
    console.error('[DB] createFareAlert rest:', e.message);
  }
  return null;
}

export async function getAlertsByBooking(bookingId) {
  try {
    const rows = await sql`SELECT * FROM fare_alerts WHERE booking_id = ${bookingId} ORDER BY created_at DESC`;
    return rows.map(toCamel);
  } catch (e) {
    console.error('[DB] getAlertsByBooking:', e.message);
    return [];
  }
}

export async function getAlertsByEmail(email) {
  try {
    const bookings = await getBookingsByEmail(email);
    const ids = bookings.map(b => b.id);
    if (ids.length === 0) return [];
    const rows = await sql`SELECT * FROM fare_alerts WHERE booking_id = ANY(${ids}) ORDER BY created_at DESC LIMIT 100`;
    return rows.map(toCamel);
  } catch (e) {
    console.error('[DB] getAlertsByEmail:', e.message);
    return [];
  }
}

// ─── Savings Confirmations ───────────────────────────────────

export async function createSavingsConfirmation(confirmation) {
  try {
    const row = Object.fromEntries(Object.entries(toSnake(confirmation)).filter(([, v]) => v !== undefined));
    const rows = await sql`INSERT INTO savings_confirmations ${sql(row)} RETURNING *`;
    return rows[0] ? toCamel(rows[0]) : null;
  } catch (e) {
    console.error('[DB] createSavingsConfirmation:', e.message);
    return null;
  }
}

export async function getConfirmationByBooking(bookingId) {
  try {
    const rows = await sql`SELECT * FROM savings_confirmations WHERE booking_id = ${bookingId} ORDER BY created_at DESC LIMIT 1`;
    return rows[0] ? toCamel(rows[0]) : null;
  } catch (e) {
    console.error('[DB] getConfirmationByBooking:', e.message);
    return null;
  }
}

export async function updateUserConfirmedSavings(email) {
  try {
    const key = email.toLowerCase();
    const rows = await sql`SELECT confirmed_savings FROM savings_confirmations WHERE user_email = ${key} AND status = 'confirmed'`;
    const total = rows.reduce((sum, c) => sum + (parseFloat(c.confirmed_savings) || 0), 0);
    await sql`UPDATE users SET confirmed_savings = ${Math.round(total * 100) / 100} WHERE email = ${key}`;
  } catch (e) {
    console.error('[DB] updateUserConfirmedSavings:', e.message);
  }
}

// ─── Activity Log ────────────────────────────────────────────

export async function logActivity(entityType, entityId, action, actorEmail, details = {}) {
  try {
    await sql`
      INSERT INTO activity_log (entity_type, entity_id, action, actor_email, details)
      VALUES (${entityType}, ${entityId}, ${action}, ${actorEmail || null}, ${sql.json(details)})
    `;
  } catch (e) {
    console.error('[DB] logActivity:', e.message);
  }
}

export async function getActivityLog(entityType, entityId) {
  try {
    const rows = await sql`SELECT * FROM activity_log WHERE entity_type = ${entityType} AND entity_id = ${entityId} ORDER BY created_at DESC LIMIT 50`;
    return rows.map(toCamel);
  } catch (e) {
    console.error('[DB] getActivityLog:', e.message);
    return [];
  }
}

export async function getGlobalActivityLog(limit = 200, filters = {}) {
  try {
    let rows;
    if (filters.entityType && filters.action) {
      rows = await sql`SELECT * FROM activity_log WHERE entity_type = ${filters.entityType} AND action = ${filters.action} ORDER BY created_at DESC LIMIT ${limit}`;
    } else if (filters.entityType) {
      rows = await sql`SELECT * FROM activity_log WHERE entity_type = ${filters.entityType} ORDER BY created_at DESC LIMIT ${limit}`;
    } else if (filters.action) {
      rows = await sql`SELECT * FROM activity_log WHERE action = ${filters.action} ORDER BY created_at DESC LIMIT ${limit}`;
    } else {
      rows = await sql`SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ${limit}`;
    }
    return rows.map(toCamel);
  } catch (e) {
    console.error('[DB] getGlobalActivityLog:', e.message);
    return [];
  }
}

// ─── Special Fare Cases ─────────────────────────────────────

export async function createSpecialFare(fareCase) {
  try {
    const row = Object.fromEntries(Object.entries(toSnake(fareCase)).filter(([, v]) => v !== undefined));
    const rows = await sql`INSERT INTO special_fare_cases ${sql(row)} RETURNING *`;
    return rows[0] ? toCamel(rows[0]) : null;
  } catch (e) {
    console.error('[DB] createSpecialFare:', e.message);
    return null;
  }
}

export async function getSpecialFare(id) {
  try {
    const rows = await sql`SELECT * FROM special_fare_cases WHERE id = ${id} LIMIT 1`;
    return rows[0] ? toCamel(rows[0]) : null;
  } catch (e) {
    console.error('[DB] getSpecialFare:', e.message);
    return null;
  }
}

export async function getAllSpecialFares(filters = {}) {
  try {
    let rows;
    if (filters.status && filters.assignedAgent) {
      rows = await sql`SELECT * FROM special_fare_cases WHERE status = ${filters.status} AND assigned_agent = ${filters.assignedAgent} ORDER BY created_at DESC LIMIT 200`;
    } else if (filters.status) {
      rows = await sql`SELECT * FROM special_fare_cases WHERE status = ${filters.status} ORDER BY created_at DESC LIMIT 200`;
    } else if (filters.assignedAgent) {
      rows = await sql`SELECT * FROM special_fare_cases WHERE assigned_agent = ${filters.assignedAgent} ORDER BY created_at DESC LIMIT 200`;
    } else {
      rows = await sql`SELECT * FROM special_fare_cases ORDER BY created_at DESC LIMIT 200`;
    }
    return rows.map(toCamel);
  } catch (e) {
    console.error('[DB] getAllSpecialFares:', e.message);
    return [];
  }
}

export async function updateSpecialFare(id, updates) {
  try {
    const raw = toSnake({ ...updates, updatedAt: new Date().toISOString() });
    const row = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined));
    const rows = await sql`UPDATE special_fare_cases SET ${sql(row)} WHERE id = ${id} RETURNING *`;
    return rows[0] ? toCamel(rows[0]) : null;
  } catch (e) {
    console.error('[DB] updateSpecialFare:', e.message);
    return null;
  }
}

// ─── Document Uploads ────────────────────────────────────────

const inMemoryDocuments = new Map();

export async function createDocumentUpload(doc) {
  const fallbackId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const row = Object.fromEntries(Object.entries(toSnake(doc)).filter(([, v]) => v !== undefined));
  try {
    const rows = await sql`INSERT INTO document_uploads ${sql(row)} RETURNING *`;
    if (rows && rows[0]) { const r = toCamel(rows[0]); inMemoryDocuments.set(r.id, r); return r; }
  } catch (e) { console.error('[DB] createDocumentUpload sql:', e.message); }
  try {
    const inserted = await supa.insert('document_uploads', row);
    if (inserted) { const r = toCamel(inserted); inMemoryDocuments.set(r.id, r); return r; }
  } catch (e) { console.error('[DB] createDocumentUpload rest:', e.message); }
  // Never return null — the upload route dereferences .id. Keep the flow alive.
  const record = { id: fallbackId, ...doc, createdAt: new Date().toISOString() };
  inMemoryDocuments.set(fallbackId, record);
  return record;
}

export async function getDocumentUpload(id) {
  try {
    const rows = await sql`SELECT * FROM document_uploads WHERE id = ${id} LIMIT 1`;
    if (rows && rows[0]) return toCamel(rows[0]);
  } catch (e) { console.error('[DB] getDocumentUpload sql:', e.message); }
  try {
    const rows = await supa.select('document_uploads', { id }, { limit: 1 });
    if (rows && rows[0]) return toCamel(rows[0]);
  } catch (e) { /* fall through */ }
  return inMemoryDocuments.get(id) || null;
}

export async function updateDocumentUpload(id, updates) {
  const raw = toSnake(updates);
  const row = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined));
  if (Object.keys(row).length === 0) return await getDocumentUpload(id);
  try {
    const rows = await sql`UPDATE document_uploads SET ${sql(row)} WHERE id = ${id} RETURNING *`;
    if (rows && rows[0]) return toCamel(rows[0]);
  } catch (e) { console.error('[DB] updateDocumentUpload sql:', e.message); }
  try {
    const updated = await supa.update('document_uploads', { id }, row);
    if (updated) return toCamel(updated);
  } catch (e) { /* fall through */ }
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
    const rows = await sql`
      INSERT INTO sessions (user_email, token)
      VALUES (${email.toLowerCase()}, ${token})
      RETURNING *
    `;
    if (rows && rows[0]) return rows[0];
  } catch (e) {
    console.error('[DB] createSession sql:', e.message);
  }
  try {
    const res = await supa.insert('sessions', { user_email: email.toLowerCase(), token });
    if (res) return res;
  } catch (e) {
    console.error('[DB] createSession supa:', e.message);
  }
  return sess;
}

export async function getSessionByToken(token) {
  if (!token) return null;
  try {
    const rows = await sql`
      SELECT * FROM sessions
      WHERE token = ${token} AND expires_at > NOW()
      LIMIT 1
    `;
    if (rows && rows[0]) return rows[0];
  } catch (e) {
    console.error('[DB] getSession sql:', e.message);
  }
  try {
    const rows = await supa.select('sessions', { token }, { limit: 1 });
    if (rows && rows[0]) {
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
  try {
    await sql`DELETE FROM sessions WHERE token = ${token}`;
  } catch (e) {
    console.error('[DB] deleteSession:', e.message);
  }
  try {
    await supa.remove('sessions', { token });
  } catch {}
}

export async function deleteUserSessions(email) {
  try {
    await sql`DELETE FROM sessions WHERE user_email = ${email.toLowerCase()}`;
  } catch (e) {
    console.error('[DB] deleteUserSessions:', e.message);
  }
}

// ─── Password Resets ──────────────────────────────────────

export async function createPasswordReset(email, token) {
  try {
    const key = email.toLowerCase();
    await sql`UPDATE password_resets SET used = true WHERE user_email = ${key} AND used = false`;
    const rows = await sql`
      INSERT INTO password_resets (user_email, token)
      VALUES (${key}, ${token})
      RETURNING *
    `;
    return rows[0];
  } catch (e) {
    console.error('[DB] createPasswordReset:', e.message);
    return null;
  }
}

export async function getPasswordReset(token) {
  try {
    const rows = await sql`
      SELECT * FROM password_resets
      WHERE token = ${token} AND used = false AND expires_at > NOW()
      LIMIT 1
    `;
    return rows[0] || null;
  } catch (e) {
    console.error('[DB] getPasswordReset:', e.message);
    return null;
  }
}

export async function markPasswordResetUsed(token) {
  try {
    await sql`UPDATE password_resets SET used = true WHERE token = ${token}`;
  } catch (e) {
    console.error('[DB] markPasswordResetUsed:', e.message);
  }
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
  try {
    const row = Object.fromEntries(Object.entries(toSnake(data)).filter(([, v]) => v !== undefined));
    const rows = await sql`INSERT INTO extraction_usage ${sql(row)} RETURNING *`;
    return rows[0] ? toCamel(rows[0]) : null;
  } catch (e) {
    console.error('[DB] logExtractionUsage:', e.message);
    return null;
  }
}

// ─── Hotel Mappings & Provider Usage Caps ──────────────────────

const inMemoryHotelMappings = new Map();
const inMemoryProviderUsage = new Map();

export async function getHotelMappingByKey(normalizedHotelKey) {
  if (!normalizedHotelKey) return null;
  if (inMemoryHotelMappings.has(normalizedHotelKey)) {
    return inMemoryHotelMappings.get(normalizedHotelKey);
  }
  try {
    const rows = await sql`SELECT * FROM hotel_mappings WHERE normalized_hotel_key = ${normalizedHotelKey} LIMIT 1`;
    if (rows && rows[0]) {
      const rec = toCamel(rows[0]);
      inMemoryHotelMappings.set(normalizedHotelKey, rec);
      return rec;
    }
  } catch (e) {
    console.error('[DB] getHotelMappingByKey:', e.message);
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

  try {
    const row = {
      normalized_hotel_key: key,
      nuitee_hotel_id: data.nuiteeHotelId || null,
      google_place_id: data.googlePlaceId || null,
      source: data.source || 'nuitee',
      match_score: data.matchScore || 0,
      status: data.status || 'VERIFIED',
      hotel_data: sql.json(data.hotelData || {}),
      image_data: sql.json(data.imageData || []),
      verified_at: data.verifiedAt || new Date().toISOString(),
    };
    await sql`
      INSERT INTO hotel_mappings ${sql(row)}
      ON CONFLICT (normalized_hotel_key) DO UPDATE SET
        nuitee_hotel_id = EXCLUDED.nuitee_hotel_id,
        google_place_id = EXCLUDED.google_place_id,
        source = EXCLUDED.source,
        match_score = EXCLUDED.match_score,
        status = EXCLUDED.status,
        hotel_data = EXCLUDED.hotel_data,
        image_data = EXCLUDED.image_data,
        verified_at = EXCLUDED.verified_at
    `;
  } catch (e) {
    console.error('[DB] upsertHotelMapping error:', e.message);
  }
  return record;
}

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

