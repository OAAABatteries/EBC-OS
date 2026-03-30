-- ═══════════════════════════════════════════════════════════════
--  EBC-OS · FIELD MOBILIZATION MIGRATION
--  Date: 2026-03-27
--  Purpose: Enable field operations for Monday pilot (Woodside Lab)
--
--  What this does:
--    1. Creates project_drawings table (plans for foremen)
--    2. Creates push_subscriptions table (notifications)
--    3. Creates auto-supersede trigger (revision safety)
--    4. Creates storage buckets (ebc-files + clock-in-photos)
--    5. Enables RLS + realtime on new tables
--
--  SAFE: All statements use IF NOT EXISTS / ON CONFLICT DO NOTHING
--  Can be re-run without damage.
-- ═══════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════
--  1. PROJECT DRAWINGS (Plans for field crews)
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS project_drawings (
  id               TEXT PRIMARY KEY DEFAULT '',
  project_id       TEXT,
  bid_id           TEXT,
  storage_path     TEXT NOT NULL DEFAULT '',
  file_name        TEXT NOT NULL DEFAULT '',
  file_size        BIGINT DEFAULT 0,
  num_pages        INTEGER DEFAULT 0,
  revision         INTEGER DEFAULT 1,
  is_current       BOOLEAN DEFAULT TRUE,
  uploaded_by      TEXT,
  mime_type        TEXT DEFAULT 'application/pdf',
  notes            TEXT DEFAULT '',
  revision_label   TEXT DEFAULT '',
  discipline       TEXT DEFAULT 'general',
  uploaded_by_name TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_drawings_project ON project_drawings(project_id);
CREATE INDEX IF NOT EXISTS idx_project_drawings_bid ON project_drawings(bid_id);

-- RLS
ALTER TABLE project_drawings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_full_access_drawings" ON project_drawings;
CREATE POLICY "auth_full_access_drawings" ON project_drawings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_read_drawings" ON project_drawings;
CREATE POLICY "anon_read_drawings" ON project_drawings
  FOR SELECT TO anon USING (true);

-- Anon write (single-company app, foremen may not have auth accounts yet)
DROP POLICY IF EXISTS "anon_write_drawings" ON project_drawings;
CREATE POLICY "anon_write_drawings" ON project_drawings
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE project_drawings;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;


-- ═════════════════════════════════════════════════════════════
--  2. DRAWING REVISION TRIGGERS (Field Safety - P0)
-- ═════════════════════════════════════════════════════════════

-- Auto-bump updated_at on any row change
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

-- When a new revision is uploaded for the same file_name + project,
-- automatically mark older revisions as superseded (is_current = FALSE)
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


-- ═════════════════════════════════════════════════════════════
--  3. PUSH SUBSCRIPTIONS (Web Push Notifications)
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          TEXT PRIMARY KEY DEFAULT '',
  user_id     TEXT NOT NULL,
  endpoint    TEXT NOT NULL,
  keys_p256dh TEXT NOT NULL,
  keys_auth   TEXT NOT NULL,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_endpoint ON push_subscriptions(endpoint);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon full access to push_subscriptions" ON push_subscriptions;
CREATE POLICY "Allow anon full access to push_subscriptions"
  ON push_subscriptions FOR ALL USING (true) WITH CHECK (true);


-- ═════════════════════════════════════════════════════════════
--  4. STORAGE BUCKETS
-- ═════════════════════════════════════════════════════════════

-- Main file storage bucket (drawings, PDFs, attachments)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ebc-files', 'ebc-files', TRUE, 104857600,
  ARRAY[
    'image/png','image/jpeg','image/gif','image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv','text/plain'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Clock-in photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clock-in-photos', 'clock-in-photos', TRUE, 10485760,
  ARRAY['image/png','image/jpeg','image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for ebc-files
DO $$
BEGIN
  CREATE POLICY "ebc_files_auth_upload" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ebc-files');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "ebc_files_auth_update" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'ebc-files');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "ebc_files_auth_delete" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'ebc-files');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "ebc_files_public_read" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'ebc-files');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "ebc_files_anon_upload" ON storage.objects
    FOR INSERT TO anon WITH CHECK (bucket_id = 'ebc-files');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "ebc_files_anon_update" ON storage.objects
    FOR UPDATE TO anon USING (bucket_id = 'ebc-files');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Storage policies for clock-in-photos
DO $$
BEGIN
  CREATE POLICY "clock_photos_auth_upload" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'clock-in-photos');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "clock_photos_public_read" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'clock-in-photos');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "clock_photos_anon_upload" ON storage.objects
    FOR INSERT TO anon WITH CHECK (bucket_id = 'clock-in-photos');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "clock_photos_anon_update" ON storage.objects
    FOR UPDATE TO anon USING (bucket_id = 'clock-in-photos');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═════════════════════════════════════════════════════════════
--  5. GRANTS (ensure both authenticated + anon can access)
-- ═════════════════════════════════════════════════════════════
GRANT ALL ON project_drawings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON project_drawings TO anon;
GRANT ALL ON push_subscriptions TO authenticated;
GRANT ALL ON push_subscriptions TO anon;


-- ═════════════════════════════════════════════════════════════
--  VERIFICATION QUERIES (run these after migration)
-- ═════════════════════════════════════════════════════════════
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'project_drawings' ORDER BY ordinal_position;
--
-- SELECT id, name FROM storage.buckets;
--
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'project_drawings'::regclass;


-- ═════════════════════════════════════════════════════════════
--  DONE! Field mobilization schema is ready.
--  Next: Upload test drawing to verify end-to-end flow.
-- ═════════════════════════════════════════════════════════════
