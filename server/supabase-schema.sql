-- ResDrop Supabase Schema
-- Run this in Supabase SQL Editor

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT DEFAULT 'Guest',
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'viajante', 'premium')),
  bookings_count INT DEFAULT 0,
  total_savings NUMERIC(10,2) DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_active TIMESTAMPTZ DEFAULT now(),
  active BOOLEAN DEFAULT true
);

-- Bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_name TEXT NOT NULL,
  destination TEXT DEFAULT '',
  checkin_date DATE NOT NULL,
  checkout_date DATE NOT NULL,
  room_type TEXT DEFAULT 'Standard Room',
  original_price NUMERIC(10,2) NOT NULL,
  guest_name TEXT DEFAULT 'Guest',
  confirmation_number TEXT,
  email TEXT REFERENCES users(email),
  status TEXT DEFAULT 'monitoring',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ,
  last_checked TIMESTAMPTZ,
  best_price NUMERIC(10,2),
  best_source TEXT,
  total_savings NUMERIC(10,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  rate_type TEXT DEFAULT 'total',
  source TEXT,
  check_count INT DEFAULT 0,
  api_mode TEXT,
  -- Nested arrays stored as JSONB (simple, matches current structure)
  price_history JSONB DEFAULT '[]'::jsonb,
  alerts JSONB DEFAULT '[]'::jsonb,
  change_history JSONB DEFAULT '[]'::jsonb,
  latest_results JSONB DEFAULT '[]'::jsonb,
  alternatives JSONB DEFAULT '[]'::jsonb
);

-- Indexes for common queries
CREATE INDEX idx_bookings_email ON bookings(email);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created ON bookings(created_at DESC);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_plan ON users(plan);

-- Row Level Security (optional but recommended for production)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- For now, allow full access from server (service_role key)
-- You'll tighten this when you add real auth
CREATE POLICY "Server full access users" ON users FOR ALL USING (true);
CREATE POLICY "Server full access bookings" ON bookings FOR ALL USING (true);
