-- Nuitée / LiteAPI integration — usage tracking, caching, mapping.
-- Calendar-month keys give a logical monthly reset (no fragile reset cron).

-- ── Global Price Index monthly usage (the hard cost cap lives here) ──
CREATE TABLE IF NOT EXISTS nuitee_price_index_usage (
  calendar_month     TEXT PRIMARY KEY,              -- 'YYYY-MM'
  external_calls     INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC NOT NULL DEFAULT 0,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Per-user Price Index monthly views (entitlement quota) ──
CREATE TABLE IF NOT EXISTS nuitee_price_index_user_usage (
  calendar_month TEXT NOT NULL,
  user_email     TEXT NOT NULL,
  views          INTEGER NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (calendar_month, user_email)
);

-- ── Price Index shared cache (cache hits never consume quota) ──
CREATE TABLE IF NOT EXISTS nuitee_price_index_cache (
  cache_key   TEXT PRIMARY KEY,
  hotel_ids   TEXT[],
  response    JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);

-- ── Shared live-rate cache / search dedup (free Rates endpoint) ──
CREATE TABLE IF NOT EXISTS nuitee_rate_cache (
  search_hash TEXT PRIMARY KEY,
  response    JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);

-- ── Reservation → Nuitée hotel mapping (with confidence + review) ──
CREATE TABLE IF NOT EXISTS nuitee_hotel_mapping (
  reservation_id  TEXT PRIMARY KEY,
  nuitee_hotel_id TEXT,
  confidence      NUMERIC,
  mapping_status  TEXT NOT NULL DEFAULT 'pending',  -- pending | auto | review | approved | failed
  mapping_method  TEXT,
  reviewed        BOOLEAN NOT NULL DEFAULT false,
  mapped_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Global rate-search counter (fair-use visibility) ──
CREATE TABLE IF NOT EXISTS nuitee_rate_search_usage (
  calendar_month TEXT PRIMARY KEY,
  rate_searches  INTEGER NOT NULL DEFAULT 0,
  cache_hits     INTEGER NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Admin runtime settings (single row) — admin may tighten, never loosen ──
CREATE TABLE IF NOT EXISTS nuitee_settings (
  id                  INTEGER PRIMARY KEY DEFAULT 1,
  monitoring_enabled  BOOLEAN NOT NULL DEFAULT true,
  price_index_enabled BOOLEAN NOT NULL DEFAULT true,   -- ANDed with the env gate
  price_index_cap     INTEGER,                          -- NULL = use env cap; may only lower it
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nuitee_settings_singleton CHECK (id = 1)
);
INSERT INTO nuitee_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- ATOMIC global cap consumer.
-- Consumes exactly one Price Index slot IFF the month is under p_cap.
-- Returns the new external_calls count, or NULL when the cap is reached.
-- Single-statement upsert with a WHERE guard = race-safe under concurrency.
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION nuitee_pi_try_consume(p_month TEXT, p_cap INTEGER, p_cost NUMERIC)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO nuitee_price_index_usage AS u (calendar_month, external_calls, estimated_cost_usd, updated_at)
  VALUES (p_month, 1, p_cost, now())
  ON CONFLICT (calendar_month) DO UPDATE
    SET external_calls = u.external_calls + 1,
        estimated_cost_usd = u.estimated_cost_usd + p_cost,
        updated_at = now()
    WHERE u.external_calls < p_cap
  RETURNING external_calls INTO v_count;
  RETURN v_count; -- NULL when the conflict WHERE guard blocked the update (cap reached)
END;
$$;

-- Per-user atomic increment (returns new view count).
CREATE OR REPLACE FUNCTION nuitee_pi_user_bump(p_month TEXT, p_email TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_views INTEGER;
BEGIN
  INSERT INTO nuitee_price_index_user_usage AS u (calendar_month, user_email, views, updated_at)
  VALUES (p_month, p_email, 1, now())
  ON CONFLICT (calendar_month, user_email) DO UPDATE
    SET views = u.views + 1, updated_at = now()
  RETURNING views INTO v_views;
  RETURN v_views;
END;
$$;
