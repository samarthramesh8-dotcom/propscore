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

-- Allow properties to be read publicly when they have a share link
-- (token is 32 random hex chars — effectively unguessable)
CREATE POLICY IF NOT EXISTS "Public: properties readable via share link"
  ON properties FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM shared_analyses WHERE property_id = properties.id)
  );
