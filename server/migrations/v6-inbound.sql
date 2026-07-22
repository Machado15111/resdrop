-- v6-inbound.sql: ResDrop Inbound Email Import Pipeline Migration

-- 1. Extend or create inbound_emails
CREATE TABLE IF NOT EXISTS inbound_emails (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id          TEXT UNIQUE,
  original_message_id TEXT,
  mailbox_uid         INTEGER,
  sender_email        TEXT NOT NULL,
  subject             TEXT,
  content_hash        TEXT UNIQUE,
  received_at         TIMESTAMPTZ DEFAULT now(),
  processed_at        TIMESTAMPTZ,
  status              TEXT DEFAULT 'RECEIVED',
  error_code          TEXT,
  error_message       TEXT,
  retry_count         INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbound_emails_sender ON inbound_emails(sender_email);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_status ON inbound_emails(status);

-- 2. Create email_attachments
CREATE TABLE IF NOT EXISTS email_attachments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inbound_email_id    UUID REFERENCES inbound_emails(id) ON DELETE CASCADE,
  filename            TEXT NOT NULL,
  mime_type           TEXT,
  file_size           INTEGER,
  content_hash        TEXT,
  parser_used         TEXT,
  extraction_status   TEXT DEFAULT 'PROCESSED',
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_attachments_email ON email_attachments(inbound_email_id);
CREATE INDEX IF NOT EXISTS idx_email_attachments_hash ON email_attachments(content_hash);

-- 3. Extend or create booking_imports
CREATE TABLE IF NOT EXISTS booking_imports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email          TEXT REFERENCES users(email) ON DELETE SET NULL,
  inbound_email_id    UUID REFERENCES inbound_emails(id) ON DELETE SET NULL,
  booking_id          UUID REFERENCES bookings(id) ON DELETE SET NULL,
  source              TEXT NOT NULL,
  extracted_data      JSONB DEFAULT '{}',
  normalized_data     JSONB DEFAULT '{}',
  confidence_data     JSONB DEFAULT '{}',
  missing_fields      JSONB DEFAULT '[]',
  conflicts           JSONB DEFAULT '[]',
  status              TEXT DEFAULT 'NEEDS_INFORMATION',
  confirmed_at        TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_imports_user ON booking_imports(user_email);
CREATE INDEX IF NOT EXISTS idx_booking_imports_status ON booking_imports(status);

-- 4. Extend or create hotel_mappings
CREATE TABLE IF NOT EXISTS hotel_mappings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_hotel_key TEXT UNIQUE NOT NULL,
  nuitee_hotel_id     TEXT,
  google_place_id     TEXT,
  source              TEXT NOT NULL DEFAULT 'nuitee',
  match_score         NUMERIC DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
  hotel_data          JSONB DEFAULT '{}',
  image_data          JSONB DEFAULT '[]',
  verified_at         TIMESTAMPTZ,
  approved_by         TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hotel_mappings_key ON hotel_mappings(normalized_hotel_key);
CREATE INDEX IF NOT EXISTS idx_hotel_mappings_status ON hotel_mappings(status);

-- 5. Create provider_usage
CREATE TABLE IF NOT EXISTS provider_usage (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider            TEXT NOT NULL,
  operation           TEXT NOT NULL,
  usage_date          DATE DEFAULT CURRENT_DATE,
  calendar_month      TEXT NOT NULL,
  external_calls      INTEGER DEFAULT 0,
  cache_hits          INTEGER DEFAULT 0,
  estimated_cost      NUMERIC DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unq_provider_op_date UNIQUE (provider, operation, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_provider_usage_month ON provider_usage(provider, calendar_month);
