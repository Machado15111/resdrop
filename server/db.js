import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // use service_role key on server

if (!supabaseUrl || !supabaseKey) {
  console.error('[DB] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in server/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Camel ↔ Snake helpers ─────────────────────────────────
// DB uses snake_case, app uses camelCase

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
  };
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[map[k] || k] = v;
  }
  // Compat: frontend uses .bookings, DB uses bookings_count
  if (out.bookingsCount !== undefined) {
    out.bookings = out.bookingsCount;
  }
  return out;
}

// ─── Users ──────────────────────────────────────────────────

export async function getUserWithPassword(email) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();
  if (error && error.code !== 'PGRST116') console.error('[DB] getUserWithPassword:', error.message);
  return data ? toCamel(data) : null;
}

export async function getUser(email) {
  const user = await getUserWithPassword(email);
  if (user) delete user.passwordHash;
  return user;
}

export async function createUser(email, name) {
  const { data, error } = await supabase
    .from('users')
    .insert({ email: email.toLowerCase(), name: name || 'Guest' })
    .select()
    .single();
  if (error) { console.error('[DB] createUser:', error.message); return null; }
  return toCamel(data);
}

export async function getOrCreateUser(email, name) {
  if (!email) return null;
  let user = await getUser(email);
  if (user) {
    // Update last_active
    await supabase
      .from('users')
      .update({ last_active: new Date().toISOString() })
      .eq('email', email.toLowerCase());
    user.lastActive = new Date().toISOString();
    return user;
  }
  return await createUser(email, name);
}

export async function updateUser(email, updates) {
  const { data, error } = await supabase
    .from('users')
    .update(toSnake(updates))
    .eq('email', email.toLowerCase())
    .select()
    .single();
  if (error) console.error('[DB] updateUser:', error.message);
  return data ? toCamel(data) : null;
}

export async function updateUserStats(email) {
  if (!email) return;
  const key = email.toLowerCase();
  // Count bookings and sum savings
  const { data: bookingRows } = await supabase
    .from('bookings')
    .select('total_savings')
    .eq('email', key);

  const count = bookingRows?.length || 0;
  const savings = (bookingRows || []).reduce((sum, b) => sum + (parseFloat(b.total_savings) || 0), 0);

  await supabase
    .from('users')
    .update({ bookings_count: count, total_savings: Math.round(savings * 100) / 100 })
    .eq('email', key);
}

export async function getAllUsers(limit = 50) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('joined_at', { ascending: false })
    .limit(limit);
  if (error) console.error('[DB] getAllUsers:', error.message);
  return (data || []).map(r => { const u = toCamel(r); delete u.passwordHash; return u; });
}

export async function getUserCount() {
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  if (error) console.error('[DB] getUserCount:', error.message);
  return count || 0;
}

// ─── Bookings ───────────────────────────────────────────────

export async function getBooking(id) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') console.error('[DB] getBooking:', error.message);
  return data ? toCamel(data) : null;
}

export async function getBookingsByEmail(email) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('email', email.toLowerCase())
    .order('created_at', { ascending: false });
  if (error) console.error('[DB] getBookingsByEmail:', error.message);
  return (data || []).map(toCamel);
}

export async function getAllBookings() {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) console.error('[DB] getAllBookings:', error.message);
  return (data || []).map(toCamel);
}

// Core booking columns that always exist
const BOOKING_CORE_COLUMNS = [
  'id', 'hotel_name', 'destination', 'checkin_date', 'checkout_date',
  'room_type', 'original_price', 'guest_name', 'confirmation_number',
  'email', 'status', 'created_at', 'updated_at', 'last_checked',
  'best_price', 'best_source', 'total_savings',
  'notes', 'rate_type', 'check_count', 'api_mode',
  'price_history', 'alerts', 'change_history', 'latest_results',
  'source', 'alternatives',
];

// Extra columns added by migrations (may not exist yet)
const BOOKING_EXTRA_COLUMNS = ['potential_savings', 'room_type_custom'];

export async function createBooking(booking) {
  const raw = toSnake(booking);

  // Try with all columns first (includes migration columns)
  const allCols = [...BOOKING_CORE_COLUMNS, ...BOOKING_EXTRA_COLUMNS];
  const row = {};
  for (const col of allCols) {
    if (raw[col] !== undefined) row[col] = raw[col];
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert(row)
    .select()
    .single();

  if (error) {
    // If error is about unknown column, retry with only core columns
    if (error.message?.includes('column') || error.code === '42703') {
      console.warn('[DB] createBooking: retrying with core columns only');
      const coreRow = {};
      for (const col of BOOKING_CORE_COLUMNS) {
        if (raw[col] !== undefined) coreRow[col] = raw[col];
      }
      const { data: d2, error: e2 } = await supabase
        .from('bookings')
        .insert(coreRow)
        .select()
        .single();
      if (e2) { console.error('[DB] createBooking (core):', e2.message, e2.details); return null; }
      return toCamel(d2);
    }
    console.error('[DB] createBooking:', error.message, error.details, error.hint);
    return null;
  }
  return toCamel(data);
}

export async function updateBooking(id, updates) {
  const row = toSnake(updates);
  const { data, error } = await supabase
    .from('bookings')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) console.error('[DB] updateBooking:', error.message);
  return data ? toCamel(data) : null;
}

