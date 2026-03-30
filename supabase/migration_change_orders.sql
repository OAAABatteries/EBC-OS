-- ═════════════════════════════════════════════════════════════
--  Migration: Upgrade change_orders for complete CO generator
--  Date: 2026-03-27
--  Purpose: Add type, scope items, reference, notes, GC fields
-- ═════════════════════════════════════════════════════════════

-- CO type: add | deduct | no_cost
ALTER TABLE change_orders
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'add';

-- Bullet-point scope items (future-proofed shape: { description, amount })
-- Today: amount is always null (lump sum model)
-- Future: supports itemized COs without schema migration
-- Example: [{ "description": "Wall Demo", "amount": null }]
ALTER TABLE change_orders
  ADD COLUMN IF NOT EXISTS scope_items JSONB DEFAULT '[]';

-- Bulletin / RFI reference (e.g. "Bulletin #01")
ALTER TABLE change_orders
  ADD COLUMN IF NOT EXISTS reference TEXT DEFAULT '';

-- Additional notes
ALTER TABLE change_orders
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- GC contact for approval
ALTER TABLE change_orders
  ADD COLUMN IF NOT EXISTS gc_name TEXT DEFAULT '';

-- GC company name
ALTER TABLE change_orders
  ADD COLUMN IF NOT EXISTS gc_company TEXT DEFAULT '';
