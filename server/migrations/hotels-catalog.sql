-- Hotel catalog synced from LiteAPI (Nuitée).
-- Holds the real LiteAPI hotel ids used by the rate-monitoring engine.

CREATE TABLE IF NOT EXISTS hotels_catalog (
  liteapi_id    TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  country_code  TEXT,
  city          TEXT,
  stars         NUMERIC,
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  source        TEXT NOT NULL DEFAULT 'liteapi',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hotels_catalog_country ON hotels_catalog (country_code);
CREATE INDEX IF NOT EXISTS idx_hotels_catalog_name    ON hotels_catalog (lower(name));
