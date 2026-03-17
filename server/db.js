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

export async function createBooking(booking) {
  const row = toSnake(booking);
  const { data, error } = await supabase
    .from('bookings')
    .insert(row)
    .select()
    .single();
  if (error) { console.error('[DB] createBooking:', error.message); return null; }
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
  let query = supabase.from('bookings').select('total_savings, status');
  if (email) query = query.eq('email', email.toLowerCase());
  const { data, error } = await query;
  if (error) { console.error('[DB] getStats:', error.message); return null; }

  const allBookings = data || [];
  const totalSavings = allBookings.reduce((sum, b) => sum + (parseFloat(b.total_savings) || 0), 0);
  const savingsFound = allBookings.filter(b => b.status === 'savings_found').length;
  const total = allBookings.length;

  return {
    totalBookings: total,
    savingsFound,
    totalSavings: Math.round(totalSavings * 100) / 100,
    avgSavings: savingsFound > 0 ? Math.round((totalSavings / savingsFound) * 100) / 100 : 0,
    successRate: total > 0 ? Math.round((savingsFound / total) * 100) : 0,
  };
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
