import postgres from 'postgres';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('[DB] Missing DATABASE_URL environment variable');
  process.exit(1);
}

const sql = postgres(connectionString, {
  ssl: 'require',
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

export async function getUserWithPassword(email) {
  try {
    const rows = await sql`SELECT * FROM users WHERE email = ${email.toLowerCase()} LIMIT 1`;
    return rows[0] ? toCamel(rows[0]) : null;
  } catch (e) {
    console.error('[DB] getUserWithPassword:', e.message);
    return null;
  }
}

export async function getUser(email) {
  const user = await getUserWithPassword(email);
  if (user) delete user.passwordHash;
  return user;
}

export async function createUser(email, name) {
  try {
    const rows = await sql`
      INSERT INTO users (email, name)
      VALUES (${email.toLowerCase()}, ${name || 'Guest'})
      RETURNING *
    `;
    return rows[0] ? toCamel(rows[0]) : null;
  } catch (e) {
    console.error('[DB] createUser:', e.message);
    return null;
  }
}

export async function getOrCreateUser(email, name) {
  if (!email) return null;
  let user = await getUser(email);
  if (user) {
    await sql`UPDATE users SET last_active = NOW() WHERE email = ${email.toLowerCase()}`;
    user.lastActive = new Date().toISOString();
    return user;
  }
  return await createUser(email, name);
}

export async function updateUser(email, updates) {
  try {
    const snake = toSnake(updates);
    const entries = Object.entries(snake).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return await getUser(email);
    const rows = await sql`
      UPDATE users SET ${sql(Object.fromEntries(entries))}
      WHERE email = ${email.toLowerCase()}
      RETURNING *
    `;
    return rows[0] ? toCamel(rows[0]) : null;
  } catch (e) {
    console.error('[DB] updateUser:', e.message);
    return null;
  }
}

export async function updateUserStats(email) {
  if (!email) return;
  try {
    const key = email.toLowerCase();
    const rows = await sql`SELECT total_savings FROM bookings WHERE email = ${key}`;
    const count = rows.length;
    const savings = rows.reduce((sum, b) => sum + (parseFloat(b.total_savings) || 0), 0);
    await sql`
      UPDATE users SET bookings_count = ${count}, total_savings = ${Math.round(savings * 100) / 100}
      WHERE email = ${key}
    `;
  } catch (e) {
    console.error('[DB] updateUserStats:', e.message);
  }
}

export async function getAllUsers(limit = 50) {
  try {
    const rows = await sql`SELECT * FROM users ORDER BY joined_at DESC LIMIT ${limit}`;
    return rows.map(r => { const u = toCamel(r); delete u.passwordHash; return u; });
  } catch (e) {
    console.error('[DB] getAllUsers:', e.message);
    return [];
  }
}

export async function getUserCount() {
  try {
    const rows = await sql`SELECT COUNT(*)::int AS count FROM users`;
    return rows[0]?.count || 0;
  } catch (e) {
    console.error('[DB] getUserCount:', e.message);
    return 0;
  }
}

// ─── Bookings ───────────────────────────────────────────────

export async function getBooking(id) {
  try {
    const rows = await sql`SELECT * FROM bookings WHERE id = ${id} LIMIT 1`;
    return rows[0] ? toCamel(rows[0]) : null;
  } catch (e) {
    console.error('[DB] getBooking:', e.message);
    return null;
  }
}

export async function getBookingsByEmail(email) {
  try {
    const rows = await sql`SELECT * FROM bookings WHERE email = ${email.toLowerCase()} ORDER BY created_at DESC`;
    return rows.map(toCamel);
  } catch (e) {
    console.error('[DB] getBookingsByEmail:', e.message);
    return [];
  }
}

export async function getAllBookings() {
  try {
    const rows = await sql`SELECT * FROM bookings ORDER BY created_at DESC`;
    return rows.map(toCamel);
  } catch (e) {
    console.error('[DB] getAllBookings:', e.message);
    return [];
  }
}

export async function createBooking(booking) {
  try {
    const raw = toSnake(booking);
    // Filter to only defined values
    const row = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined));
    const rows = await sql`INSERT INTO bookings ${sql(row)} RETURNING *`;
    return rows[0] ? toCamel(rows[0]) : null;
  } catch (e) {
    console.error('[DB] createBooking:', e.message);
    return null;
  }
}