export async function getBookingCount() {
  const { count, error } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true });
  if (error) console.error('[DB] getBookingCount:', error.message);
  return count || 0;
}

// ─── Stats helpers ──────────────────────────────────────────

export async function getStats(email) {
  let query = supabase.from('bookings').select('total_savings, potential_savings, status');
  if (email) query = query.eq('email', email.toLowerCase());
  const { data, error } = await query;
  if (error) { console.error('[DB] getStats:', error.message); return null; }

  const allBookings = data || [];
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
    totalBookings: total,
    savingsFound: dropsFound,
    confirmedSavings: Math.round(confirmedSavings * 100) / 100,
    potentialSavings: Math.round(potentialSavings * 100) / 100,
    totalSavings: Math.round(confirmedSavings * 100) / 100, // backward compat: total = confirmed only
    avgSavings: dropsFound > 0 ? Math.round(((confirmedSavings + potentialSavings) / dropsFound) * 100) / 100 : 0,
    successRate: total > 0 ? Math.round((dropsFound / total) * 100) : 0,
  };
}

// ─── Fare Alerts ─────────────────────────────────────────────

export async function createFareAlert(alert) {
  const row = toSnake(alert);
  const { data, error } = await supabase
    .from('fare_alerts')
    .insert(row)
    .select()
    .single();
  if (error) console.error('[DB] createFareAlert:', error.message);
  return data ? toCamel(data) : null;
}

export async function getAlertsByBooking(bookingId) {
  const { data, error } = await supabase
    .from('fare_alerts')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false });
  if (error) console.error('[DB] getAlertsByBooking:', error.message);
  return (data || []).map(toCamel);
}

export async function getAlertsByEmail(email) {
  // Join fare_alerts with bookings to filter by user email
  const bookings = await getBookingsByEmail(email);
  const bookingIds = bookings.map(b => b.id);
  if (bookingIds.length === 0) return [];

  const { data, error } = await supabase
    .from('fare_alerts')
    .select('*')
    .in('booking_id', bookingIds)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) console.error('[DB] getAlertsByEmail:', error.message);
  return (data || []).map(toCamel);
}

// ─── Savings Confirmations ───────────────────────────────────

export async function createSavingsConfirmation(confirmation) {
  const row = toSnake(confirmation);
  const { data, error } = await supabase
    .from('savings_confirmations')
    .insert(row)
    .select()
    .single();
  if (error) console.error('[DB] createSavingsConfirmation:', error.message);
  return data ? toCamel(data) : null;
}

export async function getConfirmationByBooking(bookingId) {
  const { data, error } = await supabase
    .from('savings_confirmations')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') console.error('[DB] getConfirmationByBooking:', error.message);
  return data ? toCamel(data) : null;
}

export async function updateUserConfirmedSavings(email) {
  if (!email) return;
  const key = email.toLowerCase();
  const { data } = await supabase
    .from('savings_confirmations')
    .select('confirmed_savings')
    .eq('user_email', key)
    .eq('status', 'confirmed');

  const total = (data || []).reduce((sum, c) => sum + (parseFloat(c.confirmed_savings) || 0), 0);
  await supabase
    .from('users')
    .update({ confirmed_savings: Math.round(total * 100) / 100 })
    .eq('email', key);
}

// ─── Activity Log ────────────────────────────────────────────

export async function logActivity(entityType, entityId, action, actorEmail, details = {}) {
  const { error } = await supabase
    .from('activity_log')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      action,
      actor_email: actorEmail || null,
      details,
    });
  if (error) console.error('[DB] logActivity:', error.message);
}

export async function getActivityLog(entityType, entityId) {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) console.error('[DB] getActivityLog:', error.message);
  return (data || []).map(toCamel);
}

export async function getGlobalActivityLog(limit = 200, filters = {}) {
  let query = supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false });
  if (filters.entityType) query = query.eq('entity_type', filters.entityType);
  if (filters.action) query = query.eq('action', filters.action);
  query = query.limit(limit);
  const { data, error } = await query;
  if (error) console.error('[DB] getGlobalActivityLog:', error.message);
  return (data || []).map(toCamel);
}

export async function deleteBooking(id) {
  // Delete related fare_alerts first
  await supabase.from('fare_alerts').delete().eq('booking_id', id);
  // Delete related savings_confirmations
  await supabase.from('savings_confirmations').delete().eq('booking_id', id);
  // Delete related activity_log
  await supabase.from('activity_log').delete().eq('entity_id', id).eq('entity_type', 'booking');
  // Delete the booking
  const { error } = await supabase.from('bookings').delete().eq('id', id);
  if (error) { console.error('[DB] deleteBooking:', error.message); return false; }
  return true;
}

