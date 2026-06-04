-- ============================================================
-- PropScore supplemental migrations
-- Run these in the Supabase SQL Editor AFTER the initial schema
-- ============================================================

-- ── Rentcast + MUD columns (may already exist) ────────────────────────────────
ALTER TABLE properties ADD COLUMN IF NOT EXISTS rentcast_estimate numeric;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS rentcast_comps    jsonb;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS mud_rate          numeric;

-- ── Feature 1: Delete policy ──────────────────────────────────────────────────
CREATE POLICY IF NOT EXISTS "Users can delete own properties"
  ON properties FOR DELETE
  USING (auth.uid() = user_id);

-- ── Feature 3 + 6: updated_at and notes ──────────────────────────────────────
ALTER TABLE properties ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS notes       text;

-- Auto-set updated_at on every row modification
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS properties_updated_at ON properties;
CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Policy to allow users to update their own properties (re-analyze + notes)
CREATE POLICY IF NOT EXISTS "Users can update own properties"
  ON properties FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Feature 8: Shared analyses ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shared_analyses (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token       text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  property_id uuid        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

-- Add expires_at to existing rows that predate this migration
ALTER TABLE shared_analyses ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days');

ALTER TABLE shared_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Anyone can read shared analyses"
  ON shared_analyses FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Property owners can create shares"
  ON shared_analyses FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM properties WHERE id = property_id)
  );

-- ── Performance indexes ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_properties_user_id          ON properties(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_analyses_property_id ON shared_analyses(property_id);

-- ── Deal Finder: source tracking ──────────────────────────────────────────────
ALTER TABLE properties ADD COLUMN IF NOT EXISTS source text;

-- Allow properties to be read publicly when they have a share link
-- (token is 32 random hex chars — effectively unguessable)
CREATE POLICY IF NOT EXISTS "Public: properties readable via share link"
  ON properties FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM shared_analyses WHERE property_id = properties.id)
  );

-- ── Saved searches & email alerts ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_searches (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  location    text        NOT NULL,
  status      text        NOT NULL DEFAULT 'for_sale',
  price_max   numeric,
  beds_min    integer,
  baths_min   integer,
  min_score   integer     NOT NULL DEFAULT 60,
  created_at  timestamptz NOT NULL DEFAULT now(),
  last_run_at timestamptz,
  is_active   boolean     NOT NULL DEFAULT true
);

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can manage own saved searches"
  ON saved_searches FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id
  ON saved_searches(user_id);

CREATE INDEX IF NOT EXISTS idx_saved_searches_active
  ON saved_searches(is_active) WHERE is_active = true;

-- Tracks which properties were already emailed to avoid duplicates
CREATE TABLE IF NOT EXISTS alert_results (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_search_id uuid        NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,
  property_id     uuid        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE(saved_search_id, property_id)
);

ALTER TABLE alert_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can read own alert results"
  ON alert_results FOR SELECT
  USING (
    auth.uid() = (
      SELECT user_id FROM saved_searches WHERE id = saved_search_id
    )
  );
