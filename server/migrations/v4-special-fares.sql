-- ═══════════════════════════════════════════════════════════════
-- Migration v4: Special Fare Cases
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS special_fare_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Client info
  client_email TEXT REFERENCES users(email),
  client_name TEXT,
  client_phone TEXT,
  -- Booking reference
  booking_id UUID REFERENCES bookings(id),
  -- Hotel details
  hotel_name TEXT NOT NULL,
  destination TEXT,
  checkin_date DATE,
  checkout_date DATE,
  room_type TEXT,
  occupancy TEXT,
  board_basis TEXT,
  -- Pricing
  original_price NUMERIC(10,2),
  offered_price NUMERIC(10,2),
  savings_amount NUMERIC(10,2),
  currency TEXT DEFAULT 'BRL',
  -- Rate details
  rate_type TEXT,
  refundable BOOLEAN,
  cancellation_deadline TIMESTAMPTZ,
  -- Source
  original_source TEXT,
  found_source TEXT,
  supplier TEXT,
  -- Payment
  payment_choice TEXT CHECK (payment_choice IN ('prepay_now','pay_at_hotel','ask_agent')),
  payment_status TEXT DEFAULT 'pending',
  -- Workflow
  status TEXT DEFAULT 'new' CHECK (status IN (
    'new','qualifying','offered','awaiting_client','accepted',
    'ready_to_book','booking_in_progress','confirmed','cancelled','expired'
  )),
  client_decision TEXT CHECK (client_decision IN ('draft','offer_sent','viewed','accepted','declined','expired')),
  booking_execution TEXT CHECK (booking_execution IN ('requested','in_progress','booked','failed','supplier_issue','awaiting_payment','awaiting_confirmation')),
  -- Admin
  assigned_agent TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  internal_notes TEXT,
  client_notes TEXT,
  warnings JSONB DEFAULT '[]'::jsonb,
  -- Post-booking
  final_amount NUMERIC(10,2),
  booking_confirmation_number TEXT,
  voucher_url TEXT,
  realized_savings NUMERIC(10,2),
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ,
  offered_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_special_fares_status ON special_fare_cases(status);
CREATE INDEX IF NOT EXISTS idx_special_fares_client ON special_fare_cases(client_email);
CREATE INDEX IF NOT EXISTS idx_special_fares_created ON special_fare_cases(created_at DESC);
ALTER TABLE special_fare_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Server full access special_fare_cases" ON special_fare_cases;
CREATE POLICY "Server full access special_fare_cases" ON special_fare_cases FOR ALL USING (true);
