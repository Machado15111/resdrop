import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.log('[Migration] No DATABASE_URL — skipping migration');
  process.exit(0);
}

const sql = postgres(connectionString, { ssl: 'require', connect_timeout: 15 });

try {
  // ─── Users table ──────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      email              TEXT PRIMARY KEY,
      name               TEXT,
      password_hash      TEXT,
      phone              TEXT,
      currency           TEXT DEFAULT 'BRL',
      country            TEXT,
      traveler_type      TEXT,
      preferred_email    TEXT,
      date_of_birth      TEXT,
      preferred_room_type TEXT,
      loyalty_programs   TEXT,
      onboarding_completed BOOLEAN DEFAULT false,
      alerts_enabled     BOOLEAN DEFAULT true,
      total_savings      NUMERIC DEFAULT 0,
      confirmed_savings  NUMERIC DEFAULT 0,
      bookings_count     INTEGER DEFAULT 0,
      joined_at          TIMESTAMPTZ DEFAULT now(),
      last_active        TIMESTAMPTZ DEFAULT now()
    )
  `;
  console.log('✓ users table');

  // Add any new columns that might be missing on existing installs
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'BRL'`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS traveler_type TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_email TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS alerts_enabled BOOLEAN DEFAULT true`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS total_savings NUMERIC DEFAULT 0`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS confirmed_savings NUMERIC DEFAULT 0`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS bookings_count INTEGER DEFAULT 0`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_room_type TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS loyalty_programs TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT now()`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT now()`;
  console.log('✓ users columns');

  // ─── Bookings table ───────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS bookings (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email                 TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      hotel_name            TEXT,
      destination           TEXT,
      checkin_date          TEXT,
      checkout_date         TEXT,
      room_type             TEXT,
      original_price        NUMERIC,
      guest_name            TEXT,
      confirmation_number   TEXT,
      total_savings         NUMERIC DEFAULT 0,
      potential_savings     NUMERIC DEFAULT 0,
      best_price            NUMERIC,
      best_source           TEXT,
      last_checked          TIMESTAMPTZ,
      rate_type             TEXT DEFAULT 'refundable',
      check_count           INTEGER DEFAULT 0,
      api_mode              TEXT DEFAULT 'real',
      status                TEXT DEFAULT 'monitoring',
      price_history         JSONB DEFAULT '[]',
      change_history        JSONB DEFAULT '[]',
      latest_results        JSONB DEFAULT '[]',
      cancellation_policy   TEXT,
      board_basis           TEXT,
      created_at            TIMESTAMPTZ DEFAULT now(),
      updated_at            TIMESTAMPTZ DEFAULT now()
    )
  `;
  console.log('✓ bookings table');
  await sql`CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)`;

  // ─── Sessions table ───────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_email  TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      token       TEXT UNIQUE NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT now(),
      expires_at  TIMESTAMPTZ DEFAULT (now() + interval '30 days')
    )
  `;
  console.log('✓ sessions table');
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_email ON sessions(user_email)`;

  // ─── Password resets table ────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS password_resets (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_email  TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      token       TEXT UNIQUE NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT now(),
      expires_at  TIMESTAMPTZ DEFAULT (now() + interval '1 hour'),
      used        BOOLEAN DEFAULT false
    )
  `;
  console.log('✓ password_resets table');
  await sql`CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token)`;

  // ─── Fare alerts table ────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS fare_alerts (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      current_price   NUMERIC,
      original_price  NUMERIC,
      savings_amount  NUMERIC,
      found_source    TEXT,
      rate_type       TEXT,
      status          TEXT DEFAULT 'pending',
      created_at      TIMESTAMPTZ DEFAULT now()
    )
  `;
  console.log('✓ fare_alerts table');
  await sql`CREATE INDEX IF NOT EXISTS idx_fare_alerts_booking ON fare_alerts(booking_id)`;

  // ─── Savings confirmations table ──────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS savings_confirmations (
      id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id              UUID REFERENCES bookings(id) ON DELETE SET NULL,
      user_email              TEXT REFERENCES users(email) ON DELETE SET NULL,
      status                  TEXT DEFAULT 'pending',
      confirmed_savings       NUMERIC DEFAULT 0,
      final_paid_amount       NUMERIC,
      external_confirmation_number TEXT,
      proof_file_url          TEXT,
      payment_choice          TEXT,
      payment_status          TEXT,
      client_decision         TEXT,
      booking_execution       TEXT,
      notes                   TEXT,
      created_at              TIMESTAMPTZ DEFAULT now(),
      updated_at              TIMESTAMPTZ DEFAULT now()
    )
  `;
  console.log('✓ savings_confirmations table');
  await sql`CREATE INDEX IF NOT EXISTS idx_savings_conf_booking ON savings_confirmations(booking_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_savings_conf_email ON savings_confirmations(user_email)`;

  // ─── Activity log table ───────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS activity_log (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type  TEXT NOT NULL,
      entity_id    TEXT NOT NULL,
      action       TEXT NOT NULL,
      actor_email  TEXT,
      details      JSONB DEFAULT '{}',
      created_at   TIMESTAMPTZ DEFAULT now()
    )
  `;
  console.log('✓ activity_log table');
  await sql`CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_type, entity_id)`;

  // ─── Special fare cases table ─────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS special_fare_cases (
      id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id                 UUID REFERENCES bookings(id) ON DELETE SET NULL,
      client_email               TEXT REFERENCES users(email) ON DELETE SET NULL,
      client_name                TEXT,
      client_phone               TEXT,
      status                     TEXT DEFAULT 'new',
      assigned_agent             TEXT,
      current_price              NUMERIC,
      offered_price              NUMERIC,
      original_price             NUMERIC,
      realized_savings           NUMERIC,
      cancellation_deadline      TIMESTAMPTZ,
      offered_at                 TIMESTAMPTZ,
      accepted_at                TIMESTAMPTZ,
      confirmed_at               TIMESTAMPTZ,
      cancelled_at               TIMESTAMPTZ,
      client_notes               TEXT,
      internal_notes             TEXT,
      final_amount               NUMERIC,
      booking_confirmation_number TEXT,
      voucher_url                TEXT,
      payment_choice             TEXT,
      payment_status             TEXT,
      created_at                 TIMESTAMPTZ DEFAULT now(),
      updated_at                 TIMESTAMPTZ DEFAULT now()
    )
  `;
  console.log('✓ special_fare_cases table');
  await sql`CREATE INDEX IF NOT EXISTS idx_special_fares_status ON special_fare_cases(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_special_fares_agent ON special_fare_cases(assigned_agent)`;

  // ─── Document uploads table ───────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS document_uploads (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id          UUID REFERENCES bookings(id) ON DELETE SET NULL,
      user_email          TEXT REFERENCES users(email) ON DELETE SET NULL,
      file_type           TEXT,
      file_size           INTEGER,
      storage_path        TEXT,
      extracted_data      JSONB DEFAULT '{}',
      confidence_scores   JSONB DEFAULT '{}',
      processing_status   TEXT DEFAULT 'pending',
      raw_source          TEXT,
      parse_method        TEXT,
      missing_fields      JSONB DEFAULT '[]',
      field_confidence    JSONB DEFAULT '{}',
      created_at          TIMESTAMPTZ DEFAULT now(),
      updated_at          TIMESTAMPTZ DEFAULT now()
    )
  `;
  console.log('✓ document_uploads table');

  console.log('\n✓ Migration complete');
} catch (e) {
  console.error('Migration error:', e.message);
  process.exit(1);
} finally {
  await sql.end();
}