export async function updateBooking(id, updates) {
  try {
    const raw = toSnake(updates);
    const row = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined));
    if (Object.keys(row).length === 0) return await getBooking(id);
    const rows = await sql`UPDATE bookings SET ${sql(row)} WHERE id = ${id} RETURNING *`;
    return rows[0] ? toCamel(rows[0]) : null;
  } catch (e) {
    console.error('[DB] updateBooking:', e.message);
    return null;
  }
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
  try {
    let rows;
    if (email) {
      rows = await sql`SELECT total_savings, potential_savings, status FROM bookings WHERE email = ${email.toLowerCase()}`;
    } else {
      rows = await sql`SELECT total_savings, potential_savings, status FROM bookings`;
    }
    const allBookings = rows;
    const confirmedSavings = allBookings
      .filter(b => b.status === 'confirmed_savings')
      .reduce((sum, b) => sum + (parseFloat(b.total_savings) || 0), 0);
    const potentialSavings = allBookings
      .filter(b => ['lower_fare_found', 'savings_found'].includes(b.status))
      .reduce((sum, b) => sum + (parseFloat(b.potential_savings) || parseFloat(b.total_savings) || 0), 0);
    const dropsFound = allBookings.filter(b =>
      ['lower_fare_found', 'savings_found', 'confirmed_savings', 'pending_user_confirmation'].includes(b.status)
    ).length;
    const total = allBookings.length;
    return {
      totalBookings: total, savingsFound: dropsFound,
      confirmedSavings: Math.round(confirmedSavings * 100) / 100,
      potentialSavings: Math.round(potentialSavings * 100) / 100,
      totalSavings: Math.round(confirmedSavings * 100) / 100,
      avgSavings: dropsFound > 0 ? Math.round(((confirmedSavings + potentialSavings) / dropsFound) * 100) / 100 : 0,
      successRate: total > 0 ? Math.round((dropsFound / total) * 100) : 0,
    };
  } catch (e) {
    console.error('[DB] getStats:', e.message);
    return null;
  }
}

export async function deleteBooking(id) {
  try {
    await sql`DELETE FROM fare_alerts WHERE booking_id = ${id}`;
    await sql`DELETE FROM savings_confirmations WHERE booking_id = ${id}`;
    await sql`DELETE FROM activity_log WHERE entity_id = ${id} AND entity_type = 'booking'`;
    await sql`DELETE FROM bookings WHERE id = ${id}`;
    return true;
  } catch (e) {
    console.error('[DB] deleteBooking:', e.message);
    return false;
  }
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
  try {
    const row = Object.fromEntries(Object.entries(toSnake(alert)).filter(([, v]) => v !== undefined));
    const rows = await sql`INSERT INTO fare_alerts ${sql(row)} RETURNING *`;
    return rows[0] ? toCamel(rows[0]) : null;
  } catch (e) {
    console.error('[DB] createFareAlert:', e.message);
    return null;
  }
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

export async function createDocumentUpload(doc) {
  try {
    const row = Object.fromEntries(Object.entries(toSnake(doc)).filter(([, v]) => v !== undefined));
    const rows = await sql`INSERT INTO document_uploads ${sql(row)} RETURNING *`;
    return rows[0] ? toCamel(rows[0]) : null;
  } catch (e) {
    console.error('[DB] createDocumentUpload:', e.message);
    return null;
  }
}

export async function getDocumentUpload(id) {
  try {
    const rows = await sql`SELECT * FROM document_uploads WHERE id = ${id} LIMIT 1`;
    return rows[0] ? toCamel(rows[0]) : null;
  } catch (e) {
    console.error('[DB] getDocumentUpload:', e.message);
    return null;
  }
}

export async function updateDocumentUpload(id, updates) {
  try {
    const raw = toSnake(updates);
    const row = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined));
    if (Object.keys(row).length === 0) return await getDocumentUpload(id);
    const rows = await sql`UPDATE document_uploads SET ${sql(row)} WHERE id = ${id} RETURNING *`;
    return rows[0] ? toCamel(rows[0]) : null;
  } catch (e) {
    console.error('[DB] updateDocumentUpload:', e.message);
    return null;
  }
}

// ─── Sessions ─────────────────────────────────────────────

export async function createSession(email, token) {
  try {
    const rows = await sql`
      INSERT INTO sessions (user_email, token)
      VALUES (${email.toLowerCase()}, ${token})
      RETURNING *
    `;
    return rows[0];
  } catch (e) {
    console.error('[DB] createSession:', e.message);
    return null;
  }
}

export async function getSessionByToken(token) {
  try {
    const rows = await sql`
      SELECT * FROM sessions
      WHERE token = ${token} AND expires_at > NOW()
      LIMIT 1
    `;
    return rows[0] || null;
  } catch (e) {
    console.error('[DB] getSession:', e.message);
    return null;
  }
}

export async function deleteSession(token) {
  try {
    await sql`DELETE FROM sessions WHERE token = ${token}`;
  } catch (e) {
    console.error('[DB] deleteSession:', e.message);
  }
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

// ─── Compat: expose sql client for index.js direct queries ────
export { sql as supabase };
