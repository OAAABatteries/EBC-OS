-- ═════════════════════════════════════════════════════════════
--  MIGRATION: Drawing Revision Labels & Field Mobilization
--  Adds revision_label (human-readable) to project_drawings
--  so foremen can verify they're looking at current plans.
-- ═════════════════════════════════════════════════════════════

-- Add human-readable revision label (e.g., "IFC Rev 3", "ASI-7", "Bid Set")
ALTER TABLE project_drawings
  ADD COLUMN IF NOT EXISTS revision_label TEXT DEFAULT '';

-- Add discipline tag for grouping (architectural, structural, MEP, etc.)
ALTER TABLE project_drawings
  ADD COLUMN IF NOT EXISTS discipline TEXT DEFAULT 'general';

-- Track who uploaded and when it was last verified as current
ALTER TABLE project_drawings
  ADD COLUMN IF NOT EXISTS uploaded_by_name TEXT DEFAULT '';

-- Ensure updated_at auto-bumps on any row change
CREATE OR REPLACE FUNCTION update_drawing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_drawing_updated_at ON project_drawings;
CREATE TRIGGER trg_drawing_updated_at
  BEFORE UPDATE ON project_drawings
  FOR EACH ROW EXECUTE FUNCTION update_drawing_updated_at();

-- When a new revision is inserted for the same file_name + project,
-- automatically mark older revisions as not current
CREATE OR REPLACE FUNCTION auto_supersede_drawings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = TRUE THEN
    UPDATE project_drawings
    SET is_current = FALSE, updated_at = NOW()
    WHERE project_id = NEW.project_id
      AND file_name = NEW.file_name
      AND id != NEW.id
      AND is_current = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_supersede_drawings ON project_drawings;
CREATE TRIGGER trg_auto_supersede_drawings
  AFTER INSERT ON project_drawings
  FOR EACH ROW EXECUTE FUNCTION auto_supersede_drawings();
