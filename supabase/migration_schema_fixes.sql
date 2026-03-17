-- ═══════════════════════════════════════════════════════════════
--  EBC-OS · Schema Fixes Migration
--  Adds missing columns to bids & projects tables
--  Run in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════

-- ── Bids: add address and bid_date columns ──
ALTER TABLE bids ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE bids ADD COLUMN IF NOT EXISTS bid_date TEXT DEFAULT '';

-- ── Projects: add close_out and notes columns ──
ALTER TABLE projects ADD COLUMN IF NOT EXISTS close_out TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- ═══════════════════════════════════════════════════════════════
--  DONE! Missing columns have been added.
-- ═══════════════════════════════════════════════════════════════
