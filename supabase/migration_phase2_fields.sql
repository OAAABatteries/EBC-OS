-- ═══════════════════════════════════════════════════════════════
--  EBC-OS · Phase 2 Migration — Add columns for Phase 2A/2B/2C
--  Run this in: Supabase Dashboard → SQL Editor → New Query
--
--  SAFE: All columns are nullable with defaults. Existing data untouched.
-- ═══════════════════════════════════════════════════════════════

-- ═════════════════════════════════════════════════════════════
--  MATERIAL REQUESTS — Phase 2A fields
-- ═════════════════════════════════════════════════════════════
ALTER TABLE material_requests ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'normal';
ALTER TABLE material_requests ADD COLUMN IF NOT EXISTS needed_by TEXT;
ALTER TABLE material_requests ADD COLUMN IF NOT EXISTS fulfillment_type TEXT;          -- 'supplier' | 'in_house_driver'
ALTER TABLE material_requests ADD COLUMN IF NOT EXISTS decision_notes TEXT;
ALTER TABLE material_requests ADD COLUMN IF NOT EXISTS rejected_reason TEXT;
ALTER TABLE material_requests ADD COLUMN IF NOT EXISTS confirmed_by TEXT;
ALTER TABLE material_requests ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE material_requests ADD COLUMN IF NOT EXISTS audit_trail JSONB DEFAULT '[]';
-- Note: approved_by, approved_at, delivered_at already exist in schema

-- ═════════════════════════════════════════════════════════════
--  PROJECTS — Phase 2B fields (construction stages)
-- ═════════════════════════════════════════════════════════════
ALTER TABLE projects ADD COLUMN IF NOT EXISTS construction_stage TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS stage_owner TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS stage_started TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS stage_updated_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS stage_updated_by TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS stage_history JSONB DEFAULT '[]';
-- Also add fields used by the app but missing from original schema:
ALTER TABLE projects ADD COLUMN IF NOT EXISTS labor_cost NUMERIC(14,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS material_cost NUMERIC(14,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS assigned_foreman TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS suite TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS parking TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in-progress';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS close_out TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_accessed TIMESTAMPTZ;

-- ═════════════════════════════════════════════════════════════
--  TIME ENTRIES — Phase 2C fields (photo verification)
-- ═════════════════════════════════════════════════════════════
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS capture_status TEXT;               -- 'ok' | 'skipped' | 'camera_failed' | null
-- Also add fields used by the app but missing from original schema:
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- ═════════════════════════════════════════════════════════════
--  DAILY REPORTS — Phase 2A' fields (PM review)
-- ═════════════════════════════════════════════════════════════
-- Check if daily_reports table exists first (it may be in a different migration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_reports') THEN
    EXECUTE 'ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS reviewed_by TEXT';
    EXECUTE 'ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ';
    EXECUTE 'ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT false';
  END IF;
END;
$$;

-- ═════════════════════════════════════════════════════════════
--  STORAGE BUCKET — Phase 2C (clock-in photos)
-- ═════════════════════════════════════════════════════════════
-- NOTE: Storage buckets must be created via Supabase Dashboard:
--   Storage → New Bucket → "clock-in-photos" → Public: ON
-- SQL cannot create storage buckets directly.

-- ═════════════════════════════════════════════════════════════
--  DONE! Phase 2 columns added. Verify with:
--  SELECT column_name FROM information_schema.columns
--  WHERE table_name = 'material_requests' ORDER BY ordinal_position;
-- ═════════════════════════════════════════════════════════════
