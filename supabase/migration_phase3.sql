-- ═══════════════════════════════════════════════════════════════
--  EBC-OS · Phase 3 Migration — Missing Tables + Realtime
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════

-- ═════════════════════════════════════════════════════════════
--  TIME ENTRIES (Clock In/Out)
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS time_entries (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  employee_name    TEXT DEFAULT '',
  project_id       UUID REFERENCES projects(id) ON DELETE SET NULL,
  project_name     TEXT DEFAULT '',
  clock_in         TIMESTAMPTZ NOT NULL,
  clock_out        TIMESTAMPTZ,
  clock_in_lat     NUMERIC(10,7),
  clock_in_lng     NUMERIC(10,7),
  clock_out_lat    NUMERIC(10,7),
  clock_out_lng    NUMERIC(10,7),
  geofence_status  TEXT DEFAULT 'inside',
  override_reason  TEXT,
  total_hours      NUMERIC(6,2),
  notes            TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in ON time_entries(clock_in);

-- ═════════════════════════════════════════════════════════════
--  MATERIAL REQUESTS
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS material_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  project_name    TEXT DEFAULT '',
  requested_by    TEXT DEFAULT '',
  requested_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  material        TEXT NOT NULL,
  qty             NUMERIC(10,2) DEFAULT 0,
  unit            TEXT DEFAULT 'EA',
  notes           TEXT DEFAULT '',
  status          TEXT DEFAULT 'pending',
  priority        TEXT DEFAULT 'normal',
  approved_by     TEXT,
  approved_at     TIMESTAMPTZ,
  assigned_driver TEXT,
  delivered_at    TIMESTAMPTZ,
  delivery_photo  TEXT,
  delivery_notes  TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_material_requests_project ON material_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_material_requests_status ON material_requests(status);

-- ═════════════════════════════════════════════════════════════
--  INCIDENTS
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS incidents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
  date        TEXT DEFAULT '',
  type        TEXT DEFAULT '',
  severity    TEXT DEFAULT 'minor',
  description TEXT DEFAULT '',
  reported_by TEXT DEFAULT '',
  status      TEXT DEFAULT 'open',
  corrective  TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════
--  TOOLBOX TALKS
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS toolbox_talks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
  date        TEXT DEFAULT '',
  topic       TEXT DEFAULT '',
  presenter   TEXT DEFAULT '',
  attendees   JSONB DEFAULT '[]',
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════
--  COMPANY LOCATIONS (offices, yards, warehouses)
-- ═════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS company_locations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  address    TEXT DEFAULT '',
  lat        NUMERIC(10,7),
  lng        NUMERIC(10,7),
  radius_ft  NUMERIC(10,2) DEFAULT 500,
  type       TEXT DEFAULT 'office',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════
--  ENABLE RLS + POLICIES on new tables
-- ═════════════════════════════════════════════════════════════
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN VALUES
    ('time_entries'),
    ('material_requests'),
    ('incidents'),
    ('toolbox_talks'),
    ('company_locations')
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    -- Drop existing policies if re-running
    EXECUTE format('DROP POLICY IF EXISTS "auth_full_access" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "anon_read" ON %I', t);
    -- Create policies
    EXECUTE format(
      'CREATE POLICY "auth_full_access" ON %I FOR ALL
       TO authenticated USING (true) WITH CHECK (true)', t
    );
    EXECUTE format(
      'CREATE POLICY "anon_read" ON %I FOR SELECT
       TO anon USING (true)', t
    );
  END LOOP;
END;
$$;

-- ═════════════════════════════════════════════════════════════
--  AUTO-UPDATE updated_at for new tables
-- ═════════════════════════════════════════════════════════════
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
      AND table_name IN ('time_entries','material_requests','incidents','company_locations')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t
    );
  END LOOP;
END;
$$;

-- ═════════════════════════════════════════════════════════════
--  ENABLE REALTIME on new tables
-- ═════════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE time_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE material_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE crew_schedule;
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- ═════════════════════════════════════════════════════════════
--  DONE! Phase 3 tables are ready.
-- ═════════════════════════════════════════════════════════════