export async function getAdminBookings({ status, search, sort = 'created_at', order = 'desc', page = 1, limit = 50 } = {}) {
  let query = supabase.from('bookings').select('*', { count: 'exact' });
  if (status && status !== 'all') query = query.eq('status', status);
  if (search) {
    // Security: Sanitize search to prevent PostgREST operator injection
    const safeSearch = search.replace(/[%_\\(),.]/g, '');
    if (safeSearch.length > 0) {
      query = query.or(`hotel_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,destination.ilike.%${safeSearch}%`);
    }
  }
  const validSorts = ['created_at', 'hotel_name', 'original_price', 'total_savings', 'checkin_date', 'status'];
  const sortCol = validSorts.includes(sort) ? sort : 'created_at';
  query = query.order(sortCol, { ascending: order === 'asc' });
  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);
  const { data, count, error } = await query;
  if (error) console.error('[DB] getAdminBookings:', error.message);
  return { bookings: (data || []).map(toCamel), total: count || 0, page, limit };
}

// ─── Special Fare Cases ─────────────────────────────────────

export async function createSpecialFare(fareCase) {
  const row = toSnake(fareCase);
  const { data, error } = await supabase
    .from('special_fare_cases')
    .insert(row)
    .select()
    .single();
  if (error) { console.error('[DB] createSpecialFare:', error.message); return null; }
  return toCamel(data);
}

export async function getSpecialFare(id) {
  const { data, error } = await supabase
    .from('special_fare_cases')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') console.error('[DB] getSpecialFare:', error.message);
  return data ? toCamel(data) : null;
}

export async function getAllSpecialFares(filters = {}) {
  let query = supabase.from('special_fare_cases').select('*').order('created_at', { ascending: false });
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.assignedAgent) query = query.eq('assigned_agent', filters.assignedAgent);
  const { data, error } = await query.limit(200);
  if (error) console.error('[DB] getAllSpecialFares:', error.message);
  return (data || []).map(toCamel);
}

export async function updateSpecialFare(id, updates) {
  const row = toSnake({ ...updates, updatedAt: new Date().toISOString() });
  const { data, error } = await supabase
    .from('special_fare_cases')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) console.error('[DB] updateSpecialFare:', error.message);
  return data ? toCamel(data) : null;
}

// ─── Document Uploads ────────────────────────────────────────

export async function createDocumentUpload(doc) {
  const row = toSnake(doc);
  const { data, error } = await supabase
    .from('document_uploads')
    .insert(row)
    .select()
    .single();
  if (error) { console.error('[DB] createDocumentUpload:', error.message); return null; }
  return toCamel(data);
}

export async function getDocumentUpload(id) {
  const { data, error } = await supabase
    .from('document_uploads')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') console.error('[DB] getDocumentUpload:', error.message);
  return data ? toCamel(data) : null;
}

export async function updateDocumentUpload(id, updates) {
  const row = toSnake(updates);
  const { data, error } = await supabase
    .from('document_uploads')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) console.error('[DB] updateDocumentUpload:', error.message);
  return data ? toCamel(data) : null;
}

// ─── Run Migrations ──────────────────────────────────────────

export async function runMigration(sql) {
  const { error } = await supabase.rpc('exec_sql', { sql_text: sql });
  if (error) {
    // Fallback: try individual statements
    console.error('[DB] Migration via RPC failed:', error.message);
    return false;
  }
  return true;
}

// ─── Sessions ─────────────────────────────────────────────

export async function createSession(email, token) {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ user_email: email.toLowerCase(), token })
    .select()
    .single();
  if (error) console.error('[DB] createSession:', error.message);
  return data;
}

export async function getSessionByToken(token) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();
  if (error && error.code !== 'PGRST116') console.error('[DB] getSession:', error.message);
  return data;
}

export async function deleteSession(token) {
  await supabase.from('sessions').delete().eq('token', token);
}

export async function deleteUserSessions(email) {
  await supabase.from('sessions').delete().eq('user_email', email.toLowerCase());
}

// ─── Password Resets ──────────────────────────────────────

export async function createPasswordReset(email, token) {
  await supabase
    .from('password_resets')
    .update({ used: true })
    .eq('user_email', email.toLowerCase())
    .eq('used', false);

  const { data, error } = await supabase
    .from('password_resets')
    .insert({ user_email: email.toLowerCase(), token })
    .select()
    .single();
  if (error) console.error('[DB] createPasswordReset:', error.message);
  return data;
}

export async function getPasswordReset(token) {
  const { data, error } = await supabase
    .from('password_resets')
    .select('*')
    .eq('token', token)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .single();
  if (error && error.code !== 'PGRST116') console.error('[DB] getPasswordReset:', error.message);
  return data;
}

export async function markPasswordResetUsed(token) {
  await supabase
    .from('password_resets')
    .update({ used: true })
    .eq('token', token);
}

export { supabase };
