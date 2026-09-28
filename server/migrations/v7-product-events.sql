-- v7-product-events.sql: first-party product event log (funnel instrumentation)
--
-- Backs the event log discussed for steps 4-5 of the analytics diagnosis:
-- signup -> first booking -> first alert -> first click -> savings confirmed.
-- First-party and server-written only (no third-party script, no browser
-- tracking SDK) so it doesn't contradict the privacy promise already
-- published in src/components/AboutPage.jsx, and needs no CSP change.
--
-- Run in the Supabase SQL Editor (project vtsjqchsmlsvjjmdpteh) with
-- "Run and enable RLS" — DATABASE_URL and the Supabase REST DB are different
-- databases in this deployment; only the SQL Editor reaches the one the app
-- actually reads.

CREATE TABLE IF NOT EXISTS product_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name    TEXT NOT NULL,          -- 'signup' | 'booking_created' | 'alert_sent' | 'alert_clicked' | 'savings_confirmed' | ...
  user_email    TEXT REFERENCES users(email) ON DELETE SET NULL,
  anonymous_id  TEXT,                   -- client-generated id, pre-signup traffic; joined to user_email once known
  booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
  properties    JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_events_name ON product_events(event_name);
CREATE INDEX IF NOT EXISTS idx_product_events_user ON product_events(user_email);
CREATE INDEX IF NOT EXISTS idx_product_events_anon ON product_events(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_product_events_created ON product_events(created_at);

-- Server (service role) is the only writer/reader — no anon policy needed,
-- so RLS with zero policies is a hard default-deny for anyone else.
ALTER TABLE product_events ENABLE ROW LEVEL SECURITY;
