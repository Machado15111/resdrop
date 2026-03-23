-- ═══════════════════════════════════════════════════════════════
-- Migration v3: Savings Confirmation Workflow
-- fare_alerts, savings_confirmations, activity_log tables
-- ═══════════════════════════════════════════════════════════════

-- 1. fare_alerts table (replaces JSONB alerts in bookings)
CREATE TABLE IF NOT EXISTS fare_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('price_drop','price_same','price_increase','price_check','status_change')),
  message TEXT NOT NULL,
  savings NUMERIC(10,2) DEFAULT 0,
  current_price NUMERIC(10,2),
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  read BOOLEAN DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_fare_alerts_booking ON fare_alerts(booking_id);
CREATE INDEX IF NOT EXISTS idx_fare_alerts_created ON fare_alerts(created_at DESC);
ALTER TABLE fare_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Server full access fare_alerts" ON fare_alerts;
CREATE POLICY "Server full access fare_alerts" ON fare_alerts FOR ALL USING (true);

-- 2. savings_confirmations table
CREATE TABLE IF NOT EXISTS savings_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL REFERENCES users(email),
  confirmation_type TEXT NOT NULL CHECK (confirmation_type IN ('rebooked','hotel_matched','agent_handled','not_completed')),
  potential_savings NUMERIC(10,2) NOT NULL,
  confirmed_savings NUMERIC(10,2) DEFAULT 0,
  final_paid_amount NUMERIC(10,2),
  external_confirmation_number TEXT,
  notes TEXT,
  proof_file_url TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed','pending_review','rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_savings_conf_booking ON savings_confirmations(booking_id);
CREATE INDEX IF NOT EXISTS idx_savings_conf_email ON savings_confirmations(user_email);
ALTER TABLE savings_confirmations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Server full access savings_confirmations" ON savings_confirmations;
CREATE POLICY "Server full access savings_confirmations" ON savings_confirmations FOR ALL USING (true);

-- 3. activity_log table (audit trail)
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_email TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Server full access activity_log" ON activity_log;
CREATE POLICY "Server full access activity_log" ON activity_log FOR ALL USING (true);

-- 4. Add potential_savings and room_type_custom to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS potential_savings NUMERIC(10,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS room_type_custom TEXT;

-- 5. Add confirmed_savings to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS confirmed_savings NUMERIC(10,2) DEFAULT 0;

-- 6. Expand booking status constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
-- (If no constraint exists, this is a no-op. Status is stored as TEXT.)

-- 7. Migrate existing JSONB alerts into fare_alerts table
-- Only run once - check if fare_alerts is empty first
INSERT INTO fare_alerts (booking_id, type, message, savings, created_at)
SELECT
  b.id,
  COALESCE((a->>'type')::TEXT, 'price_check'),
  COALESCE((a->>'message')::TEXT, 'Alert'),
  COALESCE((a->>'savings')::NUMERIC, 0),
  COALESCE((a->>'date')::TIMESTAMPTZ, b.created_at)
FROM bookings b, jsonb_array_elements(b.alerts) a
WHERE b.alerts IS NOT NULL
  AND jsonb_array_length(b.alerts) > 0
  AND NOT EXISTS (SELECT 1 FROM fare_alerts LIMIT 1);
